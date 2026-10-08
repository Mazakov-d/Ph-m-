import { Body, Controller, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import {
  type AuthUser,
  type CastVoteInput,
  castVoteInputSchema,
  idSchema,
  type VoteSummaryPublic,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { VotesService } from "./votes.service.js";

@Controller("posts/:postId/vote")
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  /** SPEC §7: vote, or change one's vote. */
  @Put()
  @RequirePermission("vote.cast")
  cast(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @Body(new ZodValidationPipe(castVoteInputSchema)) input: CastVoteInput,
    @CurrentUser() voter: AuthUser,
  ): Promise<VoteSummaryPublic> {
    return this.votesService.cast(voter, postId, input.optionId);
  }

  /** SPEC §7: « Voir sans voter ». Reading only: allowed to a suspended account too. */
  @Post("reveal")
  @HttpCode(HttpStatus.OK)
  reveal(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @CurrentUser() viewer: AuthUser,
  ): Promise<VoteSummaryPublic> {
    return this.votesService.reveal(viewer, postId);
  }
}
