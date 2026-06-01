from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.auth import hash_password, verify_password, create_token
from app.schemas import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user.email, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, region_code=user.region_code, email=user.email)


@router.post("/signup", response_model=TokenResponse)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    email = req.email.lower().strip()
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(req.password),
        role="customer",
        region_code=(req.region_code or "US").upper(),
        first_name=req.first_name,
        last_name=req.last_name,
    )
    db.add(user)
    await db.commit()
    token = create_token({"sub": user.email, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, region_code=user.region_code, email=user.email)
