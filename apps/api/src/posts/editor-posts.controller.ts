import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  type CursorQuery,
  cursorQuerySchema,
  idSchema,
  type Paginated,
  type PostSummaryPublic,
} from "@fama/shared";
import { Public } from "../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { PostsService } from "./posts.service.js";

/** SPEC §2.2: the public profile of an editor lists their publications. */
@Controller("editors/:editorId/posts")
export class EditorPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Public()
  list(
    @Param("editorId", new ZodValidationPipe(idSchema)) editorId: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<Paginated<PostSummaryPublic>> {
    return this.postsService.listByEditor(editorId, query);
  }
}
