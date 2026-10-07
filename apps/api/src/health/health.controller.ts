import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator.js";

type HealthResponse = { status: "ok" };

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return { status: "ok" };
  }
}
