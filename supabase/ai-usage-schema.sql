create table if not exists public."AiUsage" (
  id uuid primary key default gen_random_uuid(),
  "userId" integer not null references public."User"(id) on delete cascade,
  feature text not null,
  "massId" uuid references public."Mass"(id) on delete set null,
  prompt text,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AiUsage_user_feature_created_idx"
  on public."AiUsage" ("userId", feature, "createdAt" desc);

create index if not exists "AiUsage_mass_idx"
  on public."AiUsage" ("massId");
