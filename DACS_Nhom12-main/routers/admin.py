"""
routers/admin.py
────────────────
FastAPI router dành riêng cho quản trị viên (role='admin'):
  GET /admin/users  — danh sách users + thống kê dự đoán
  GET /admin/logs   — activity logs với phân trang và filter
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.database import get_db
from database.models import User, ActivityLog, PredictionLog
from routers.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Trả về danh sách tất cả users kèm số lượng dự đoán đã thực hiện.
    Chỉ admin mới được truy cập.
    """
    try:
        users = db.query(User).all()
        result = []
        for u in users:
            pred_count = db.query(func.count(PredictionLog.id))\
                .filter(PredictionLog.user_id == u.id).scalar()
            d = u.to_dict()
            d["prediction_count"] = pred_count or 0
            result.append(d)
        return {"users": result, "total": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
async def list_logs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = Query(default=None),
):
    """
    Trả về activity_logs với phân trang và filter theo action.
    Chỉ admin mới được truy cập.
    """
    try:
        query = db.query(ActivityLog)
        if action:
            query = query.filter(ActivityLog.action == action.upper())

        total = query.count()
        logs  = query.order_by(ActivityLog.created_at.desc())\
                     .offset((page - 1) * limit)\
                     .limit(limit)\
                     .all()

        return {
            "logs":       [log.to_dict() for log in logs],
            "total":      total,
            "page":       page,
            "limit":      limit,
            "total_pages": max(1, (total + limit - 1) // limit),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard-stats")
async def dashboard_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        total_users = db.query(User).count()
        total_predictions = db.query(PredictionLog).count()
        
        # Stats based on prediction_type
        types = db.query(PredictionLog.prediction_type, func.count(PredictionLog.id))\
                  .group_by(PredictionLog.prediction_type).all()
        pred_types = {"single": 0, "random": 0, "many_to_many": 0}
        for t, c in types:
            if t == "single": pred_types["single"] = c
            elif t == "random": pred_types["random"] = c
            else: pred_types["many_to_many"] = c
            
        # Top drugs
        top_d = db.query(PredictionLog.drug_name, func.count(PredictionLog.id).label('c'))\
                  .filter(PredictionLog.drug_name != None)\
                  .group_by(PredictionLog.drug_name)\
                  .order_by(func.count(PredictionLog.id).desc())\
                  .limit(5).all()
                  
        top_di = db.query(PredictionLog.disease_name, func.count(PredictionLog.id).label('c'))\
                   .filter(PredictionLog.disease_name != None)\
                   .group_by(PredictionLog.disease_name)\
                   .order_by(func.count(PredictionLog.id).desc())\
                   .limit(5).all()
                   
        recent = db.query(PredictionLog).order_by(PredictionLog.created_at.desc()).limit(10).all()
        
        from datetime import timedelta
        return {
            "total_users": total_users,
            "total_drugs": 1525,
            "total_diseases": 1320,
            "total_proteins": 4755,
            "total_links": 22881,
            "total_predictions": total_predictions,
            "prediction_types": pred_types,
            "top_drugs": [{"name": r[0], "count": r[1]} for r in top_d],
            "top_diseases": [{"name": r[0], "count": r[1]} for r in top_di],
            "recent_predictions": [
                {
                    "query": r.drug_name or r.disease_name or "Mạng lưới ngẫu nhiên",
                    "target_type": "Thuốc" if r.drug_name else "Bệnh" if r.disease_name else "Ngẫu nhiên",
                    "method": "Đơn lẻ" if r.prediction_type == 'single' else "Ngẫu nhiên" if r.prediction_type == 'random' else "Đa mục tiêu",
                    "model": r.model_name or "amntdda",
                    "top_k": r.top_k,
                    "created_at": (r.created_at + timedelta(hours=7)).strftime("%H:%M %d/%m/%Y")
                } for r in recent
            ]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

