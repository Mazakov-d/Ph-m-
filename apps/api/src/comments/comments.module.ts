import { Module } from "@nestjs/common";
import { CommentsController } from "./comments.controller.js";
import { CommentsService } from "./comments.service.js";
import { ToxicityChecker } from "./toxicity/toxicity-checker.js";
import { WordListToxicityChecker } from "./toxicity/word-list-toxicity-checker.js";

@Module({
  controllers: [CommentsController],
  providers: [
    CommentsService,
    // SPEC §6.2: the MVP filter (default word list); replace the factory to plug in a service.
    { provide: ToxicityChecker, useFactory: () => new WordListToxicityChecker() },
  ],
})
export class CommentsModule {}
