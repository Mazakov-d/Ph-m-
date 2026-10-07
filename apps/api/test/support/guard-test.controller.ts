import { Controller, Get, Post } from "@nestjs/common";
import type { AuthUser } from "@fama/shared";
import { CurrentUser } from "../../src/common/decorators/current-user.decorator.js";
import { Public } from "../../src/common/decorators/public.decorator.js";
import { RequirePermission } from "../../src/common/decorators/require-permission.decorator.js";

/** Routes mounted only in tests, to exercise the guards before the real routes exist. */
@Controller("guard-test")
export class GuardTestController {
  @Public()
  @Get("public")
  open(): { ok: true } {
    return { ok: true };
  }

  @Get("private")
  whoAmI(@CurrentUser() user: AuthUser): { pseudo: string } {
    return { pseudo: user.pseudo };
  }

  @RequirePermission("post.create")
  @Post("publish")
  publish(): { ok: true } {
    return { ok: true };
  }
}
