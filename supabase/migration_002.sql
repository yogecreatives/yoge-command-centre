-- YOGE migration 002: pipeline, project payments, referrers, income.
-- Run ONCE in Supabase SQL Editor AFTER schema.sql and reminders.sql. Safe to re-run.

-- ---------- referrers (agencies / people who send projects) ----------
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

-- ---------- projects: payment tracking ----------
alter table public.projects add column if not exists total_amount numeric(12,2) not null default 0 check (total_amount >= 0);
alter table public.projects add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0);
alter table public.projects add column if not exists balance_amount numeric(12,2) generated always as (total_amount - paid_amount) stored;
alter table public.projects add column if not exists referrer_id uuid references public.referrers(id) on delete set null;
alter table public.projects add column if not exists invoice_status text not null default 'not_sent' check (invoice_status in ('not_sent','sent','paid'));
alter table public.projects add column if not exists commission_amount numeric(12,2);
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('planning','in_progress','on_hold','completed','dropped'));
create index if not exists projects_referrer on public.projects (referrer_id);

-- ---------- prospects (White Label agency pipeline) ----------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  agency_name text not null check (char_length(trim(agency_name)) between 1 and 200),
  contact_name text, email text, phone text, website text, country text, source text,
  fit smallint not null default 2 check (fit between 1 and 3),
  stage text not null default 'prospect' check (stage in ('prospect','email_1','follow_up_1','follow_up_2','replied','call_booked','test_project','partner','not_now','not_interested','invalid')),
  next_action_date date,
  last_contacted_at timestamptz,
  snooze_until date,
  test_project_value numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_user_stage_next on public.prospects (user_id, stage, next_action_date);

create table if not exists public.prospect_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  kind text not null check (kind in ('email_sent','replied','call','note','stage_change')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists prospect_activities_prospect on public.prospect_activities (prospect_id, created_at desc);
create index if not exists prospect_activities_user_day on public.prospect_activities (user_id, created_at desc);

-- ---------- income (e.g. Wix partner commission) ----------
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

-- ---------- settings: outreach + starter tasks ----------
alter table public.user_settings add column if not exists sender_name text not null default '';
alter table public.user_settings add column if not exists daily_new_limit int not null default 10 check (daily_new_limit between 1 and 100);
alter table public.user_settings add column if not exists outreach_gaps int[] not null default '{3,7,14}';
alter table public.user_settings add column if not exists skip_weekends boolean not null default true;
alter table public.user_settings add column if not exists outreach_templates jsonb not null default $t${
 "email_1":{"subject":"Wix Studio build partner for {agency}","body":"Hi {contact},\n\nI came across {agency} and your Wix work. I run a Wix Studio development team that partners with agencies who need extra build capacity. You keep the client and the brand; we handle the build.\n\nTypical work we take on: Wix Studio builds from your designs, CMS and dynamic pages, Velo custom functionality, and fixes or maintenance.\n\nIf you ever have overflow work, I'd be glad to do a small paid trial project so you can judge the quality first. Would a short chat this week suit you?\n\nBest regards,\n{sender}"},
 "follow_up_1":{"subject":"Re: Wix Studio build partner for {agency}","body":"Hi {contact},\n\nJust a quick follow-up on my note about white-label Wix Studio builds for {agency}. Happy to share a few examples if useful.\n\nBest regards,\n{sender}"},
 "follow_up_2":{"subject":"Re: Wix Studio build partner for {agency}","body":"Hi {contact},\n\nI wanted to try once more. If {agency} has a Wix or Wix Studio project coming up where an extra pair of hands would help, I can start with a small trial so there is no risk on your side.\n\nBest regards,\n{sender}"},
 "last_nudge":{"subject":"Closing the loop","body":"Hi {contact},\n\nI'll stop here so I don't clutter your inbox. If white-label Wix development is ever useful for {agency}, just reply and I'll be happy to help.\n\nBest regards,\n{sender}"}
}$t$::jsonb;
alter table public.user_settings add column if not exists project_task_template jsonb not null default $t$[
 {"title":"Collect content and requirements","days":0},
 {"title":"Design homepage","days":3},
 {"title":"Build and connect pages","days":7},
 {"title":"Client review","days":10},
 {"title":"Send invoice","days":14},
 {"title":"Collect balance","days":17},
 {"title":"Ask for review","days":21}
]$t$::jsonb;
update public.user_settings set sender_name = 'Munis' where sender_name = '';

-- ---------- notifications: prospect follow-ups ----------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('task_due','task_overdue','follow_up_due','follow_up_overdue','project_deadline','prospect_followup'));

