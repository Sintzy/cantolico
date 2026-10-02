-- Repair migration for installations where the initial calendar migration was
-- attempted with a UUID foreign key. Song.id is a text identifier in Cantólico.
-- It is safe after an interrupted first run and on databases that already have
-- the corrected table.

CREATE TABLE IF NOT EXISTS public."LiturgicalSuggestion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "calendarDayId" uuid NOT NULL REFERENCES public."LiturgicalCalendarDay"("id") ON DELETE CASCADE,
  "celebrationDate" date NOT NULL,
  "moment" text NOT NULL,
  "songId" text NOT NULL,
  "position" smallint NOT NULL,
  "score" numeric(10, 3) NOT NULL,
  "calendarHash" text NOT NULL,
  "algorithmVersion" integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LiturgicalSuggestion_moment_check" CHECK ("moment" IN (
    'ENTRADA', 'ATO_PENITENCIAL', 'ACLAMACAO_EVANGELHO', 'OFERENDAS',
    'SANTO', 'CORDEIRO_DEUS', 'COMUNHAO', 'FINAL'
  )),
  CONSTRAINT "LiturgicalSuggestion_position_check" CHECK ("position" BETWEEN 1 AND 3),
  CONSTRAINT "LiturgicalSuggestion_day_moment_position_key" UNIQUE ("calendarDayId", "moment", "position"),
  CONSTRAINT "LiturgicalSuggestion_day_moment_song_key" UNIQUE ("calendarDayId", "moment", "songId")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'LiturgicalSuggestion'
      AND column_name = 'songId'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public."LiturgicalSuggestion"
      DROP CONSTRAINT IF EXISTS "LiturgicalSuggestion_songId_fkey";

    ALTER TABLE public."LiturgicalSuggestion"
      ALTER COLUMN "songId" TYPE text USING "songId"::text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."LiturgicalSuggestion"'::regclass
      AND conname = 'LiturgicalSuggestion_songId_fkey'
  ) THEN
    ALTER TABLE public."LiturgicalSuggestion"
      ADD CONSTRAINT "LiturgicalSuggestion_songId_fkey"
      FOREIGN KEY ("songId") REFERENCES public."Song"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LiturgicalSuggestion_date_moment_idx"
  ON public."LiturgicalSuggestion" ("celebrationDate", "moment");
CREATE INDEX IF NOT EXISTS "LiturgicalSuggestion_song_moment_date_idx"
  ON public."LiturgicalSuggestion" ("songId", "moment", "celebrationDate" DESC);

ALTER TABLE public."LiturgicalSuggestion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."LiturgicalSuggestion" FROM anon, authenticated;
