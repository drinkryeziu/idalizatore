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
