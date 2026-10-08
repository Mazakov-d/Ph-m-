import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { type AuthUser, type BlockPublic, idSchema } from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { BlocksService } from "./blocks.service.js";

@Controller("users")
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

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
