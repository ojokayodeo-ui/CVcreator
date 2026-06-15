from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .core.database import get_db
from .api.deps import SINGLE_USER_ID
from .api.routes import cv, jobs, drive, download, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the single app user exists (satisfies FK constraints on personas/history)
    get_db().table("users").upsert({
        "id": SINGLE_USER_ID,
        "email": "me@local",
        "full_name": "Me",
        "password_hash": "",
    }).execute()

    yield

app = FastAPI(
    title="AI Job Application Engine",
    description="Generate tailored CVs, cover letters and job-winning strategies",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv.router)
app.include_router(jobs.router)
app.include_router(drive.router)
app.include_router(download.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
