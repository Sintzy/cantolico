-- Let organisers remove unused liturgical moments from a mass checklist.
ALTER TABLE "Mass"
  ADD COLUMN IF NOT EXISTS "hiddenMoments" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "Mass"
  ADD CONSTRAINT "Mass_hiddenMoments_valid"
  CHECK (
    "hiddenMoments" <@ ARRAY[
      'ENTRADA', 'ATO_PENITENCIAL', 'GLORIA', 'SALMO_RESPONSORIAL',
      'ACLAMACAO_EVANGELHO', 'OFERENDAS', 'SANTO', 'PAI_NOSSO',
      'SAUDACAO_PAZ', 'CORDEIRO_DEUS', 'COMUNHAO', 'ACAO_GRACAS', 'FINAL', 'OUTRO'
    ]::text[]
  );
