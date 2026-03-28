"""
Vitalix — Health router
Endpoints voor gebruikers, dashboard, lab-invoer en interventies.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models import User, BloodPressureMeasurement, HRVReading, LabMarker, Baseline, Intervention, Alert
from app.schemas import (
    UserCreate, UserResponse,
    LabMarkerCreate, LabMarkerResponse,
    InterventionCreate, InterventionResponse,
    DashboardResponse, MarkerSummary, AlertResponse,
    BaselineResponse
)
from app.baseline import recalculate_baseline_for_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Gebruikers ─────────────────────────────────────────────────────────────────

@router.post("/users", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Maak een nieuw gebruikersaccount aan."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "Dit e-mailadres is al in gebruik."}
        )
    user = User(**user_data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    """Geeft alle gebruikers terug. Sprint 0: Peter en partner."""
    return db.query(User).all()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Geeft één gebruiker terug op basis van ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )
    return user


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get("/dashboard/{user_id}", response_model=DashboardResponse)
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    """
    Persoonlijk dashboard: laatste metingen, persoonlijke baselines en trends.
    Dit is het hoofdscherm van de app.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    return DashboardResponse(
        user_id=user_id,
        user_name=user.name,
        blood_pressure=_build_bp_summary(db, user_id),
        hrv=_build_hrv_summary(db, user_id),
        deep_sleep=_build_deep_sleep_summary(db, user_id),
        unread_alerts=db.query(func.count(Alert.id)).filter(
            Alert.user_id == user_id, Alert.is_read == False
        ).scalar() or 0,
        active_interventions=db.query(func.count(Intervention.id)).filter(
            Intervention.user_id == user_id, Intervention.status == "active"
        ).scalar() or 0,
    )


def _build_bp_summary(db: Session, user_id: int) -> MarkerSummary:
    """Bouwt de bloeddruksamenvatting voor het dashboard."""
    latest = db.query(BloodPressureMeasurement).filter(
        BloodPressureMeasurement.user_id == user_id
    ).order_by(BloodPressureMeasurement.measured_at.desc()).first()

    baseline = db.query(Baseline).filter(
        Baseline.user_id == user_id,
        Baseline.marker_name == "systolic"
    ).first()

    return MarkerSummary(
        latest_value=latest.systolic if latest else None,
        latest_unit="mmHg",
        latest_measured_at=latest.measured_at if latest else None,
        baseline_value=baseline.baseline_value if baseline else None,
        is_stable=baseline.is_stable if baseline else False,
        trend=_calculate_trend(db, user_id, "systolic"),
    )


def _build_hrv_summary(db: Session, user_id: int) -> MarkerSummary:
    """Bouwt de HRV-samenvatting voor het dashboard."""
    latest = db.query(HRVReading).filter(
        HRVReading.user_id == user_id
    ).order_by(HRVReading.date.desc()).first()

    baseline = db.query(Baseline).filter(
        Baseline.user_id == user_id,
        Baseline.marker_name == "hrv_rmssd"
    ).first()

    return MarkerSummary(
        latest_value=latest.rmssd if latest else None,
        latest_unit="ms",
        latest_measured_at=datetime.combine(latest.date, datetime.min.time()) if latest else None,
        baseline_value=baseline.baseline_value if baseline else None,
        is_stable=baseline.is_stable if baseline else False,
        trend=_calculate_trend(db, user_id, "hrv_rmssd"),
    )


def _build_deep_sleep_summary(db: Session, user_id: int) -> MarkerSummary:
    """Bouwt de diepe slaap-samenvatting voor het dashboard."""
    latest = db.query(HRVReading).filter(
        HRVReading.user_id == user_id
    ).order_by(HRVReading.date.desc()).first()

    baseline = db.query(Baseline).filter(
        Baseline.user_id == user_id,
        Baseline.marker_name == "deep_sleep_minutes"
    ).first()

    return MarkerSummary(
        latest_value=latest.deep_sleep_minutes if latest else None,
        latest_unit="minuten",
        latest_measured_at=datetime.combine(latest.date, datetime.min.time()) if latest else None,
        baseline_value=baseline.baseline_value if baseline else None,
        is_stable=baseline.is_stable if baseline else False,
        trend=_calculate_trend(db, user_id, "deep_sleep_minutes"),
    )


