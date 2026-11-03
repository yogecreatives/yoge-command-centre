# YOGE — Business Command Centre

React + Vite + TypeScript front end, Supabase (Auth, Postgres, Row Level Security, Realtime) back end.
Five workspaces: White Label, Yogeworks, Yogecreatives, Yogefolio, Other businesses.

## 1. Supabase (free plan)
1. Create a project at supabase.com.
2. **SQL Editor** → paste `supabase/schema.sql` → Run. (Tables, RLS policies, new-user setup, realtime.)
3. **Authentication → URL Configuration**: set *Site URL* to your deployed URL (and add `http://localhost:5173` to Redirect URLs). Needed for email confirmation and password reset links.
4. **Database → Extensions** → enable `pg_cron`, then paste `supabase/reminders.sql` into the SQL Editor → Run.
5. **Project Settings → API**: copy the Project URL and the anon / publishable key. Never use `service_role` in this app.

## 2. Run locally
```
cp .env.example .env.local     # fill in the two public values
npm install
npm run dev
```

## 3. Deploy (Vercel or Netlify)
Import the repo, build command `npm run build`, output directory `dist`.
Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.
Routing uses `#/…` so no rewrite rules are needed.

## 4. Use it on your phone
Open the deployed URL → iPhone: Share → *Add to Home Screen*. Android: menu → *Install app*.

## 5. Move your V2 prototype data
Settings → *Import from the V2 prototype* (instructions are on that screen). Nothing in the old file is deleted.

## Reminders
`public.generate_reminders()` runs in Postgres every 15 minutes via pg_cron and writes to `notifications`
(task due, overdue, follow-up due/overdue, project deadline), de-duplicated per item and date.
They appear live in the in-app Notifications list on every device. Push notifications are not included.
Check it: after creating a task due today, run `select public.generate_reminders();` in the SQL Editor, then open Notifications.

## Security model
Every table has `user_id` + RLS (`user_id = auth.uid()`); tasks, follow-ups and projects may only reference
the signed-in user's own businesses/projects. Only the public anon key is used in the browser.

## Offline
The app shows an offline banner and refuses to save while offline (no silent loss, no queue). It re-syncs when the
connection returns or the app is reopened. Data is not cached in localStorage, so cloud data is never overwritten by local data.

## Team access later
Add a `workspaces` + `workspace_members` table, a `workspace_id` on `businesses`, and change the RLS checks from
`user_id = auth.uid()` to membership checks. The data model is otherwise unchanged.
