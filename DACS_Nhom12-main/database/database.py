"""
database/database.py
────────────────────
Khởi tạo SQLite database, tạo bảng, và seed dữ liệu mặc định.
Engine kết nối tới database/app.db (tự tạo khi chạy lần đầu).
"""
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, User, ActivityLog

# ─── Config ──────────────────────────────────────────────────────────────────
DB_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "app.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite in multi-threaded FastAPI
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import bcrypt

# ─── Dependency injection helper ─────────────────────────────────────────────
def get_db():
    """FastAPI dependency: yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Password utilities ───────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    # Hash password with a randomly generated salt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False


# ─── Init & Seed ─────────────────────────────────────────────────────────────
def init_db():
    """
    Tạo tất cả bảng nếu chưa tồn tại và seed dữ liệu mặc định.
    Gọi hàm này khi startup FastAPI.
    """
    Base.metadata.create_all(bind=engine)
    print(f"[DB] SQLite initialized at {DB_PATH}")

    db = SessionLocal()
    try:
        _seed_default_users(db)
    finally:
        db.close()


def _seed_default_users(db):
    """Tạo tài khoản admin và user mặc định nếu chưa có."""
    default_accounts = [
        {"username": "admin", "email": "admin@amntdda.local",
         "password": "admin123", "role": "admin"},
        {"username": "user",  "email": "user@amntdda.local",
         "password": "user123",  "role": "user"},
    ]
    for acc in default_accounts:
        existing = db.query(User).filter(User.username == acc["username"]).first()
        if not existing:
            new_user = User(
                username      = acc["username"],
                email         = acc["email"],
                password_hash = hash_password(acc["password"]),
                role          = acc["role"],
                is_active     = True,
                created_at    = datetime.utcnow(),
            )
            db.add(new_user)
            db.flush()
            # Log the seed
            db.add(ActivityLog(
                user_id    = new_user.id,
                action     = "SYSTEM_SEED",
                detail     = f"Default {acc['role']} account created",
                ip_address = "127.0.0.1",
            ))
            print(f"[DB] Seeded account: {acc['username']} ({acc['role']})")
    db.commit()
