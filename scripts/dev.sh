#!/usr/bin/env bash
# One command for a first run on a real iPhone: installs dependencies, creates server/.env, starts the backend and Expo.
# Usage:  ./scripts/dev.sh          start everything
#         ./scripts/dev.sh --check  only report what is ready / missing
set -euo pipefail
cd "$(dirname "$0")/.."
CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()  { printf '  ok      %s\n' "$*"; }
todo(){ printf '  MISSING %s\n' "$*"; MISSING=1; }
MISSING=0

# The phone reaches this computer by its address on your Wi-Fi, never "localhost".
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

say "Checking"
command -v node >/dev/null && ok "Node $(node -v)" || todo "Node.js (https://nodejs.org)"
[ -n "$LAN_IP" ] && ok "Wi-Fi address $LAN_IP (the phone must be on the same Wi-Fi)" || todo "Wi-Fi address (connect this Mac to Wi-Fi)"
[ -d node_modules ] && ok "app dependencies installed" || echo "  will run npm install (app)"
[ -d server/node_modules ] && ok "server dependencies installed" || echo "  will run npm install (server)"

if [ ! -f server/.env ]; then
  echo "  will create server/.env from server/.env.example"
else
  key() { grep -E "^$1=.+" server/.env >/dev/null 2>&1; }
  key ANTHROPIC_API_KEY && ok "ANTHROPIC_API_KEY set (analysis and filing)" || todo "ANTHROPIC_API_KEY in server/.env"
  key OPENAI_API_KEY    && ok "OPENAI_API_KEY set (voice transcription)"    || todo "OPENAI_API_KEY in server/.env (voice will not work; typing still does)"
fi

[ "$CHECK" = 1 ] && { say "Check done"; exit 0; }
command -v node >/dev/null && [ -n "$LAN_IP" ] || { echo "Fix the missing items above, then run again."; exit 1; }

[ -d node_modules ] || npm install --no-fund --no-audit
[ -d server/node_modules ] || (cd server && npm install --no-fund --no-audit)

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  # Development defaults: skip the email-confirmation lock, and make emailed links point at this Mac.
  sed -i '' "s#^PUBLIC_URL=.*#PUBLIC_URL=http://$LAN_IP:8787#; s#^REQUIRE_VERIFIED=.*#REQUIRE_VERIFIED=0#" server/.env
  say "Created server/.env"
  echo "Open it and paste your own keys after ANTHROPIC_API_KEY= and OPENAI_API_KEY=, save, then run this script again."
  echo "  open -e server/.env"
  exit 0
fi

set -a; . server/.env; set +a
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then echo "ANTHROPIC_API_KEY is empty in server/.env. Add it, then run again."; exit 1; fi

say "Starting the backend on port 8787"
(cd server && npm start) &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 2

say "Starting Expo. Scan the QR code with the iPhone Camera (Expo Go must be installed)."
EXPO_PUBLIC_API_URL="http://$LAN_IP:8787" npx expo start
