from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from ...services.cv_parser import extract_cv_text
from ...services.ai_engine import extract_persona_from_cv
from ...models.schemas import PersonaCreate, PersonaResponse
from ...core.database import get_db
from ..deps import get_current_user_id

router = APIRouter(prefix="/cv", tags=["cv"])


@router.post("/upload")
async def upload_cv(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Parse a CV file and return extracted text + AI-structured persona."""
    if file.content_type not in (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        text = extract_cv_text(content, file.filename)
        structured = await extract_persona_from_cv(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CV: {e}")

    return {"raw_text": text, "structured": structured}


@router.post("/persona", response_model=dict)
async def save_persona(
    payload: PersonaCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Save or update the user's persona."""
    db = get_db()
    data = payload.model_dump()
    data["user_id"] = user_id

    # Upsert — one persona per user
    existing = db.table("personas").select("id").eq("user_id", user_id).execute()
    if existing.data:
        result = db.table("personas").update(data).eq("user_id", user_id).execute()
    else:
        result = db.table("personas").insert(data).execute()

    return result.data[0]


@router.get("/persona")
async def get_persona(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("personas").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No persona found — upload a CV first")
    return result.data[0]
