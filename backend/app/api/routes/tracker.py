from fastapi import APIRouter, HTTPException, Depends
from ...models.tracker import ApplicationCreate, ApplicationUpdate, STAGES
from ...core.database import get_db
from ..deps import get_current_user_id
import uuid

router = APIRouter(prefix="/tracker", tags=["tracker"])


@router.get("")
async def list_applications(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = (
        db.table("job_tracker")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("")
async def create_application(
    payload: ApplicationCreate,
    user_id: str = Depends(get_current_user_id),
):
    if payload.stage not in STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {STAGES}")
    db = get_db()
    data = payload.model_dump()
    for k in ("applied_date", "next_date"):
        if data[k]:
            data[k] = data[k].isoformat()
    result = db.table("job_tracker").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data,
    }).execute()
    return result.data[0]


@router.patch("/{app_id}")
async def update_application(
    app_id: str,
    payload: ApplicationUpdate,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "stage" in data and data["stage"] not in STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {STAGES}")
    for k in ("applied_date", "next_date"):
        if k in data and data[k]:
            data[k] = data[k].isoformat()
    result = (
        db.table("job_tracker")
        .update(data)
        .eq("id", app_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return result.data[0]


@router.delete("/{app_id}")
async def delete_application(app_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    db.table("job_tracker").delete().eq("id", app_id).eq("user_id", user_id).execute()
    return {"ok": True}
