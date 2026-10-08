import { Module } from "@nestjs/common";
import { EditorReliabilityModule } from "../reliability/editor-reliability.module.js";
import { EditorReviewController } from "./editor-review.controller.js";
import { EditorReviewService } from "./editor-review.service.js";
import { EditorsController } from "./editors.controller.js";
import { EditorsService } from "./editors.service.js";

@Module({
  imports: [EditorReliabilityModule],
  controllers: [EditorsController, EditorReviewController],
  providers: [EditorsService, EditorReviewService],
})
export class EditorsModule {}
