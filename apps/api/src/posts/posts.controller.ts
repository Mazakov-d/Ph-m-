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
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  type AuthUser,
  type CreatePostInput,
  createPostInputSchema,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_TYPES,
  POST_IMAGES_MAX_COUNT,
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
import { PostsService, type UploadedImage } from "./posts.service.js";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
  @UseInterceptors(
    FilesInterceptor("images", POST_IMAGES_MAX_COUNT, {
      limits: { fileSize: POST_IMAGE_MAX_BYTES },
    }),
  )
  create(
    @Body("post", new JsonFieldValidationPipe(createPostInputSchema)) input: CreatePostInput,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() author: AuthUser,
  ): Promise<PostPublic> {
    return this.postsService.create(author, input, toUploadedImages(files ?? []));
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

function toUploadedImages(files: Express.Multer.File[]): UploadedImage[] {
  return files.map((file) => {
    const bytes = new Uint8Array(file.buffer);
    const type = detectFileType(bytes, POST_IMAGE_TYPES);
    if (!type) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_IMAGE",
        `${file.originalname} is not a JPEG, PNG or WebP image`,
      );
    }
    return { bytes, type };
  });
}
