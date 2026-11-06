-- YOGE migration 003: client contact fields and expenses.
-- Run ONCE in the Supabase SQL Editor AFTER migration_002.sql.

alter table public.projects add column if not exists client_email text;
alter table public.projects add column if not exists client_phone text;

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
