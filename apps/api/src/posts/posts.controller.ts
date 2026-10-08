import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { diskStorage } from "multer";
import {
  type AuthUser,
  type CreatePostInput,
  createPostInputSchema,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_TYPES,
  POST_IMAGES_MAX_COUNT,
  POST_VIDEO_MAX_BYTES,
  type Paginated,
  type PostPublic,
  type PostQuery,
  type SimilarPostsPublic,
  postQuerySchema,
  type PostSummaryPublic,
  idSchema,
  VIEWER_SESSION_HEADER,
  type UpdatePostCommentsInput,
  updatePostCommentsInputSchema,
} from "@fama/shared";
import { CurrentUser, OptionalUser } from "../common/decorators/current-user.decorator.js";
import { OptionalAuth } from "../common/decorators/optional-auth.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { ApiException } from "../common/errors/api.exception.js";
import { detectFileType } from "../common/files/file-type.js";
import { JsonFieldValidationPipe } from "../common/pipes/json-field.pipe.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { PostVideosService } from "./post-videos.service.js";
import { PostsService, type UploadedImage } from "./posts.service.js";

@Controller("posts")
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly videos: PostVideosService,
  ) {}

  // SPEC §2: the feed is readable without an account.
  @Get()
  @OptionalAuth()
  feed(
    @Query(new ZodValidationPipe(postQuerySchema)) query: PostQuery,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<Paginated<PostSummaryPublic>> {
    return this.postsService.feed(viewer, query);
  }

  // SPEC §2 and §4.1: readable without an account, by direct link even after 48 hours.
  @Get(":id")
  @OptionalAuth()
  findOne(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Headers(VIEWER_SESSION_HEADER) sessionHeader: string | undefined,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<PostPublic> {
    // docs/DECISIONS.md: a malformed session id is ignored (the view is just not counted).
    const sessionId = idSchema.safeParse(sessionHeader).data ?? null;
    return this.postsService.findOne(viewer, id, sessionId);
  }

  // SPEC §9: readable without an account, like the post.
  @Get(":id/similar")
  @OptionalAuth()
  similar(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<SimilarPostsPublic> {
    return this.postsService.similar(viewer, id);
  }

  // docs/DECISIONS.md: images are public content; they never change, so browsers may keep them.
  @Get(":id/images/:imageId")
  @Public()
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async readImage(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Param("imageId", new ZodValidationPipe(idSchema)) imageId: string,
  ): Promise<StreamableFile> {
    const image = await this.postsService.readImage(id, imageId);
    return new StreamableFile(image.bytes, { type: image.contentType });
  }

  /** Multipart: field `post` (JSON) + 0 to 4 files `images` (SPEC §3, docs/DECISIONS.md). */
  @Post()
  @RequirePermission("post.create")
  // Files go to a temporary folder (a video can weigh 200 MB) and are removed after the request.
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "images", maxCount: POST_IMAGES_MAX_COUNT },
        { name: "video", maxCount: 1 },
      ],
      {
        storage: diskStorage({ destination: tmpdir() }),
        limits: { fileSize: POST_VIDEO_MAX_BYTES },
      },
    ),
  )
  async create(
    @Body("post", new JsonFieldValidationPipe(createPostInputSchema)) input: CreatePostInput,
    @UploadedFiles() files: UploadedPostFiles | undefined,
    @CurrentUser() author: AuthUser,
  ): Promise<PostPublic> {
    const images = files?.images ?? [];
    const video = files?.video?.[0] ?? null;
    try {
      return await this.postsService.create(
        author,
        input,
        await toUploadedImages(images),
        video ? await checkedVideoPath(video) : null,
      );
    } finally {
      await Promise.all(
        [...images, ...(video ? [video] : [])].map((file) => rm(file.path, { force: true })),
      );
    }
  }

  // docs/DECISIONS.md (videos): public content, read in parts (Range) as video players do.
  @Get(":id/video")
  @Public()
  async readVideo(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Headers("range") range: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const video = await this.videos.readVideo(id, range);
    response.status(video.contentRange ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK);
    response.setHeader("Accept-Ranges", "bytes");
    if (video.contentRange) response.setHeader("Content-Range", video.contentRange);
    return new StreamableFile(video.body, {
      type: video.contentType,
      length: video.contentLength,
    });
  }

  @Get(":id/video/poster")
  @Public()
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async readVideoPoster(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
  ): Promise<StreamableFile> {
    const poster = await this.videos.readPoster(id);
    return new StreamableFile(poster.bytes, { type: poster.contentType });
  }

  @Patch(":id/comments")
  @RequirePermission("post.toggleComments")
  updateComments(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(updatePostCommentsInputSchema)) input: UpdatePostCommentsInput,
    @CurrentUser() editor: AuthUser,
  ): Promise<PostPublic> {
    return this.postsService.updateComments(editor, id, input);
  }
}

type UploadedPostFiles = { images?: Express.Multer.File[]; video?: Express.Multer.File[] };

// MP4 and MOV files have the "ftyp" box at byte 4 (ISO base media format).
const ISO_MEDIA_SIGNATURE = "ftyp";
const ISO_MEDIA_SIGNATURE_OFFSET = 4;

/**
 * docs/DECISIONS.md (videos): the declared type of an upload cannot be trusted; an MP4 or MOV
 * file starts with its "ftyp" box (ffmpeg then checks it is a readable video).
 */
async function checkedVideoPath(file: Express.Multer.File): Promise<string> {
  const header = (await readFile(file.path)).subarray(
    ISO_MEDIA_SIGNATURE_OFFSET,
    ISO_MEDIA_SIGNATURE_OFFSET + ISO_MEDIA_SIGNATURE.length,
  );
  if (header.toString("latin1") !== ISO_MEDIA_SIGNATURE) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      "INVALID_VIDEO",
      `${file.originalname} is not an MP4 or MOV video`,
    );
  }
  return file.path;
}

async function toUploadedImages(files: Express.Multer.File[]): Promise<UploadedImage[]> {
  return Promise.all(
    files.map(async (file) => {
      // The upload accepts files as large as a video: images keep their own limit (SPEC §11).
      if (file.size > POST_IMAGE_MAX_BYTES) {
        throw new ApiException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          "FILE_TOO_LARGE",
          `${file.originalname} is too large`,
        );
      }
      const bytes = new Uint8Array(await readFile(file.path));
      const type = detectFileType(bytes, POST_IMAGE_TYPES);
      if (!type) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "INVALID_IMAGE",
          `${file.originalname} is not a JPEG, PNG or WebP image`,
        );
      }
      return { bytes, type };
    }),
  );
}
