import { Module } from "@nestjs/common";
import { EditorReliabilityService } from "./editor-reliability.service.js";

/** SPEC §5.7: shared by the post page and the editor profile. */
@Module({
  providers: [EditorReliabilityService],
  exports: [EditorReliabilityService],
})
export class EditorReliabilityModule {}
