from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def _resolve_user(token: Optional[str], db: AsyncSession, required_role: Optional[str] = None):
    from app.models import User
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        role: str = payload.get("role", "customer")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")
    if required_role and role != required_role:
        raise HTTPException(403, f"Requires {required_role} role")
    return user


async def get_customer(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    return await _resolve_user(token, db, required_role="customer")


async def get_admin(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    return await _resolve_user(token, db, required_role="admin")


async def get_any_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    return await _resolve_user(token, db)