-- ---------- updated_at triggers ----------
do $$ declare t text; begin
  foreach t in array array['referrers','prospects','income_entries'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$ declare t text; begin
  foreach t in array array['referrers','prospects','prospect_activities','income_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "own rows" on public.projects;
create policy "own rows" on public.projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
    and (referrer_id is null or exists (select 1 from public.referrers r where r.id = referrer_id and r.user_id = (select auth.uid()))));

drop policy if exists "own rows" on public.prospects;
create policy "own rows" on public.prospects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));

drop policy if exists "own rows" on public.prospect_activities;
create policy "own rows" on public.prospect_activities for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id = (select auth.uid())));

-- ---------- realtime ----------
do $$ declare t text; begin
  foreach t in array array['referrers','prospects','prospect_activities','income_entries'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ---------- reminders: add pipeline follow-ups (replaces the function from reminders.sql) ----------
create or replace function public.generate_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare n int := 0; c int;
begin
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select t.user_id, 'task_due', t.title, 'Due ' || to_char(t.due_date, 'Dy DD Mon') || ' · ' || b.name, 'tasks', t.id, t.due_date
  from public.tasks t join public.user_settings s on s.user_id = t.user_id join public.businesses b on b.id = t.business_id
  where s.remind_tasks and t.status <> 'completed' and t.due_date is not null
    and t.due_date >= (now() at time zone s.timezone)::date
    and t.due_date <= (now() at time zone s.timezone)::date + s.remind_days_before
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select t.user_id, 'task_overdue', t.title, 'Overdue since ' || to_char(t.due_date, 'Dy DD Mon') || ' · ' || b.name, 'tasks', t.id, t.due_date
  from public.tasks t join public.user_settings s on s.user_id = t.user_id join public.businesses b on b.id = t.business_id
  where s.remind_overdue and t.status <> 'completed' and t.due_date is not null
    and t.due_date < (now() at time zone s.timezone)::date
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select f.user_id, 'follow_up_due', 'Follow up with ' || f.person_name,
         to_char(f.follow_up_date, 'Dy DD Mon') || ' · ' || b.name || coalesce(' · ' || f.company, ''), 'follow_ups', f.id, f.follow_up_date
  from public.follow_ups f join public.user_settings s on s.user_id = f.user_id join public.businesses b on b.id = f.business_id
  where s.remind_followups and f.status = 'open'
    and f.follow_up_date >= (now() at time zone s.timezone)::date
    and f.follow_up_date <= (now() at time zone s.timezone)::date + s.remind_days_before
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select f.user_id, 'follow_up_overdue', 'Overdue: follow up with ' || f.person_name,
         'Was due ' || to_char(f.follow_up_date, 'Dy DD Mon') || ' · ' || b.name || coalesce(' · ' || f.company, ''), 'follow_ups', f.id, f.follow_up_date
  from public.follow_ups f join public.user_settings s on s.user_id = f.user_id join public.businesses b on b.id = f.business_id
  where s.remind_overdue and f.status = 'open' and f.follow_up_date < (now() at time zone s.timezone)::date
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select p.user_id, 'project_deadline', p.name, 'Project due ' || to_char(p.due_date, 'Dy DD Mon') || ' · ' || b.name, 'projects', p.id, p.due_date
  from public.projects p join public.user_settings s on s.user_id = p.user_id join public.businesses b on b.id = p.business_id
  where s.remind_projects and p.status not in ('completed','dropped') and p.due_date is not null
    and p.due_date >= (now() at time zone s.timezone)::date
    and p.due_date <= (now() at time zone s.timezone)::date + greatest(s.remind_days_before, 3)
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Pipeline: agency follow-ups due today or overdue
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select p.user_id, 'prospect_followup', 'Follow up: ' || p.agency_name,
         'Due ' || to_char(p.next_action_date, 'Dy DD Mon') || ' · ' || b.name, 'prospects', p.id, p.next_action_date
  from public.prospects p join public.user_settings s on s.user_id = p.user_id join public.businesses b on b.id = p.business_id
  where s.remind_followups and p.stage in ('email_1','follow_up_1','follow_up_2')
    and p.next_action_date is not null and p.next_action_date <= (now() at time zone s.timezone)::date
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  return n;
end $$;
revoke all on function public.generate_reminders() from public, anon, authenticated;
