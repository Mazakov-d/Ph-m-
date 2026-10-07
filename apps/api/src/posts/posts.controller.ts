import { Body, Controller, HttpStatus, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  type AuthUser,
  type CreatePostInput,
  createPostInputSchema,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_TYPES,
  POST_IMAGES_MAX_COUNT,
  type PostPublic,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ApiException } from "../common/errors/api.exception.js";
import { detectFileType } from "../common/files/file-type.js";
import { JsonFieldValidationPipe } from "../common/pipes/json-field.pipe.js";
import { PostsService, type UploadedImage } from "./posts.service.js";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
