-- YOGE reminders — run AFTER schema.sql.
-- 1) Enable pg_cron: Dashboard > Database > Extensions > pg_cron (toggle on).
-- 2) Run this whole file in the SQL Editor.
-- The database itself creates notifications every 15 minutes; no browser or app needs to be open.

create or replace function public.generate_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare n int := 0; c int;
begin
  -- Tasks due soon (today up to N days ahead, N = user's setting)
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select t.user_id, 'task_due', t.title,
         'Due ' || to_char(t.due_date, 'Dy DD Mon') || ' · ' || b.name, 'tasks', t.id, t.due_date
  from public.tasks t
  join public.user_settings s on s.user_id = t.user_id
  join public.businesses b on b.id = t.business_id
  where s.remind_tasks and t.status <> 'completed' and t.due_date is not null
    and t.due_date >= (now() at time zone s.timezone)::date
    and t.due_date <= (now() at time zone s.timezone)::date + s.remind_days_before
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Overdue tasks (one alert per task)
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select t.user_id, 'task_overdue', t.title,
         'Overdue since ' || to_char(t.due_date, 'Dy DD Mon') || ' · ' || b.name, 'tasks', t.id, t.due_date
  from public.tasks t
  join public.user_settings s on s.user_id = t.user_id
  join public.businesses b on b.id = t.business_id
  where s.remind_overdue and t.status <> 'completed' and t.due_date is not null
    and t.due_date < (now() at time zone s.timezone)::date
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Follow-ups due soon
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select f.user_id, 'follow_up_due', 'Follow up with ' || f.person_name,
         to_char(f.follow_up_date, 'Dy DD Mon') || ' · ' || b.name || coalesce(' · ' || f.company, ''),
         'follow_ups', f.id, f.follow_up_date
  from public.follow_ups f
  join public.user_settings s on s.user_id = f.user_id
  join public.businesses b on b.id = f.business_id
  where s.remind_followups and f.status = 'open'
    and f.follow_up_date >= (now() at time zone s.timezone)::date
    and f.follow_up_date <= (now() at time zone s.timezone)::date + s.remind_days_before
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Overdue follow-ups
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select f.user_id, 'follow_up_overdue', 'Overdue: follow up with ' || f.person_name,
         'Was due ' || to_char(f.follow_up_date, 'Dy DD Mon') || ' · ' || b.name || coalesce(' · ' || f.company, ''),
         'follow_ups', f.id, f.follow_up_date
  from public.follow_ups f
  join public.user_settings s on s.user_id = f.user_id
  join public.businesses b on b.id = f.business_id
  where s.remind_overdue and f.status = 'open'
    and f.follow_up_date < (now() at time zone s.timezone)::date
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Project deadlines (at least 3 days of notice)
  insert into public.notifications (user_id, kind, title, body, ref_table, ref_id, ref_date)
  select p.user_id, 'project_deadline', p.name,
         'Project due ' || to_char(p.due_date, 'Dy DD Mon') || ' · ' || b.name, 'projects', p.id, p.due_date
  from public.projects p
  join public.user_settings s on s.user_id = p.user_id
  join public.businesses b on b.id = p.business_id
  where s.remind_projects and p.status <> 'completed' and p.due_date is not null
    and p.due_date >= (now() at time zone s.timezone)::date
    and p.due_date <= (now() at time zone s.timezone)::date + greatest(s.remind_days_before, 3)
  on conflict (user_id, kind, ref_id, ref_date) do nothing;
  get diagnostics c = row_count; n := n + c;

  return n;
end $$;

revoke all on function public.generate_reminders() from public, anon, authenticated;

-- Schedule: every 15 minutes (re-running replaces the existing job)
select cron.unschedule(jobid) from cron.job where jobname = 'yoge-generate-reminders';
select cron.schedule('yoge-generate-reminders', '*/15 * * * *', $$select public.generate_reminders()$$);

-- Verify (run manually after you have some tasks): select public.generate_reminders();
