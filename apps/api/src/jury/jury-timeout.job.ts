import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JuryService } from "./jury.service.js";

/** docs/DECISIONS.md (SPEC §5.8): late jurors lose their seat, replaced once. */
@Injectable()
export class JuryTimeoutJob {
  constructor(private readonly jury: JuryService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  run(now: Date = new Date()): Promise<number> {
    return this.jury.expireLateSeats(now);
  }
}
