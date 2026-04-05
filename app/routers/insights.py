"""
Vitalix — Insights router
POST /insights/ask → vraag stellen aan Claude
GET /insights → alle insights ophalen
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, Insight

logger = logging.getLogger(__name__)
router = APIRouter()


class AskRequest(BaseModel):
    question: str
    user_id: int


class InsightResponse(BaseModel):
    id: int
    created_at: datetime
    insight_type: str
    question: Optional[str]
    content: str
    is_read: bool

    class Config:
        from_attributes = True


@router.post("/ask", response_model=InsightResponse)
async def ask_question(data: AskRequest, db: Session = Depends(get_db)):
    """
    Stel een vraag aan Claude. Claude krijgt alle actuele gebruikersdata als context.
    Het antwoord wordt opgeslagen als insight.
    """
    from app.integrations.claude import ask_claude

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")

    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Vraag mag niet leeg zijn.")

    try:
        result = await ask_claude(db, user, data.question.strip())
    except Exception:
        logger.exception(f"Claude aanroep mislukt voor gebruiker {data.user_id}")
        raise HTTPException(
            status_code=502,
            detail="Claude is tijdelijk niet beschikbaar. Probeer het opnieuw."
        )

    insight = Insight(
        user_id=data.user_id,
        insight_type="question",
        question=data.question.strip(),
        content=result["content"],
        thinking=result.get("thinking"),
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)

    return insight


@router.get("/user/{user_id}", response_model=List[InsightResponse])
def get_insights(user_id: int, db: Session = Depends(get_db)):
    """Haalt alle inzichten op voor een gebruiker, nieuwste eerst."""
    return (
        db.query(Insight)
        .filter(Insight.user_id == user_id)
        .order_by(Insight.created_at.desc())
        .limit(50)
        .all()
    )
