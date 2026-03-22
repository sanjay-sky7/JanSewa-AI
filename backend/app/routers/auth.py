"""Auth router — login, register, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.ward import Ward
from app.schemas.dashboard import (
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ProfileUpdateRequest,
    TokenOut,
    UserOut,
)
from app.utils.helpers import (
    create_access_token,
    hash_password,
    verify_password,
    get_current_user,
)

router = APIRouter()


async def _to_user_out(user: User, db: AsyncSession) -> UserOut:
    ward_number = None
    ward_name = None
    if user.ward_id:
        ward = await db.get(Ward, user.ward_id)
        if ward:
            ward_number = ward.ward_number
            ward_name = ward.ward_name

    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        department=user.department,
        ward_id=user.ward_id,
        ward_number=ward_number,
        ward_name=ward_name,
    )


class AuthMessageOut(BaseModel):
    message: str


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = (body.email or "").strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenOut(
        access_token=token,
        user=await _to_user_out(user, db),
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = (body.email or "").strip().lower()

    # Check unique email
    existing = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    resolved_ward_id = None
    if body.ward_id is not None:
        ward_result = await db.execute(
            select(Ward).where((Ward.id == body.ward_id) | (Ward.ward_number == body.ward_id))
        )
        ward = ward_result.scalar_one_or_none()
        resolved_ward_id = ward.id if ward else None

    user = User(
        name=body.name,
        email=normalized_email,
        password_hash=hash_password(body.password),
        role=body.role,
        department=body.department,
        ward_id=resolved_ward_id,
        phone=body.phone,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return await _to_user_out(user, db)


@router.post("/forgot-password", response_model=AuthMessageOut)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = str(body.email or "").strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()

    if user:
        user.password_hash = hash_password(body.new_password)
        await db.flush()

    return AuthMessageOut(message="If the account exists, the password has been reset.")


@router.get("/me", response_model=UserOut)
async def me(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await _to_user_out(user, db)


@router.put("/me", response_model=UserOut)
async def update_me(body: ProfileUpdateRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if body.name is not None:
        user.name = body.name.strip() or user.name
    if body.phone is not None:
        user.phone = body.phone.strip() or None
    if body.department is not None:
        user.department = body.department.strip() or None
    if body.ward_id is not None:
        ward_result = await db.execute(
            select(Ward).where((Ward.id == body.ward_id) | (Ward.ward_number == body.ward_id))
        )
        ward = ward_result.scalar_one_or_none()
        user.ward_id = ward.id if ward else None

    return await _to_user_out(user, db)


@router.get("/workers", response_model=list[UserOut])
async def list_workers(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("LEADER", "DEPARTMENT_HEAD", "ADMIN"):
        raise HTTPException(status_code=403, detail="Only leadership roles can view workers")

    result = await db.execute(
        select(User)
        .where(User.role.in_(["WORKER", "OFFICER", "ENGINEER"]))
        .order_by(User.name.asc())
    )
    workers = result.scalars().all()
    return [await _to_user_out(worker, db) for worker in workers]
