import { Module } from "@nestjs/common";
import { EditorReviewController } from "./editor-review.controller.js";
import { EditorReviewService } from "./editor-review.service.js";
import { EditorsController } from "./editors.controller.js";
import { EditorsService } from "./editors.service.js";

@Module({
  controllers: [EditorsController, EditorReviewController],
  providers: [EditorsService, EditorReviewService],
})
export class EditorsModule {}
