import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import {
  type AlertPublic,
  type AuthUser,
  type CreateAlertInput,
  createAlertInputSchema,
  idSchema,
  type RegisterPushTokenInput,
  registerPushTokenInputSchema,
  type UnregisterPushTokenInput,
  unregisterPushTokenInputSchema,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AlertsService } from "./alerts.service.js";

/** docs/DECISIONS.md (push notifications): every signed-in account manages its own. */
@Controller()
export class NotificationsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post("notifications/push-tokens")
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPushToken(
    @Body(new ZodValidationPipe(registerPushTokenInputSchema)) input: RegisterPushTokenInput,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.alertsService.registerPushToken(user, input);
  }

  @Post("notifications/push-tokens/unregister")
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterPushToken(
    @Body(new ZodValidationPipe(unregisterPushTokenInputSchema)) input: UnregisterPushTokenInput,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.alertsService.unregisterPushToken(user, input.token);
  }

  @Get("alerts")
  list(@CurrentUser() user: AuthUser): Promise<AlertPublic[]> {
    return this.alertsService.list(user);
  }

  @Post("alerts")
  create(
    @Body(new ZodValidationPipe(createAlertInputSchema)) input: CreateAlertInput,
    @CurrentUser() user: AuthUser,
  ): Promise<AlertPublic> {
    return this.alertsService.create(user, input);
  }

  @Delete("alerts/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.alertsService.remove(user, id);
  }
}
