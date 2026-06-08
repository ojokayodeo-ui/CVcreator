from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from ...core.config import get_settings
from ...core.database import get_db
from ..deps import get_current_user_id
from ...services.drive_service import SCOPES

router = APIRouter(prefix="/drive", tags=["drive"])


def _build_flow() -> Flow:
    s = get_settings()
    return Flow.from_client_config(
        client_config={
            "web": {
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "redirect_uris": [s.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=s.google_redirect_uri,
    )


@router.get("/auth")
async def drive_auth(user_id: str = Depends(get_current_user_id)):
    """Generate Google OAuth URL."""
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=user_id,
        prompt="consent",
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def drive_callback(request: Request):
    """Handle Google OAuth callback and store tokens."""
    code = request.query_params.get("code")
    user_id = request.query_params.get("state")
    if not code or not user_id:
        raise HTTPException(status_code=400, detail="Missing code or state")

    flow = _build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    db = get_db()
    token_data = {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
    }

    existing = db.table("drive_tokens").select("id").eq("user_id", user_id).execute()
    if existing.data:
        db.table("drive_tokens").update({"tokens": token_data}).eq("user_id", user_id).execute()
    else:
        db.table("drive_tokens").insert({"user_id": user_id, "tokens": token_data}).execute()

    s = get_settings()
    return RedirectResponse(url=f"{s.frontend_url}/settings?drive=connected")


@router.get("/status")
async def drive_status(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("drive_tokens").select("id").eq("user_id", user_id).execute()
    return {"connected": bool(result.data)}
