# AI Job Application Engine

Generate tailored CVs, cover letters, and job-winning strategies from a single job URL — powered by GPT-4o.

## Architecture

```
CVcreator/
├── backend/          → FastAPI (deploy to Railway)
│   ├── app/
│   │   ├── api/routes/    auth, cv, jobs, drive, download
│   │   ├── services/      scraper, ai_engine, cv_parser, drive_service
│   │   ├── prompts/       all AI prompts
│   │   └── core/          config, database, security
│   ├── supabase_schema.sql
│   └── requirements.txt
└── frontend/         → React + Vite (deploy to Netlify)
    └── src/
        ├── components/pages/
        └── services/api.ts
```

## Quick Start (Local)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # fill in your keys
uvicorn app.main:app --reload
```

### 2. Database (Supabase)

1. Create a project at supabase.com
2. Run `supabase_schema.sql` in the SQL editor
3. Copy URL + service role key to backend `.env`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to Railway
2. Set root directory to `backend/`
3. Add all env vars from `.env.example`
4. Railway auto-detects Python via `railway.json`

### Frontend → Netlify

1. Connect repo to Netlify
2. Build command: `npm run build` | Publish dir: `dist` | Base: `frontend/`
3. Set env var: `VITE_API_URL=https://your-railway-app.railway.app`
4. The `netlify.toml` handles SPA routing automatically

---

## Required API Keys

| Key | Where to get |
|-----|-------------|
| `OPENAI_API_KEY` | platform.openai.com |
| `SUPABASE_URL` + keys | supabase.com project settings |
| `GOOGLE_CLIENT_ID/SECRET` | console.cloud.google.com (optional — for Drive) |
| `JWT_SECRET` | any random 32+ char string |

## Google Drive Setup (Optional)

1. Create a Google Cloud project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials (Web Application)
4. Add redirect URI: `https://your-backend.railway.app/drive/callback`
5. Add client ID/secret to backend env vars

---

## AI Pipeline

```
Job URL → Scrape → Analyse Job → Load Persona → Match Score
                                                    ↓
                             CV Optimisation ← Strategy Engine
                             Cover Letter    ← Interview Questions
                                    ↓
                             Download / Google Drive
```
