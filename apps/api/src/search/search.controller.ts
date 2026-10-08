import { Controller, Get, Query } from "@nestjs/common";
import {
  type AuthUser,
  type SearchQuery,
  searchQuerySchema,
  type SearchResultsPublic,
} from "@fama/shared";
import { OptionalUser } from "../common/decorators/current-user.decorator.js";
import { OptionalAuth } from "../common/decorators/optional-auth.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { SearchService } from "./search.service.js";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // SPEC §2: open to anonymous visitors; a signed-in reader does not see whom they blocked.
  @Get()
  @OptionalAuth()
  search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<SearchResultsPublic> {
    return this.searchService.search(viewer, query);
  }
}
