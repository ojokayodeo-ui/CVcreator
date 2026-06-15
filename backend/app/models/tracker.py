from pydantic import BaseModel
from typing import Optional
from datetime import date


STAGES = [
    "saved",
    "applied",
    "screening",
    "interview",
    "assessment",
    "offer",
    "background_checks",
    "hired",
    "rejected",
]


class ApplicationCreate(BaseModel):
    job_title: str
    company: str
    location: str = ""
    job_url: str = ""
    stage: str = "saved"
    notes: str = ""
    applied_date: Optional[date] = None
    next_action: str = ""
    next_date: Optional[date] = None
    salary: str = ""


class ApplicationUpdate(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[date] = None
    next_action: Optional[str] = None
    next_date: Optional[date] = None
    salary: Optional[str] = None
