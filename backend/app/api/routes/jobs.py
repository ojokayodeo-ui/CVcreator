import asyncio
from fastapi import APIRouter, HTTPException, Depends
from ...models.schemas import JobAnalysisRequest, GenerateRequest, GeneratedDocuments
from ...services.scraper import scrape_job_page
from ...services.job_search import search_jobs, SUPPORTED_COUNTRIES
from ...services.ai_engine import (
    analyse_job,
    calculate_match,
    generate_optimised_cv,
    generate_cover_letter,
    generate_strategy,
)
from ...services.document_generator import markdown_to_docx
from ...services.drive_service import save_job_documents
from ...core.database import get_db
from ..deps import get_current_user_id
import uuid

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/search/countries")
async def get_search_countries():
    return [{"code": code, "name": name} for code, name in SUPPORTED_COUNTRIES.items()]


@router.get("/search")
async def search_job_vacancies(
    keyword: str,
    country: str = "gb",
    location: str = "",
    page: int = 1,
    max_days_old: int | None = None,
    sort_by: str = "relevance",
    user_id: str = Depends(get_current_user_id),
):
    """Search live job vacancies by keyword, country, location and recency."""
    try:
        return await search_jobs(
            keyword=keyword,
            country=country,
            location=location,
            page=page,
            max_days_old=max_days_old,
            sort_by=sort_by,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Job search failed: {e}")


@router.post("/analyze")
async def analyze_job(
    payload: JobAnalysisRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Scrape and analyse a job posting."""
    job_text = None

    if payload.job_url:
        job_text = await scrape_job_page(payload.job_url)

    if not job_text:
        job_text = payload.manual_description or None

    if not job_text:
        raise HTTPException(
            status_code=422,
            detail="Could not scrape the job URL. Please paste the job description manually.",
        )

    job_data = await analyse_job(job_text)
    job_data["source_url"] = payload.job_url

    # Persist job analysis
    db = get_db()
    result = db.table("job_analyses").insert({
        "user_id": user_id,
        "source_url": payload.job_url,
        "job_data": job_data,
    }).execute()

    return {"job_id": result.data[0]["id"], "job_data": job_data}


@router.post("/generate")
async def generate_documents(
    payload: GenerateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Full pipeline: scrape → analyse → match → generate CV + cover letter + strategy."""
    db = get_db()

    # Load persona
    persona_result = db.table("personas").select("*").eq("user_id", user_id).execute()
    if not persona_result.data:
        raise HTTPException(status_code=404, detail="No persona found. Upload your CV first.")
    persona = persona_result.data[0]

    # Scrape / load job — scrape for the full posting, falling back to a manually
    # supplied (or search-result) description if scraping fails or is blocked.
    job_text = None
    if payload.job_url:
        job_text = await scrape_job_page(payload.job_url)
    if not job_text:
        job_text = payload.manual_description or None
    if not job_text:
        raise HTTPException(status_code=422, detail="Job scraping failed. Paste the description manually.")

    # AI pipeline — run independent steps concurrently where possible
    job_data = await analyse_job(job_text)
    job_data["source_url"] = payload.job_url
    match = await calculate_match(persona, job_data)

    tasks = []
    if payload.generate_cv:
        tasks.append(generate_optimised_cv(persona, job_data, match))
    if payload.generate_cover_letter:
        tasks.append(generate_cover_letter(persona, job_data, match.get("overall_score", 70)))
    if payload.generate_strategy:
        tasks.append(generate_strategy(persona, job_data, match))

    results = await asyncio.gather(*tasks)
    result_iter = iter(results)
    optimised_cv = next(result_iter) if payload.generate_cv else ""
    cover_letter = next(result_iter) if payload.generate_cover_letter else ""
    strategy_data = next(result_iter) if payload.generate_strategy else {}

    drive_url = None
    if payload.save_to_drive:
        drive_tokens = db.table("drive_tokens").select("tokens").eq("user_id", user_id).execute()
        if drive_tokens.data:
            cv_docx = markdown_to_docx(optimised_cv) if optimised_cv else b""
            drive_url = save_job_documents(
                token_dict=drive_tokens.data[0]["tokens"],
                job_title=job_data.get("title", "Job"),
                company=job_data.get("company", "Company"),
                cv_content=cv_docx,
                cover_letter=cover_letter,
                strategy=strategy_data.get("strategy_plan"),
            )

    job_id = str(uuid.uuid4())
    output = {
        "job_id": job_id,
        "job_data": job_data,
        "match_score": match,
        "optimised_cv": optimised_cv,
        "cover_letter": cover_letter,
        "strategy_plan": strategy_data.get("strategy_plan", ""),
        "interview_stages": strategy_data.get("interview_stages", []),
        "interview_questions": strategy_data.get("interview_questions", []),
        "preparation_roadmap": strategy_data.get("preparation_roadmap", []),
        "ideal_candidate_profile": strategy_data.get("ideal_candidate_profile", ""),
        "drive_folder_url": drive_url,
    }

    # Save to history
    db.table("generation_history").insert({
        "id": job_id,
        "user_id": user_id,
        "job_url": payload.job_url,
        "job_data": job_data,
        "match_score": match,
        "outputs": {
            "optimised_cv": optimised_cv,
            "cover_letter": cover_letter,
            "strategy_plan": strategy_data.get("strategy_plan", ""),
            "ideal_candidate_profile": strategy_data.get("ideal_candidate_profile", ""),
        },
    }).execute()

    return output


@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = (
        db.table("generation_history")
        .select("id,job_url,job_data,match_score,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data


@router.get("/history/{job_id}")
async def get_history_item(job_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("generation_history").select("*").eq("id", job_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return result.data[0]
