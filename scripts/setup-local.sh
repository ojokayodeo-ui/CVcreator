#!/usr/bin/env bash
set -e

echo "=== AI Job Application Engine — Local Setup ==="

# Backend
echo ""
echo "→ Setting up backend..."
cd "$(dirname "$0")/../backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt -q
playwright install chromium

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created backend/.env — fill in your API keys before running."
fi

echo "  Backend ready."

# Frontend
echo ""
echo "→ Setting up frontend..."
cd ../frontend

npm install -q

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created frontend/.env"
fi

echo "  Frontend ready."

echo ""
echo "=== Setup complete ==="
echo ""
echo "To run locally, open two terminals:"
echo "  Terminal 1 (backend):  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "  Terminal 2 (frontend): cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
