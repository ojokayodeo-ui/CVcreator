from pydantic import BaseModel, HttpUrl, Field
from typing import Optional
from uuid import UUID


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Persona ───────────────────────────────────────────────────────────────────

class PersonaCreate(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin_url: str = ""
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class PersonaResponse(PersonaCreate):
    id: UUID
    user_id: UUID
    structured_json: Optional[dict] = None


# ── Job Analysis ──────────────────────────────────────────────────────────────

class JobAnalysisRequest(BaseModel):
    job_url: str
    manual_description: Optional[str] = None  # fallback if scraping fails


class JobData(BaseModel):
    title: str
    company: str
    location: str = ""
    description: str
    responsibilities: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    salary_range: str = ""
    job_type: str = ""
    source_url: str = ""


class MatchScore(BaseModel):
    overall_score: int  # 0-100
    skill_match: int
    experience_match: int
    education_match: int
    skill_gaps: list[str]
    matching_skills: list[str]
    recommendations: list[str]


# ── Document Generation ───────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    persona_id: str
    job_url: str
    manual_description: Optional[str] = None
    generate_cv: bool = True
    generate_cover_letter: bool = True
    generate_strategy: bool = True
    save_to_drive: bool = False


class GeneratedDocuments(BaseModel):
    job_id: str
    job_data: JobData
    match_score: MatchScore
    optimised_cv: str
    cover_letter: str
    strategy_plan: Optional[str] = None
    interview_stages: Optional[list[str]] = None
    interview_questions: Optional[list[dict]] = None
    drive_folder_url: Optional[str] = None


# ── Drive ─────────────────────────────────────────────────────────────────────

class DriveAuthRequest(BaseModel):
    code: str


class DriveAuthResponse(BaseModel):
    authorized: bool
    email: str = ""
