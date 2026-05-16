"""
database/models.py
──────────────────
SQLAlchemy ORM models cho hệ thống AMNTDDA.
Định nghĩa 3 bảng: users, prediction_logs, activity_logs.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50),  unique=True, nullable=False, index=True)
    email         = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(SAEnum("admin", "user", name="user_role"), default="user", nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login    = Column(DateTime, nullable=True)

    prediction_logs = relationship("PredictionLog", back_populates="user", cascade="all, delete-orphan")
    activity_logs   = relationship("ActivityLog",   back_populates="user", cascade="all, delete-orphan")

    def to_dict(self, include_sensitive=False):
        d = {
            "id":         self.id,
            "username":   self.username,
            "email":      self.email,
            "role":       self.role,
            "is_active":  self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
        if include_sensitive:
            d["password_hash"] = self.password_hash
        return d


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    drug_name       = Column(String(255), nullable=True)
    disease_name    = Column(String(255), nullable=True)
    dataset         = Column(String(10),  nullable=True)   # B / C / F
    top_k           = Column(Integer, nullable=True)
    result_count    = Column(Integer, nullable=True)
    prediction_type = Column(String(50), nullable=True)    # single / random / many-to-many
    model_name      = Column(String(50), nullable=True, default="amntdda")
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address      = Column(String(50), nullable=True)

    user = relationship("User", back_populates="prediction_logs")

    def to_dict(self):
        return {
            "id":              self.id,
            "user_id":         self.user_id,
            "drug_name":       self.drug_name,
            "disease_name":    self.disease_name,
            "dataset":         self.dataset,
            "top_k":           self.top_k,
            "result_count":    self.result_count,
            "prediction_type": self.prediction_type,
            "model":           self.model_name,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
            "ip_address":      self.ip_address,
        }


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for guests
    action     = Column(String(100), nullable=False)   # LOGIN / LOGOUT / PREDICT / VIEW_STATS …
    detail     = Column(Text, nullable=True)            # JSON string if needed
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="activity_logs")

    def to_dict(self):
        return {
            "id":         self.id,
            "user_id":    self.user_id,
            "action":     self.action,
            "detail":     self.detail,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