def _calculate_trend(db: Session, user_id: int, marker_name: str) -> Optional[str]:
    """
    Vergelijkt het 7-daags gemiddelde met het 30-daags gemiddelde.
    Geeft 'up', 'down' of 'stable' terug. None als onvoldoende data.
    """
    baseline = db.query(Baseline).filter(
        Baseline.user_id == user_id,
        Baseline.marker_name == marker_name
    ).first()

    if not baseline or not baseline.is_stable:
        return None

    return "stable"  # Sprint 0: verfijnen in Sprint 1 met echte trend-berekening


# ── Lab markers ────────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/lab", response_model=LabMarkerResponse)
def add_lab_marker(
    user_id: int,
    marker_data: LabMarkerCreate,
    db: Session = Depends(get_db)
):
    """Voeg een handmatig ingevoerde labwaarde toe (bloed, speeksel, urine, ontlasting)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    marker = LabMarker(user_id=user_id, **marker_data.model_dump())
    db.add(marker)
    db.commit()
    db.refresh(marker)

    recalculate_baseline_for_user(db, user_id, marker_data.marker_name)

    return marker


@router.get("/users/{user_id}/lab", response_model=List[LabMarkerResponse])
def get_lab_markers(
    user_id: int,
    test_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """
    Geeft ingevoerde labwaarden terug voor deze gebruiker, gepagineerd.

    Args:
        test_type: Filter op testtype ('blood', 'saliva', 'urine', 'stool'). Optioneel.
        page: Paginanummer (standaard 1).
        per_page: Resultaten per pagina (standaard 20).
    """
    query = db.query(LabMarker).filter(LabMarker.user_id == user_id)
    if test_type:
        query = query.filter(LabMarker.test_type == test_type)
    offset = (page - 1) * per_page
    return query.order_by(LabMarker.measured_at.desc()).offset(offset).limit(per_page).all()


# ── Interventies ───────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/interventions", response_model=InterventionResponse)
def start_intervention(
    user_id: int,
    intervention_data: InterventionCreate,
    db: Session = Depends(get_db)
):
    """
    Start een nieuwe interventie en maakt een baseline-snapshot op T=0.
    Dit snapshot wordt na 8-12 weken vergeleken om effect te meten.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail={"code": "USER_NOT_FOUND", "message": "Gebruiker niet gevonden."}
        )

    # Baseline snapshot: sla alle actuele baselines op als startpunt
    baselines = db.query(Baseline).filter(Baseline.user_id == user_id).all()
    snapshot = {
        b.marker_name: {
            "baseline_value": b.baseline_value,
            "data_points": b.data_points,
            "is_stable": b.is_stable,
        }
        for b in baselines
    }

    intervention = Intervention(
        user_id=user_id,
        baseline_snapshot=snapshot,
        **intervention_data.model_dump()
    )
    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    return intervention


@router.get("/users/{user_id}/interventions", response_model=List[InterventionResponse])
def get_interventions(
    user_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Geeft alle interventies terug voor deze gebruiker."""
    query = db.query(Intervention).filter(Intervention.user_id == user_id)
    if status:
        query = query.filter(Intervention.status == status)
    return query.order_by(Intervention.started_at.desc()).all()


# ── Alerts ─────────────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/alerts", response_model=List[AlertResponse])
def get_alerts(
    user_id: int,
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    """Geeft alerts terug voor deze gebruiker."""
    query = db.query(Alert).filter(Alert.user_id == user_id)
    if unread_only:
        query = query.filter(Alert.is_read == False)
    return query.order_by(Alert.created_at.desc()).limit(50).all()


@router.patch("/users/{user_id}/alerts/{alert_id}/read")
def mark_alert_read(
    user_id: int,
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Markeer een alert als gelezen."""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user_id
    ).first()
    if not alert:
        raise HTTPException(
            status_code=404,
            detail={"code": "ALERT_NOT_FOUND", "message": "Alert niet gevonden."}
        )
    alert.is_read = True
    db.commit()
    return {"status": "gelezen"}
