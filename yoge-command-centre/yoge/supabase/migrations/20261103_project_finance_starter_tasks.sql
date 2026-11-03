-- Add project finance, referral, invoice and editable starter-task settings.
alter table public.projects
  add column if not exists total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0 and paid_amount <= total_amount),
  add column if not exists referred_by text,
  add column if not exists invoice_status text not null default 'not_sent'
    check (invoice_status in ('not_sent','sent','paid'));
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('planning','in_progress','on_hold','completed','dropped'));
alter table public.user_settings
  add column if not exists starter_tasks jsonb not null default '[{"title":"Collect content and requirements","offset":0},{"title":"Design homepage","offset":3},{"title":"Build and connect pages","offset":7},{"title":"Client review","offset":10},{"title":"Send invoice","offset":14},{"title":"Collect balance","offset":17},{"title":"Ask for review","offset":21}]'::jsonb;
