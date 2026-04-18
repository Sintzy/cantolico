-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() is STABLE, not IMMUTABLE, so it can't be used in index expressions.
-- This immutable wrapper is the standard workaround — must be created before the index.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT unaccent($1);
$$;

-- Full-text + accent-insensitive + fuzzy song search
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
  WHERE  immutable_unaccent(lower(title)) ILIKE '%' || immutable_unaccent(lower(q)) || '%'
     OR  similarity(immutable_unaccent(lower(title)), immutable_unaccent(lower(q))) > 0.25
  ORDER BY
    CASE WHEN immutable_unaccent(lower(title)) ILIKE '%' || immutable_unaccent(lower(q)) || '%' THEN 0 ELSE 1 END,
    similarity(immutable_unaccent(lower(title)), immutable_unaccent(lower(q))) DESC,
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
  WHERE  immutable_unaccent(lower(title)) ILIKE '%' || immutable_unaccent(lower(q)) || '%'
     OR  similarity(immutable_unaccent(lower(title)), immutable_unaccent(lower(q))) > 0.25;
$$;

-- GiST trigram index for fast similarity queries
CREATE INDEX IF NOT EXISTS idx_song_title_trgm
  ON "Song" USING gist (immutable_unaccent(lower(title)) gist_trgm_ops);
