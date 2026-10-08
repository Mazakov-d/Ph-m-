import { Module } from "@nestjs/common";
import { RetentionPurgeJob } from "./retention-purge.job.js";

@Module({ providers: [RetentionPurgeJob] })
export class RetentionModule {}
