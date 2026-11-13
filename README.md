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
Real accounts: email and password (scrypt hashes), session token in the iOS Keychain, email confirmation link, reset code by email,
change password, delete account. Without `RESEND_API_KEY` the server prints emails in its log; with `REQUIRE_VERIFIED=0` you can skip confirmation while developing.
Sync (`POST /sync`) is last-write-wins per idea and runs when Settings storage is "On our server" or "Both". Images are not synced yet.
Server tests: `cd server && npm test`.
