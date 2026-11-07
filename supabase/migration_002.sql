-- YOGE migration 002: project payments, referrers and income.
-- Run ONCE in Supabase SQL Editor AFTER schema.sql and reminders.sql. Safe to re-run.

create table if not exists public.referrers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  type text not null default 'individual' check (type in ('agency','individual','direct','marketplace')),
  email text, phone text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists referrers_user_name on public.referrers (user_id, lower(name));

alter table public.projects add column if not exists total_amount numeric(12,2) not null default 0 check (total_amount >= 0);
alter table public.projects add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0);
alter table public.projects add column if not exists balance_amount numeric(12,2) generated always as (total_amount - paid_amount) stored;
alter table public.projects add column if not exists referrer_id uuid references public.referrers(id) on delete set null;
alter table public.projects add column if not exists invoice_status text not null default 'not_sent' check (invoice_status in ('not_sent','sent','paid'));
alter table public.projects add column if not exists commission_amount numeric(12,2);
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('planning','in_progress','on_hold','completed','dropped'));
create index if not exists projects_referrer on public.projects (referrer_id);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  source text not null default 'Wix partner commission',
  amount numeric(12,2) not null check (amount >= 0),
  entry_date date not null,
  status text not null default 'received' check (status in ('received','expected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists income_user_date on public.income_entries (user_id, entry_date desc);

alter table public.user_settings add column if not exists project_task_template jsonb not null default $t$[
 {"title":"Collect content and requirements","days":0},
 {"title":"Design homepage","days":3},
 {"title":"Build and connect pages","days":7},
 {"title":"Client review","days":10},
 {"title":"Send invoice","days":14},
 {"title":"Collect balance","days":17},
 {"title":"Ask for review","days":21}
]$t$::jsonb;

do $$ declare t text; begin
  foreach t in array['referrers','income_entries'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array['referrers','income_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "own rows" on public.projects;
create policy "own rows" on public.projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (referrer_id is null or exists (select 1 from public.referrers r where r.id = referrer_id and r.user_id = (select auth.uid())))
  );

do $$ declare t text; begin
  foreach t in array['referrers','income_entries'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
