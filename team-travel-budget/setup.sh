#!/bin/bash
# setup.sh — one-time project setup
# Run this from the team-travel-budget/ directory

set -e

echo ""
echo "  ✈  Team Travel Budget — Setup"
echo ""

# ── Check Node.js ─────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "  Node.js not found."
  echo "  Install it from https://nodejs.org (LTS) or via Homebrew:"
  echo "    brew install node"
  echo ""
  exit 1
fi

NODE_VER=$(node --version)
echo "  Node.js $NODE_VER ✓"

# ── Install dependencies ──────────────────────────────────────────────────────
echo "  Installing dependencies…"
npm install

# ── Create .env if missing ────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random session secret
  SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
  # macOS sed needs '' after -i
  sed -i '' "s/change-me-to-a-long-random-string/$SECRET/" .env
  echo "  Created .env with a random session secret."
  echo ""
  echo "  ⚠  Edit .env to set ADMIN_PASSWORD before starting in production."
fi

# ── Create data dir ───────────────────────────────────────────────────────────
mkdir -p data

echo ""
echo "  Setup complete!"
echo ""
echo "  Start the server:"
echo "    npm start          (production)"
echo "    npm run dev        (auto-reload during development)"
echo ""
echo "  Then open:  http://localhost:3000"
echo "  Login with: admin / changeme  (change in .env)"
echo ""
