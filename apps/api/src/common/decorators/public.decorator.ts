import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Route reachable without being signed in (CLAUDE.md §5.3: feed reading, auth routes…). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
