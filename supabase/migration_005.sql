-- Atomic prepared-data import. All three inserts run in one transaction.
create or replace function public.import_prepared_data(
  p_referrers jsonb,
  p_projects jsonb,
  p_income jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ref_count int := 0;
  project_count int := 0;
  income_count int := 0;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  insert into referrers (user_id, name, type)
  select uid, x.name, x.type
  from jsonb_to_recordset(coalesce(p_referrers, '[]'::jsonb)) as x(name text, type text);
  get diagnostics ref_count = row_count;

  insert into projects (
    user_id, business_id, name, start_date, status, total_amount, paid_amount,
    invoice_status, notes, referrer_id, completed_at
  )
  select uid, x.business_id, x.name, x.start_date, x.status, x.total_amount, x.paid_amount,
         x.invoice_status, x.notes,
         (select r.id from referrers r where r.user_id = uid and lower(r.name) = lower(x.referrer_name) limit 1),
         x.completed_at
  from jsonb_to_recordset(coalesce(p_projects, '[]'::jsonb)) as x(
    business_id uuid, name text, start_date date, status text, total_amount numeric,
    paid_amount numeric, invoice_status text, notes text, referrer_name text, completed_at timestamptz
  );
  get diagnostics project_count = row_count;

  insert into income_entries (user_id, business_id, source, amount, entry_date, status, notes)
  select uid, x.business_id, x.source, x.amount, x.entry_date, x.status, x.notes
  from jsonb_to_recordset(coalesce(p_income, '[]'::jsonb)) as x(
    business_id uuid, source text, amount numeric, entry_date date, status text, notes text
  );
  get diagnostics income_count = row_count;

  return jsonb_build_object('referrers', ref_count, 'projects', project_count, 'income', income_count);
end
$$;

revoke all on function public.import_prepared_data(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.import_prepared_data(jsonb, jsonb, jsonb) to authenticated;
