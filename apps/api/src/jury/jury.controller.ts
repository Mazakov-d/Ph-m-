import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import {
  type AuthUser,
  idSchema,
  type JuryAssignmentPublic,
  type JuryVoteInput,
  type JuryVolunteerPublic,
  juryVoteInputSchema,
  type UpdateJuryVolunteerInput,
  updateJuryVolunteerInputSchema,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { JuryService } from "./jury.service.js";

/** SPEC §5.8: the reader's side of the community review. */
@Controller("jury")
export class JuryController {
  constructor(private readonly jury: JuryService) {}

  @Get("volunteer")
  async volunteer(@CurrentUser() user: AuthUser): Promise<JuryVolunteerPublic> {
    return { volunteer: await this.jury.isVolunteer(user) };
  }

  @Put("volunteer")
  @RequirePermission("jury.serve")
  async setVolunteer(
    @Body(new ZodValidationPipe(updateJuryVolunteerInputSchema)) input: UpdateJuryVolunteerInput,
    @CurrentUser() user: AuthUser,
  ): Promise<JuryVolunteerPublic> {
    return { volunteer: await this.jury.setVolunteer(user, input.volunteer) };
  }

  @Get("assignments")
  assignments(@CurrentUser() user: AuthUser): Promise<JuryAssignmentPublic[]> {
    return this.jury.assignmentsOf(user);
  }

  @Post("assignments/:id/vote")
  @RequirePermission("jury.serve")
  @HttpCode(HttpStatus.NO_CONTENT)
  vote(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(juryVoteInputSchema)) input: JuryVoteInput,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.jury.vote(user, id, input);
  }
}
