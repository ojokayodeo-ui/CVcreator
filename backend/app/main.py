from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import get_settings
from .api.routes import auth, cv, jobs, drive, download

app = FastAPI(
    title="AI Job Application Engine",
    description="Generate tailored CVs, cover letters and job-winning strategies",
    version="1.0.0",
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cv.router)
app.include_router(jobs.router)
app.include_router(drive.router)
app.include_router(download.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
