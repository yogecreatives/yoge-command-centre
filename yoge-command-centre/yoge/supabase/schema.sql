-- YOGE Business Command Centre — database schema
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  symbol text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  client_name text,
  description text,
  start_date date,
  due_date date,
  status text not null default 'planning' check (status in ('planning','in_progress','on_hold','completed')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or due_date is null or due_date >= start_date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 300),
  category text,
  task_type text not null default 'general' check (task_type in ('general','follow_up','client_work','project_task','marketing','administration')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  due_date date,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  person_name text not null check (char_length(trim(person_name)) between 1 and 200),
  company text,
  email text,
  phone text,
  follow_up_date date not null,
  notes text,
  status text not null default 'open' check (status in ('open','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 300),
  description text,
  category text,
  status text not null default 'new' check (status in ('new','exploring','converted','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task_due','task_overdue','follow_up_due','follow_up_overdue','project_deadline')),
  title text not null,
  body text,
  ref_table text,
  ref_id uuid,
  ref_date date,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id, ref_date)
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Kuala_Lumpur',
  timezone_confirmed boolean not null default false,
  remind_days_before int not null default 1 check (remind_days_before between 0 and 14),
  remind_tasks boolean not null default true,
  remind_followups boolean not null default true,
  remind_projects boolean not null default true,
  remind_overdue boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists tasks_user_status_due on public.tasks (user_id, status, due_date);
create index if not exists tasks_business on public.tasks (business_id);
create index if not exists tasks_project on public.tasks (project_id);
create index if not exists follow_ups_user_status_date on public.follow_ups (user_id, status, follow_up_date);
create index if not exists follow_ups_business on public.follow_ups (business_id);
create index if not exists projects_user_status_due on public.projects (user_id, status, due_date);
create index if not exists projects_business on public.projects (business_id);
create index if not exists ideas_user on public.ideas (user_id, status);
create index if not exists notifications_user_unread on public.notifications (user_id, read_at, created_at desc);

-- ---------- updated_at triggers ----------
do $$ declare t text; begin
  foreach t in array array['profiles','businesses','projects','tasks','follow_ups','ideas','user_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$ declare t text; begin
  foreach t in array array['profiles','businesses','projects','tasks','follow_ups','ideas','notifications','user_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- A record may only point at a business / project that belongs to the same user.
drop policy if exists "own rows" on public.tasks;
create policy "own rows" on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );

drop policy if exists "own rows" on public.follow_ups;
create policy "own rows" on public.follow_ups for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));

drop policy if exists "own rows" on public.projects;
create policy "own rows" on public.projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));

-- ---------- new-user setup ----------
create or replace function public._seed_user(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (uid) on conflict (user_id) do nothing;
  insert into public.user_settings (user_id) values (uid) on conflict (user_id) do nothing;
  insert into public.businesses (user_id, slug, name, description, symbol, sort_order) values
    (uid, 'white-label',   'White Label',      'Agency partnerships · Outsourced Wix development', '↗', 1),
    (uid, 'yogeworks',     'Yogeworks',        'Malaysia market · Sales partners · Website delivery', '◈', 2),
    (uid, 'yogecreatives', 'Yogecreatives',    'Wix agency · Marketing · Clients', '✦', 3),
    (uid, 'yogefolio',     'Yogefolio',        'Portfolio websites for models, actors and creatives', '▧', 4),
    (uid, 'other',         'Other businesses', 'New ventures · Experiments · Miscellaneous', '＋', 5)
  on conflict (user_id, slug) do nothing;
end $$;
revoke all on function public._seed_user(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public._seed_user(new.id); return new; end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Called by the app after login; also sets up accounts created before this schema existed.
create or replace function public.bootstrap_user() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public._seed_user(auth.uid());
end $$;
revoke all on function public.bootstrap_user() from public, anon;
grant execute on function public.bootstrap_user() to authenticated;

-- ---------- realtime (cross-device sync) ----------
do $$ declare t text; begin
  foreach t in array array['tasks','follow_ups','projects','ideas','notifications','user_settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
