from fastapi import APIRouter, HTTPException
from ...models.schemas import UserRegister, UserLogin, TokenResponse
from ...core.database import get_db
from ...core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    db = get_db()
    existing = db.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(payload.password)
    result = db.table("users").insert({
        "email": payload.email,
        "full_name": payload.full_name,
        "password_hash": hashed,
    }).execute()

    user_id = result.data[0]["id"]
    return TokenResponse(access_token=create_access_token(user_id))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    result = db = get_db()
    result = db.table("users").select("id,password_hash").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(access_token=create_access_token(user["id"]))
