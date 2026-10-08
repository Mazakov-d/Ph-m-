import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CreateAppealInput,
  createAppealInputSchema,
  idSchema,
  type SanctionAppealDecisionInput,
  sanctionAppealDecisionInputSchema,
  type SanctionAppealModeration,
  type SanctionPublic,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { SanctionsService } from "./sanctions.service.js";

@Controller()
export class SanctionsController {
  constructor(private readonly sanctionsService: SanctionsService) {}

  @Get("sanctions/me")
  mine(@CurrentUser() user: AuthUser): Promise<SanctionPublic[]> {
    return this.sanctionsService.mine(user);
  }

  // No permission: a suspended or banned account can appeal its sanction (SPEC §6.3).
  @Post("sanctions/:id/appeal")
  appeal(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(createAppealInputSchema)) input: CreateAppealInput,
    @CurrentUser() user: AuthUser,
  ): Promise<SanctionPublic> {
    return this.sanctionsService.appeal(user, id, input.reason);
  }

  @Get("moderation/sanction-appeals")
  @RequirePermission("moderation.queue.read")
  pendingAppeals(@CurrentUser() moderator: AuthUser): Promise<SanctionAppealModeration[]> {
    return this.sanctionsService.pendingAppeals(moderator);
  }

  @Post("moderation/sanction-appeals/:id/decision")
  @RequirePermission("moderation.decide")
  decideAppeal(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(sanctionAppealDecisionInputSchema))
    input: SanctionAppealDecisionInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<SanctionPublic> {
    return this.sanctionsService.decideAppeal(moderator, id, input.accepted);
  }
}
