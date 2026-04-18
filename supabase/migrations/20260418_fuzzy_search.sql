-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text + accent-insensitive + fuzzy song search
-- Uses unaccent to strip accents from both stored titles and the query,
-- then falls back to trigram similarity for typo tolerance.
CREATE OR REPLACE FUNCTION search_songs(
  q        text,
  lim      int  DEFAULT 20,
  offs     int  DEFAULT 0
)
RETURNS TABLE(
  id          text,
  title       text,
  slug        text,
  "createdAt" timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id, title, slug, "createdAt"
  FROM   "Song"
  WHERE  unaccent(lower(title)) ILIKE '%' || unaccent(lower(q)) || '%'
     OR  similarity(unaccent(lower(title)), unaccent(lower(q))) > 0.25
  ORDER BY
    -- Exact substring matches first
    CASE WHEN unaccent(lower(title)) ILIKE '%' || unaccent(lower(q)) || '%' THEN 0 ELSE 1 END,
    -- Then by trigram similarity (highest first)
    similarity(unaccent(lower(title)), unaccent(lower(q))) DESC,
    "createdAt" DESC
  LIMIT  lim
  OFFSET offs;
$$;

-- Count helper (for pagination)
CREATE OR REPLACE FUNCTION count_search_songs(q text)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)
  FROM   "Song"
  WHERE  unaccent(lower(title)) ILIKE '%' || unaccent(lower(q)) || '%'
     OR  similarity(unaccent(lower(title)), unaccent(lower(q))) > 0.25;
$$;

-- GiST trigram index for fast similarity queries
CREATE INDEX IF NOT EXISTS idx_song_title_trgm
  ON "Song" USING gist (unaccent(lower(title)) gist_trgm_ops);
