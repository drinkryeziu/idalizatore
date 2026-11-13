# Idealizator

Speak a business idea; the AI cleans it up, files it, scores its market potential and writes a business and marketing plan.
Spec: [docs/Idealizator-handoff.md](docs/Idealizator-handoff.md). Mockups: `design/mockups`.

Built with Expo (React Native, TypeScript). Run on an iPhone with Expo Go: `npm install && npx expo start`.

## Status
Done: design tokens, menu drawer (360 ms slide), welcome/create/sign-in flow (local placeholder auth), storage choice,
Ready to record (typing fallback), Recorded Ideas (search, edit, delete), Analyzed Ideas list, Settings,
AI prompts and defensive JSON parsers (`src/ai`).

Next (handoff build order): backend (auth, `/file` and `/analyze` using the prompts in `src/ai/prompts.ts`, API key server-side),
audio recording and transcription, Result screen, Email/Print, sync, plans and payments, Terms/Privacy.

## Run with the backend
1. `cd server && cp .env.example .env`, add `ANTHROPIC_API_KEY`, then `npm install && npm start`.
2. In the app folder: `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8787 npx expo start` and open in Expo Go.
Typed ideas are filed by the AI (new / existing / "Where should this go?" sheet); Analyze Idea opens the Result screen.
