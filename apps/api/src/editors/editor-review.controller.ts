import { Body, Controller, Get, Param, Post, Query, StreamableFile } from "@nestjs/common";
import {
  type AuthUser,
  type EditorApplicationQuery,
  editorApplicationQuerySchema,
  type EditorDecisionInput,
  editorDecisionInputSchema,
  type EditorModeration,
  idSchema,
  type Paginated,
} from "@fama/shared";
import { z } from "zod";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { EditorReviewService } from "./editor-review.service.js";

@Controller("moderation/editor-applications")
@RequirePermission("editor.validateIndependent")
export class EditorReviewController {
  constructor(private readonly editorReviewService: EditorReviewService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(editorApplicationQuerySchema)) query: EditorApplicationQuery,
    @CurrentUser() moderator: AuthUser,
  ): Promise<Paginated<EditorModeration>> {
    return this.editorReviewService.list(moderator, query);
  }

  @Post(":userId/decision")
  decide(
    @Param("userId", new ZodValidationPipe(idSchema)) userId: string,
    @Body(new ZodValidationPipe(editorDecisionInputSchema)) decision: EditorDecisionInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<EditorModeration> {
    return this.editorReviewService.decide(moderator, userId, decision);
  }

  /** Streams an identity document; never exposed through a URL of the storage (SPEC §2.2). */
  @Get(":userId/documents/:index")
  async readDocument(
    @Param("userId", new ZodValidationPipe(idSchema)) userId: string,
    @Param("index", new ZodValidationPipe(z.coerce.number().int().nonnegative())) index: number,
    @CurrentUser() moderator: AuthUser,
  ): Promise<StreamableFile> {
    const document = await this.editorReviewService.readDocument(moderator, userId, index);
    return new StreamableFile(document.bytes, {
      type: document.contentType,
      disposition: "inline",
    });
  }
}
