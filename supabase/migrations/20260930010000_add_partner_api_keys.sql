-- Credenciais da Partner API. A chave em texto simples nunca é guardada: apenas
-- o hash SHA-256, que é comparado pelo servidor em cada pedido.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public."PartnerApiKey" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "secretHash" text NOT NULL UNIQUE,
  "keyPrefix" text NOT NULL,
  "scopes" text[] NOT NULL DEFAULT ARRAY['songs:read']::text[],
  "rateLimit" integer NOT NULL DEFAULT 120 CHECK ("rateLimit" BETWEEN 1 AND 10000),
  "isActive" boolean NOT NULL DEFAULT true,
  "expiresAt" timestamptz,
  "lastUsedAt" timestamptz,
  "createdById" integer NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "PartnerApiKey_name_not_blank" CHECK (length(trim("name")) > 0),
  CONSTRAINT "PartnerApiKey_read_only_scopes" CHECK ("scopes" <@ ARRAY['songs:read']::text[])
);

CREATE INDEX IF NOT EXISTS "PartnerApiKey_active_hash_idx"
  ON public."PartnerApiKey" ("secretHash") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "PartnerApiKey_createdById_idx"
  ON public."PartnerApiKey" ("createdById");

ALTER TABLE public."PartnerApiKey" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PartnerApiKey" FROM anon, authenticated;
