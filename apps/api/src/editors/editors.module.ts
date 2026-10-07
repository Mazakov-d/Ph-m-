import { Module } from "@nestjs/common";
import { EditorsController } from "./editors.controller.js";
import { EditorsService } from "./editors.service.js";

@Module({
  controllers: [EditorsController],
  providers: [EditorsService],
})
export class EditorsModule {}
