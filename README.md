# Idealizator

Speak a business idea; the AI cleans it up, files it, scores its market potential and writes a business and marketing plan.
Spec: [docs/Idealizator-handoff.md](docs/Idealizator-handoff.md). Mockups: `design/mockups`.

Built with Expo (React Native, TypeScript). Run on an iPhone with Expo Go: `npm install && npx expo start`.

## Status
Done: design tokens, menu drawer (360 ms slide), welcome/create/sign-in flow (local placeholder auth), storage choice,
Ready to record (hold-to-record voice + typing), Recorded Ideas (search, edit, delete), Analyzed Ideas list, Settings,
AI prompts and defensive JSON parsers (`src/ai`).

Next (handoff build order): backend (auth, `/file` and `/analyze` using the prompts in `src/ai/prompts.ts`, API key server-side),
audio recording and transcription, Result screen, Email/Print, sync, plans and payments, Terms/Privacy.

## Run with the backend
1. `cd server && cp .env.example .env`, add `ANTHROPIC_API_KEY`, then `npm install && npm start`.
2. In the app folder: `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8787 npx expo start` and open in Expo Go.
Typed ideas are filed by the AI (new / existing / "Where should this go?" sheet); Analyze Idea opens the Result screen.

Voice needs `OPENAI_API_KEY` in `server/.env` (model via `TRANSCRIBE_MODEL`; whisper-1 is deprecated). The microphone works in Expo Go on a real iPhone, not the web preview.

## Accounts and sync
Accounts use Supabase Auth (session in the iOS Keychain); synced ideas, profiles and monthly limits live in Supabase tables with row-level security.
Our server in `server/` only does AI (filing, analysis, transcription) and checks the person's Supabase token. See [docs/SUPABASE.md](docs/SUPABASE.md) for the one-time dashboard steps.
Sync is last-write-wins per idea and runs when Settings storage is "On our server" or "Both". Images are not synced yet.
Server tests: `cd server && npm test`.

## Images, legal, first run
Up to 4 images per idea (shrunk to 1600 px JPEG, kept on the iPhone, sent to the AI on Analyze, not synced yet).
Terms of Use and Privacy Policy screens are in Settings and on sign-up (`src/legal.ts`; sample text, needs lawyer review).
First run on a real iPhone: see [docs/FIRST-RUN.md](docs/FIRST-RUN.md) and `./scripts/dev.sh`.
