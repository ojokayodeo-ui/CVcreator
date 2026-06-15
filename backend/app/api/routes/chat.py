from fastapi import APIRouter, HTTPException, Depends
from ...services.ai_engine import career_advisor_reply
from ...models.schemas import ChatMessageRequest
from ...core.database import get_db
from ..deps import get_current_user_id

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history")
async def get_chat_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = (
        db.table("chat_messages")
        .select("role,content,created_at")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/message")
async def send_chat_message(
    payload: ChatMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()

    persona_result = db.table("personas").select("*").eq("user_id", user_id).execute()
    if not persona_result.data:
        raise HTTPException(status_code=404, detail="No persona found — upload a CV first")
    persona = persona_result.data[0]

    history_result = (
        db.table("chat_messages")
        .select("role,content")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    history = history_result.data

    reply = await career_advisor_reply(persona, history, payload.message)

    db.table("chat_messages").insert([
        {"user_id": user_id, "role": "user", "content": payload.message},
        {"user_id": user_id, "role": "assistant", "content": reply},
    ]).execute()

    return {"role": "assistant", "content": reply}
