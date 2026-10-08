import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  type AuthUser,
  type CreateEditorApplicationInput,
  createEditorApplicationInputSchema,
  EDITOR_DOCUMENT_MAX_BYTES,
  EDITOR_DOCUMENT_TYPES,
  EDITOR_DOCUMENTS_MAX_COUNT,
  EDITOR_DOCUMENTS_MIN_COUNT,
  type EditorApplicationPublic,
  type EditorPublic,
  idSchema,
  type UpdateDonationLinkInput,
  type UpdateEditorProfileInput,
  updateDonationLinkInputSchema,
  updateEditorProfileInputSchema,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ApiException } from "../common/errors/api.exception.js";
import { JsonFieldValidationPipe } from "../common/pipes/json-field.pipe.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { detectFileType } from "../common/files/file-type.js";
import { EditorsService, type IdentityDocument } from "./editors.service.js";

@Controller("editors")
export class EditorsController {
  constructor(private readonly editorsService: EditorsService) {}

  /** Multipart: field `application` (JSON) + 1 to 5 files `documents`. */
  @Post("application")
  @RequirePermission("editor.apply")
  @UseInterceptors(
    FilesInterceptor("documents", EDITOR_DOCUMENTS_MAX_COUNT, {
      limits: { fileSize: EDITOR_DOCUMENT_MAX_BYTES },
    }),
  )
  apply(
    @Body("application", new JsonFieldValidationPipe(createEditorApplicationInputSchema))
    input: CreateEditorApplicationInput,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<EditorApplicationPublic> {
    return this.editorsService.apply(user.id, input, toIdentityDocuments(files ?? []));
  }

  @Get("me/application")
  getMyApplication(@CurrentUser() user: AuthUser): Promise<EditorApplicationPublic> {
    return this.editorsService.getMyApplication(user.id);
  }

  @Patch("me")
  updateProfile(
    @Body(new ZodValidationPipe(updateEditorProfileInputSchema)) input: UpdateEditorProfileInput,
    @CurrentUser() user: AuthUser,
  ): Promise<EditorApplicationPublic> {
    return this.editorsService.updateProfile(user.id, input);
  }

  // docs/DECISIONS.md (donations): validated editors only (they publish).
  @Put("me/donation-link")
  @RequirePermission("post.create")
  updateDonationLink(
    @Body(new ZodValidationPipe(updateDonationLinkInputSchema)) input: UpdateDonationLinkInput,
    @CurrentUser() user: AuthUser,
  ): Promise<EditorApplicationPublic> {
    return this.editorsService.updateDonationLink(user.id, input.donationUrl);
  }

  // SPEC §2: readable without an account (discovery through shared links).
  @Public()
  @Get(":id")
  getPublicProfile(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
  ): Promise<EditorPublic> {
    return this.editorsService.getPublicProfile(id);
  }
}

/** Checks the count and the real type of the uploaded documents (docs/DECISIONS.md). */
function toIdentityDocuments(files: Express.Multer.File[]): IdentityDocument[] {
  if (files.length < EDITOR_DOCUMENTS_MIN_COUNT) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      "INVALID_DOCUMENT",
      "At least one identity document is required",
    );
  }
  return files.map((file) => {
    const bytes = new Uint8Array(file.buffer);
    const type = detectFileType(bytes, EDITOR_DOCUMENT_TYPES);
    if (!type) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_DOCUMENT",
        `${file.originalname} is not a PDF, JPEG or PNG file`,
      );
    }
    return { bytes, type };
  });
}
