from fastapi import APIRouter, HTTPException, Depends
from anthropic import APIStatusError
from ...services.ai_engine import career_advisor_reply
from ...models.schemas import ChatMessageRequest
from ...core.database import get_db
from ..deps import get_current_user_id
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations")
async def list_conversations(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = (
        db.table("chat_conversations")
        .select("id,title,created_at,updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/conversations")
async def create_conversation(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("chat_conversations").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": "New conversation",
    }).execute()
    return result.data[0]


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    db.table("chat_conversations").delete().eq("id", conv_id).eq("user_id", user_id).execute()
    return {"ok": True}


@router.get("/history")
async def get_chat_history(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    result = (
        db.table("chat_messages")
        .select("role,content,image_data,created_at")
        .eq("user_id", user_id)
        .eq("conversation_id", conversation_id)
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

    if not payload.conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")

    # Verify conversation belongs to user
    conv = db.table("chat_conversations").select("id").eq("id", payload.conversation_id).eq("user_id", user_id).execute()
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    persona_result = db.table("personas").select("*").eq("user_id", user_id).execute()
    if not persona_result.data:
        raise HTTPException(status_code=404, detail="No persona found — upload a CV first")
    persona = persona_result.data[0]

    history_result = (
        db.table("chat_messages")
        .select("role,content")
        .eq("user_id", user_id)
        .eq("conversation_id", payload.conversation_id)
        .order("created_at")
        .execute()
    )
    history = history_result.data

    try:
        reply = await career_advisor_reply(
            persona,
            history,
            payload.message,
            image_base64=payload.image_base64,
            image_media_type=payload.image_media_type,
        )
    except APIStatusError as e:
        logger.exception("Anthropic API error in career_advisor_reply")
        detail = getattr(e, "message", str(e))
        if isinstance(e.body, dict):
            detail = e.body.get("error", {}).get("message", detail)
        raise HTTPException(status_code=502, detail=f"AI service error: {detail}")

    # Auto-title conversation from first user message (truncated)
    if not history:
        title = payload.message[:60] + ("..." if len(payload.message) > 60 else "")
        db.table("chat_conversations").update({"title": title, "updated_at": "now()"}).eq("id", payload.conversation_id).execute()
    else:
        db.table("chat_conversations").update({"updated_at": "now()"}).eq("id", payload.conversation_id).execute()

    user_image_display = payload.image_base64 if payload.image_base64 else None

    db.table("chat_messages").insert([
        {
            "user_id": user_id,
            "role": "user",
            "content": payload.message,
            "conversation_id": payload.conversation_id,
            "image_data": user_image_display,
        },
        {
            "user_id": user_id,
            "role": "assistant",
            "content": reply,
            "conversation_id": payload.conversation_id,
        },
    ]).execute()

    return {"role": "assistant", "content": reply}
