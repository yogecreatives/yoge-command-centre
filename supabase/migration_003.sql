-- YOGE migration 003: Yogecreatives workspace (client pipeline, DM history, client contact fields, expenses).
-- Run ONCE in the Supabase SQL Editor AFTER migration_002.sql. Additive only: nothing is deleted or rewritten.

-- Client pipeline stages (shared prospects table; White Label keeps its own stages)
alter table public.prospects drop constraint if exists prospects_stage_check;
alter table public.prospects add constraint prospects_stage_check check (stage in (
  'prospect','email_1','follow_up_1','follow_up_2','replied','call_booked','test_project','partner','not_now','not_interested','invalid',
  'new','contacted','interested','proposal_sent','negotiation','won','lost'));
alter table public.prospects add column if not exists city text;
alter table public.prospects add column if not exists category text;
alter table public.prospects add column if not exists next_action text;
alter table public.prospects add column if not exists lost_reason text;
alter table public.prospects add column if not exists won_project_id uuid references public.projects(id) on delete set null;

-- DM outreach history
alter table public.prospect_activities drop constraint if exists prospect_activities_kind_check;
alter table public.prospect_activities add constraint prospect_activities_kind_check
  check (kind in ('email_sent','dm_sent','replied','call','note','stage_change'));

-- Client contact details live with the project (used by Contacts)
alter table public.projects add column if not exists client_email text;
alter table public.projects add column if not exists client_phone text;

-- Expenses (Finance)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null,
  category text,
  vendor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_user_date on public.expenses (user_id, expense_date desc);
drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
alter table public.expenses enable row level security;
drop policy if exists "own rows" on public.expenses;
create policy "own rows" on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
do $$ begin
  begin alter publication supabase_realtime add table public.expenses;
  exception when duplicate_object then null; end;
end $$;
