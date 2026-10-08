import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CreateModeratorInput,
  createModeratorInputSchema,
  type ModeratorModeration,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AuthService } from "./auth.service.js";

/** docs/DECISIONS.md (moderators): the ADMIN adds moderator accounts (« + Modérateur »). */
@Controller("admin/moderators")
export class ModeratorsController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @RequirePermission("moderator.manage")
  list(): Promise<ModeratorModeration[]> {
    return this.auth.moderators();
  }

  @Post()
  @RequirePermission("moderator.manage")
  create(
    @Body(new ZodValidationPipe(createModeratorInputSchema)) input: CreateModeratorInput,
    @CurrentUser() admin: AuthUser,
  ): Promise<ModeratorModeration> {
    return this.auth.createModerator(admin, input);
  }
}
