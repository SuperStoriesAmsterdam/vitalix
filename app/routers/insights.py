"""
Vitalix — Insights router
Vraag stellen aan Claude, mappen beheren, titels aanpassen.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, Insight, InsightFolder

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    user_id: int
    folder_id: Optional[int] = None


class FolderCreate(BaseModel):
    user_id: int
    name: str


class FolderRename(BaseModel):
    name: str


class TitleUpdate(BaseModel):
    title: str


class MoveToFolder(BaseModel):
    folder_id: Optional[int]  # None = geen map


class FolderResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    insight_count: int = 0

    class Config:
        from_attributes = True


class InsightResponse(BaseModel):
    id: int
    created_at: datetime
    insight_type: str
    question: Optional[str]
    title: Optional[str]
    content: str
    is_read: bool
    folder_id: Optional[int]

    class Config:
        from_attributes = True


# ── Folders ────────────────────────────────────────────────────────────────────

@router.post("/folders", response_model=FolderResponse)
def create_folder(data: FolderCreate, db: Session = Depends(get_db)):
    """Maak een nieuwe map aan."""
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    folder = InsightFolder(user_id=data.user_id, name=data.name.strip())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    count = db.query(Insight).filter(Insight.folder_id == folder.id).count()
    result = FolderResponse(id=folder.id, name=folder.name, created_at=folder.created_at, insight_count=count)
    return result


@router.get("/folders/{user_id}", response_model=List[FolderResponse])
def get_folders(user_id: int, db: Session = Depends(get_db)):
    """Haalt alle mappen op voor een gebruiker, inclusief aantal vragen per map."""
    folders = db.query(InsightFolder).filter(InsightFolder.user_id == user_id).order_by(InsightFolder.created_at.asc()).all()
    result = []
    for f in folders:
        count = db.query(Insight).filter(Insight.folder_id == f.id).count()
        result.append(FolderResponse(id=f.id, name=f.name, created_at=f.created_at, insight_count=count))
    return result


@router.patch("/folders/{folder_id}/rename", response_model=FolderResponse)
def rename_folder(folder_id: int, data: FolderRename, db: Session = Depends(get_db)):
    """Hernoem een map."""
    folder = db.query(InsightFolder).filter(InsightFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Map niet gevonden.")
    folder.name = data.name.strip()
    db.commit()
    db.refresh(folder)
    count = db.query(Insight).filter(Insight.folder_id == folder.id).count()
    return FolderResponse(id=folder.id, name=folder.name, created_at=folder.created_at, insight_count=count)


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    """Verwijder een map. Vragen in de map worden niet verwijderd — ze komen in 'Geen map'."""
    folder = db.query(InsightFolder).filter(InsightFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Map niet gevonden.")
    # Ontkoppel vragen van de map
    db.query(Insight).filter(Insight.folder_id == folder_id).update({"folder_id": None})
    db.delete(folder)
    db.commit()
    return {"status": "verwijderd"}


# ── Insights ───────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=InsightResponse)
async def ask_question(data: AskRequest, db: Session = Depends(get_db)):
    """Stel een vraag aan Claude. Antwoord wordt opgeslagen als insight."""
    from app.integrations.claude import ask_claude

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")

    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Vraag mag niet leeg zijn.")

    # Valideer folder_id als opgegeven
    if data.folder_id:
        folder = db.query(InsightFolder).filter(InsightFolder.id == data.folder_id, InsightFolder.user_id == data.user_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Map niet gevonden.")

    try:
        result = await ask_claude(db, user, data.question.strip())
    except Exception:
        logger.exception(f"Claude aanroep mislukt voor gebruiker {data.user_id}")
        raise HTTPException(status_code=502, detail="Claude is tijdelijk niet beschikbaar. Probeer het opnieuw.")

    # Titel = eerste 60 tekens van de vraag
    auto_title = data.question.strip()[:60] + ("..." if len(data.question.strip()) > 60 else "")

    insight = Insight(
        user_id=data.user_id,
        insight_type="question",
        question=data.question.strip(),
        title=auto_title,
        content=result["content"],
        thinking=result.get("thinking"),
        folder_id=data.folder_id,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


@router.get("/user/{user_id}", response_model=List[InsightResponse])
def get_insights(user_id: int, folder_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Haalt insights op. Optioneel gefilterd op map. folder_id=0 = geen map."""
    query = db.query(Insight).filter(Insight.user_id == user_id)
    if folder_id == 0:
        query = query.filter(Insight.folder_id == None)
    elif folder_id is not None:
        query = query.filter(Insight.folder_id == folder_id)
    return query.order_by(Insight.created_at.desc()).limit(100).all()


@router.patch("/{insight_id}/title", response_model=InsightResponse)
def update_title(insight_id: int, data: TitleUpdate, db: Session = Depends(get_db)):
    """Pas de titel van een inzicht aan."""
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Inzicht niet gevonden.")
    insight.title = data.title.strip()
    db.commit()
    db.refresh(insight)
    return insight


@router.patch("/{insight_id}/move", response_model=InsightResponse)
def move_insight(insight_id: int, data: MoveToFolder, db: Session = Depends(get_db)):
    """Verplaats een inzicht naar een andere map (of geen map)."""
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Inzicht niet gevonden.")
    insight.folder_id = data.folder_id
    db.commit()
    db.refresh(insight)
    return insight
