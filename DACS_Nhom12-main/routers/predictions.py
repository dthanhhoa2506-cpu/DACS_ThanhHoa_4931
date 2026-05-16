"""
routers/predictions.py
──────────────────────
FastAPI router để log các lần dự đoán từ frontend:
  POST /predictions/log  — ghi nhận 1 lần dự đoán (guest hoặc user)
  GET  /predictions/my   — lịch sử dự đoán của user hiện tại
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import ActivityLog, PredictionLog, User
from routers.auth import get_current_user, _get_ip

router = APIRouter(prefix="/predictions", tags=["predictions"])


class PredictionLogRequest(BaseModel):
    drug:         Optional[str] = None
    disease:      Optional[str] = None
    dataset:      Optional[str] = None
    type:         Optional[str] = "single"
    top_k:        Optional[int] = 10
    result_count: Optional[int] = 0
    model:        Optional[str] = "amntdda"


@router.post("/log")
async def log_prediction(
    body: PredictionLogRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ghi nhận 1 lần dự đoán. Chấp nhận cả guest (user_id=None) và user đã login.
    Frontend gọi endpoint này sau mỗi lần predict thành công.
    """
    try:
        ip = _get_ip(request)
        user_id = current_user.id if current_user else None

        log = PredictionLog(
            user_id         = user_id,
            drug_name       = body.drug,
            disease_name    = body.disease,
            dataset         = body.dataset,
            top_k           = body.top_k,
            result_count    = body.result_count,
            prediction_type = body.type,
            model_name      = body.model,
            ip_address      = ip,
        )
        db.add(log)

        # Also write to activity log
        db.add(ActivityLog(
            user_id    = user_id,
            action     = "PREDICT",
            detail     = json.dumps({
                "drug": body.drug, "disease": body.disease,
                "dataset": body.dataset, "type": body.type,
                "model": body.model
            }),
            ip_address = ip,
        ))
        db.commit()
        return {"message": "Logged", "log_id": log.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class GenRequest(BaseModel):
    disease: str
    num_candidates: int = 6
    method: str = "Fragment Addition"

@router.post("/generate")
async def generate_molecules(req: GenRequest):
    """
    Simulate molecule generation based on target disease characteristics.
    In a real scenario, this would call a generative model like a VAE or Diffusion Model.
    """
    import random
    
    # Mock data for demonstration
    prefixes = ["AMN", "DDA", "GCL", "ATT"]
    # Real SMILES for varied structures
    sample_smiles = [
        "CC(=O)OC1=CC=CC=C1C(=O)O", "CC(=O)NC1=CC=C(O)C=C1", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C", "C1=CC(=C(C=C1[N+](=O)[O-])[N+](=O)[O-])O",
        "CC1=CC=C(C=C1)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F",
        "C1=CC=C(C=C1)C(=O)NC2=CC=CC=C2C(=O)O", "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O"
    ]
    
    results = []
    for i in range(req.num_candidates):
        name = f"{random.choice(prefixes)}-{random.randint(100, 999)}"
        smiles = random.choice(sample_smiles)
        qed = 0.5 + random.random() * 0.4
        sa = 1.5 + random.random() * 3.5
        
        # Register in global memory for single prediction
        from main import GENERATED_DRUGS
        GENERATED_DRUGS[name] = {"smiles": smiles, "target_disease": req.disease}
        
        results.append({
            "id": i + 1,
            "name": name,
            "smiles": smiles,
            "qed": round(qed, 3),
            "sa_score": round(sa, 2),
            "method": req.method,
            "rationale": f"Cấu trúc được tối ưu hóa dựa trên đặc trưng Attention của bệnh {req.disease}."
        })
        
    return {"results": results}

@router.get("/my")
async def my_predictions(

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    """Lịch sử dự đoán của user đang đăng nhập."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Cần đăng nhập")
    logs = (
        db.query(PredictionLog)
        .filter(PredictionLog.user_id == current_user.id)
        .order_by(PredictionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"logs": [l.to_dict() for l in logs]}
