import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  postQuerySchema,
  type PostSummaryPublic,
  idSchema,
  type UpdatePostCommentsInput,
  updatePostCommentsInputSchema,
} from "@fama/shared";
import { CurrentUser, OptionalUser } from "../common/decorators/current-user.decorator.js";
import { OptionalAuth } from "../common/decorators/optional-auth.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
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
