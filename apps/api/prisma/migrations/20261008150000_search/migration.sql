-- SPEC §4.4 + docs/DECISIONS.md: full-text search (french) and typo tolerance (pg_trgm),
-- insensitive to accents. These expression indexes are not described in schema.prisma:
-- review any generated migration so that it never drops them.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is not IMMUTABLE, which indexes require: this wrapper fixes its dictionary.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Weighted document: title (A) > summary (B) > body (C).
CREATE INDEX "Post_search_idx" ON "Post" USING GIN ((
  setweight(to_tsvector('french', f_unaccent("title")), 'A') ||
  setweight(to_tsvector('french', f_unaccent("summary")), 'B') ||
  setweight(to_tsvector('french', f_unaccent("body")), 'C')
));

CREATE INDEX "Post_title_trgm_idx" ON "Post" USING GIN ((f_unaccent(lower("title"))) gin_trgm_ops);
CREATE INDEX "User_pseudo_trgm_idx" ON "User" USING GIN ((f_unaccent(lower("pseudo"))) gin_trgm_ops);
