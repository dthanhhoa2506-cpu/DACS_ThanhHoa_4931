"""
routers/auth.py
───────────────
FastAPI router xử lý xác thực người dùng:
  POST /auth/register  — đăng ký tài khoản mới
  POST /auth/login     — đăng nhập, trả JWT token
  GET  /auth/me        — xem thông tin user hiện tại
  POST /auth/logout    — ghi log đăng xuất

Dependencies:
  get_current_user()  — decode JWT từ Authorization header
  require_admin()     — chỉ cho phép role='admin'
"""
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, field_validator
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import config
from database.database import get_db, hash_password, verify_password
from database.models import User, ActivityLog, PredictionLog

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_min_length(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Username phải có ít nhất 3 ký tự")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password phải có ít nhất 6 ký tự")
        return v

    @field_validator("email")
    @classmethod
    def email_basic_validate(cls, v):
        v = v.strip()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Email không hợp lệ")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class PredictionLogRequest(BaseModel):
    drug: Optional[str] = None
    disease: Optional[str] = None
    dataset: Optional[str] = None
    type: Optional[str] = "single"
    top_k: Optional[int] = 10
    result_count: Optional[int] = 0


# ─── JWT Helpers ─────────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=config.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, config.jwt_secret, algorithms=[config.jwt_algorithm])
    except JWTError:
        return None


# ─── Auth Dependencies ────────────────────────────────────────────────────────
def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the User object if token is valid, else None (guest)."""
    if not token or token == "null" or token == "undefined":
        return None
    payload = decode_token(token)
    if not payload:
        return None
    username: str = payload.get("sub")
    if not username:
        return None
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    return user


def require_logged_in(user: Optional[User] = Depends(get_current_user)) -> User:
    """Raises 401 if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cần đăng nhập để thực hiện thao tác này",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(user: User = Depends(require_logged_in)) -> User:
    """Raises 403 if not admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản trị viên mới có quyền truy cập",
        )
    return user


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Đăng ký tài khoản mới."""
    try:
        # Check duplicates
        if db.query(User).filter(User.username == body.username).first():
            raise HTTPException(status_code=400, detail="Username đã tồn tại")
        if db.query(User).filter(User.email == body.email).first():
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")

        new_user = User(
            username      = body.username,
            email         = body.email,
            password_hash = hash_password(body.password),
            role          = "user",
            is_active     = True,
            created_at    = datetime.utcnow(),
        )
        db.add(new_user)
        db.flush()

        db.add(ActivityLog(
            user_id    = new_user.id,
            action     = "REGISTER",
            detail     = json.dumps({"username": body.username, "email": body.email}),
            ip_address = _get_ip(request),
        ))
        db.commit()

        return {"message": "Đăng ký thành công!", "user_id": new_user.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Đăng nhập và nhận JWT token."""
    try:
        user = db.query(User).filter(User.username == body.username).first()
        if not user or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Username hoặc password không đúng")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")

        # Update last login
        user.last_login = datetime.utcnow()

        # Log activity
        db.add(ActivityLog(
            user_id    = user.id,
            action     = "LOGIN",
            detail     = json.dumps({"username": user.username}),
            ip_address = _get_ip(request),
        ))
        db.commit()

        token = create_access_token({"sub": user.username, "role": user.role})
        return {
            "access_token": token,
            "token_type":   "bearer",
            "role":         user.role,
            "username":     user.username,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/me")
async def get_me(current_user: User = Depends(require_logged_in)):
    """Xem thông tin tài khoản hiện tại."""
    return current_user.to_dict()


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(require_logged_in),
    db: Session = Depends(get_db),
):
    """Ghi log đăng xuất (token vẫn hợp lệ đến khi hết hạn — stateless JWT)."""
    try:
        db.add(ActivityLog(
            user_id    = current_user.id,
            action     = "LOGOUT",
            detail     = json.dumps({"username": current_user.username}),
            ip_address = _get_ip(request),
        ))
        db.commit()
        return {"message": "Đã đăng xuất thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
