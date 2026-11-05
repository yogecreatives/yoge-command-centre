-- YOGE Sales Machine v1: quality-first direct US sales workflow
-- Additive only. Apply after migration_003.sql.

alter table public.prospects
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending','approved','hold','rejected')),
  add column if not exists website_classification text not null default 'unreviewed'
    check (website_classification in ('unreviewed','good','needs_improvement','outdated')),
  add column if not exists priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_review_count integer,
  add column if not exists wix_detected boolean,
  add column if not exists wix_evidence text,
  add column if not exists website_screenshot_url text,
  add column if not exists research_summary text,
  add column if not exists research_data jsonb not null default '{}'::jsonb,
  add column if not exists outreach_draft text,
  add column if not exists outreach_channel text
    check (outreach_channel is null or outreach_channel in ('email','facebook','instagram','linkedin','other')),
  add column if not exists outreach_approved_at timestamptz,
  add column if not exists decision_notes text;

create index if not exists prospects_review_queue
  on public.prospects (user_id, business_id, review_status, priority, created_at desc);

create index if not exists prospects_sales_stage
  on public.prospects (user_id, business_id, stage, next_action_date);

alter table public.user_settings
  add column if not exists direct_us_goal integer not null default 3
    check (direct_us_goal between 1 and 20);

alter table public.prospect_activities
  drop constraint if exists prospect_activities_kind_check;

alter table public.prospect_activities
  add constraint prospect_activities_kind_check
  check (kind in ('email_sent','dm_sent','replied','call','note','stage_change','research','approval','rejection'));
