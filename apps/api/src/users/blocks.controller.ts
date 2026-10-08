import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import {
  type AuthUser,
  type BlockPublic,
  type DeleteAccountInput,
  deleteAccountInputSchema,
  idSchema,
} from "@fama/shared";
import type { Response } from "express";
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS } from "../auth/auth.controller.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AccountService } from "./account.service.js";
import { BlocksService } from "./blocks.service.js";

@Controller("users")
export class BlocksController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly accountService: AccountService,
  ) {}

  /** SPEC §10: no permission required — a suspended or banned account can delete itself. */
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @Body(new ZodValidationPipe(deleteAccountInputSchema)) input: DeleteAccountInput,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.accountService.delete(user, input.password);
    response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  }

  @Get("me/blocks")
  list(@CurrentUser() user: AuthUser): Promise<BlockPublic[]> {
    return this.blocksService.list(user);
  }

  @Post(":id/block")
  @RequirePermission("user.block")
  block(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BlockPublic> {
    return this.blocksService.block(user, id);
  }

  @Delete(":id/block")
  @HttpCode(HttpStatus.NO_CONTENT)
  unblock(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.blocksService.unblock(user, id);
  }
}
