-- Persisted SNL calendar and deterministic song suggestions. The calendar is
-- intentionally independent from a browser request so a celebration keeps the
-- same prepared repertoire once it has been published.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public."LiturgicalCalendarDay" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" date NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "categories" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "color" text,
  "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sourceHash" text NOT NULL,
  "sourceUrl" text NOT NULL,
  "syncedAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LiturgicalCalendarDay_color_check"
    CHECK ("color" IS NULL OR "color" IN ('VERDE', 'ROXO', 'BRANCO', 'VERMELHO', 'ROSA'))
);

CREATE TABLE IF NOT EXISTS public."LiturgicalSuggestion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "calendarDayId" uuid NOT NULL REFERENCES public."LiturgicalCalendarDay"("id") ON DELETE CASCADE,
  "celebrationDate" date NOT NULL,
  "moment" text NOT NULL,
  -- Song IDs are public slugs/text identifiers, not UUIDs.
  "songId" text NOT NULL REFERENCES public."Song"("id") ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS "LiturgicalCalendarDay_date_idx" ON public."LiturgicalCalendarDay" ("date");
CREATE INDEX IF NOT EXISTS "LiturgicalSuggestion_date_moment_idx" ON public."LiturgicalSuggestion" ("celebrationDate", "moment");
CREATE INDEX IF NOT EXISTS "LiturgicalSuggestion_song_moment_date_idx" ON public."LiturgicalSuggestion" ("songId", "moment", "celebrationDate" DESC);

ALTER TABLE public."LiturgicalCalendarDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LiturgicalSuggestion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."LiturgicalCalendarDay" FROM anon, authenticated;
REVOKE ALL ON TABLE public."LiturgicalSuggestion" FROM anon, authenticated;
