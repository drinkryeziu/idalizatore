# Supabase setup

Idealizator uses the Supabase project **krz-db** (`ejzzeuhhkmuooswabwzm`, us-west-2). It is **shared with other apps**, so everything here is additive and prefixed `idealizator_`. Nothing touches other apps' schemas, the `auth.users` table (no triggers), or the project's Auth settings and email templates.

## What lives where
| Thing | Where |
|---|---|
| Accounts, passwords, sessions, confirmation and reset emails | Supabase Auth (the app talks to it directly with the publishable key) |
| Ideas sync, profiles, monthly analysis counts | Tables `idealizator_profiles`, `idealizator_ideas`, `idealizator_usage` with row-level security; writes go through functions `idealizator_sync`, `idealizator_count_analysis`, and so on |
| AI (filing, analysis, transcription) | Our small server in `server/` (deployed on Vercel). It checks the person's Supabase token and calls the database as that person. It never holds a secret/service key |
| Schema | `supabase/migrations/20261113000000_idealizator_schema.sql` (already applied to krz-db) |

## One-time dashboard steps (Authentication → URL Configuration)
1. **Redirect URLs**: add `idealizator://**`, for Expo Go while developing `exp://**`, and for the web app `http://localhost:8081/**` plus your deployed web address followed by `/**`. This is additive; it does not change other apps.
   Without it, the links in confirmation and reset emails open the project's Site URL instead of the app.
2. Optional but recommended: **Authentication → Providers → Email → enable leaked password protection** (project-wide; benefits all apps).
3. Emails use the project's default templates and sender, which is rate-limited and meant for testing. For launch, set up custom SMTP (project-wide).

## Things to know because the project is shared
- Anyone who already has a login in this project can sign in to Idealizator with it, and an Idealizator login works in the other apps' auth pool.
- **Delete account** removes Idealizator's data (profile, ideas, usage) and signs out, but cannot delete the shared login row without risking the other apps. Their email stays in Supabase Auth until you remove it in the dashboard. The Settings text says so. A dedicated project would allow full deletion.
- The Privacy Policy and Terms are sample text and should match this setup before launch.

## Checks already run
- Row-level security on all three tables; people cannot change their own `plan`; other people's rows are invisible.
- The live functions were tested against krz-db in a transaction that rolled back: last-write-wins, deletions that stay deleted, images stripped, the free limit of 3, and delete-my-data.
- Security advisor: only the intended "signed-in users can call these functions" notices for the five `idealizator_*` functions (each checks `auth.uid()`).

## Deployed API (Vercel)
Project `idalizatore` (root directory `server`), live at https://idalizatore.vercel.app, redeployed on every push to `main`.
Set in Vercel: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `REQUIRE_VERIFIED=1`, `ANTHROPIC_MODEL`, `TRANSCRIBE_MODEL`.
**You add the secrets yourself** in Vercel → Settings → Environment Variables: `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`, then redeploy.
Vercel Authentication is off for this project so the phone can reach it; every endpoint except `/health` needs a valid Supabase sign-in.
