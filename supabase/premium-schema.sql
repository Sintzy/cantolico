alter table public."User"
  add column if not exists "plan" text not null default 'free',
  add column if not exists "planStatus" text not null default 'inactive',
  add column if not exists "premiumUntil" timestamptz,
  add column if not exists "stripeCustomerId" text,
  add column if not exists "stripeSubscriptionId" text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'User_plan_check'
  ) then
    alter table public."User"
      add constraint "User_plan_check"
      check ("plan" in ('free', 'premium'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'User_planStatus_check'
  ) then
    alter table public."User"
      add constraint "User_planStatus_check"
      check ("planStatus" in ('inactive', 'active', 'past_due', 'canceled'));
  end if;
end $$;

create index if not exists "User_plan_idx" on public."User" ("plan", "planStatus");
create index if not exists "User_stripeCustomerId_idx" on public."User" ("stripeCustomerId");
create index if not exists "User_stripeSubscriptionId_idx" on public."User" ("stripeSubscriptionId");
