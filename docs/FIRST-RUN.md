# First run on a real iPhone

You need: a Mac and an iPhone on the same Wi-Fi, [Expo Go](https://apps.apple.com/app/expo-go/id982107779) installed on the iPhone,
your own Anthropic API key (analysis and filing) and, for voice, your own OpenAI API key.

1. `./scripts/dev.sh --check` shows what is ready and what is missing.
2. `./scripts/dev.sh` installs everything and creates `server/.env`, then stops so you can add your keys.
3. Open `server/.env` (`open -e server/.env`), paste the keys after `ANTHROPIC_API_KEY=` and `OPENAI_API_KEY=`, and save.
   Keys stay in this file on your Mac. They are git-ignored and never go into the app.
4. `./scripts/dev.sh` again starts the backend and Expo. Scan the QR code with the iPhone Camera.

Accounts are real Supabase accounts. Do the one-time dashboard step in [SUPABASE.md](SUPABASE.md) first, so the links in confirmation and reset emails open the app. The script sets `REQUIRE_VERIFIED=0` for the AI server in development.

## What to try
1. Create an account. Pick "Both" for storage.
2. Type an idea and Save. The AI cleans it up and files it. Type a related one and watch the "Where should this go?" sheet.
3. Hold the mic and speak (needs the OpenAI key). Release to stop.
4. Open Recorded Ideas, expand a card, Add image (up to 4), then Analyze Idea. Read the Result, then try Email and Print.
5. Edit the idea text: the button changes to Re-analyze Idea and the score chip turns dashed.
6. Settings: change password, sign out and back in (ideas sync back), delete account. Forgot password sends a link; open it on the iPhone.

## If something fails
- "Cannot reach the server": the iPhone and Mac are on different Wi-Fi, or a firewall blocks port 8787. Open `http://<Mac address>:8787/health` in Safari on the iPhone; it should show `{"ok":true}`.
- Analysis says "AI service is unavailable": check `ANTHROPIC_API_KEY` and the server log. The model is `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
- Transcription fails: check `OPENAI_API_KEY` and `TRANSCRIBE_MODEL` in `server/.env`; the default id may differ from OpenAI's current name.
- The web preview cannot record audio. Use the iPhone.
