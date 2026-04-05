"""
Vitalix — Pydantic schemas
Request- en response-modellen voor alle API endpoints.
Gescheiden van SQLAlchemy modellen (models.py).
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class TestType(str, Enum):
    """Typen laboratoriumonderzoek die handmatig kunnen worden ingevoerd."""
    blood = "blood"
    saliva = "saliva"
    urine = "urine"
    stool = "stool"


class InterventionType(str, Enum):
    """Categorieën van interventies die gebruikers kunnen loggen."""
    probiotic = "probiotic"
    supplement = "supplement"
    sleep = "sleep"
    diet = "diet"
    hrt = "hrt"
    stress = "stress"
    other = "other"


class InterventionStatus(str, Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class AlertSeverity(str, Enum):
    info = "info"
    orange = "orange"
    red = "red"


# ── User ───────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Aanmaken van een nieuw gebruikersaccount."""
    name: str
    email: EmailStr
    date_of_birth: Optional[date] = None
    sex: Optional[str] = None  # 'male' of 'female'


class UserResponse(BaseModel):
    """Gebruikersdata die de API teruggeeft."""
    id: int
    name: str
    email: str
    date_of_birth: Optional[date]
    sex: Optional[str]
    health_profile: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Blood Pressure ─────────────────────────────────────────────────────────────

class BloodPressureResponse(BaseModel):
    """Bloeddrukmeting zoals teruggestuurd door de API."""
    id: int
    measured_at: datetime
    systolic: int
    diastolic: int
    heart_rate: Optional[int]
    source: str

    class Config:
        from_attributes = True


# ── HRV / Polar ────────────────────────────────────────────────────────────────

class HRVReadingResponse(BaseModel):
    """HRV en slaapdata van de Polar Loop zoals teruggestuurd door de API."""
    id: int
    date: date
    rmssd: Optional[float]
    ans_charge: Optional[float]
    deep_sleep_minutes: Optional[int]
    rem_sleep_minutes: Optional[int]
    sleep_efficiency: Optional[float]
    sleep_latency_minutes: Optional[int]
    sleep_score: Optional[int]

    class Config:
        from_attributes = True


# ── Lab Markers ────────────────────────────────────────────────────────────────

class LabMarkerCreate(BaseModel):
    """Handmatige invoer van één labwaarde."""
    measured_at: datetime
    test_type: TestType
    marker_name: str   # e.g. 'hscrp', 'tsh', 'cortisol_morning'
    value: float
    unit: str          # e.g. 'mg/L', 'mIU/L'


class LabMarkerResponse(BaseModel):
    """Labwaarde zoals teruggestuurd door de API."""
    id: int
    measured_at: datetime
    test_type: str
    marker_name: str
    value: float
    unit: str
    source: str

    class Config:
        from_attributes = True


# ── Baseline ───────────────────────────────────────────────────────────────────

class BaselineResponse(BaseModel):
    """Persoonlijke referentiewaarde voor één marker."""
    marker_name: str
    baseline_value: float
    std_deviation: Optional[float]
    data_points: int
    is_stable: bool
    stability_threshold: int
    calculated_at: datetime

    class Config:
        from_attributes = True


# ── Intervention ───────────────────────────────────────────────────────────────

class InterventionCreate(BaseModel):
    """Aanmaken van een nieuwe interventie."""
    name: str
    intervention_type: InterventionType
    started_at: datetime
    notes: Optional[str] = None


class InterventionResponse(BaseModel):
    """Interventie zoals teruggestuurd door de API."""
    id: int
    name: str
    intervention_type: str
    started_at: datetime
    status: str
    notes: Optional[str]

    class Config:
        from_attributes = True


# ── Dashboard ──────────────────────────────────────────────────────────────────

class MarkerSummary(BaseModel):
    """Samenvatting van één marker op het dashboard."""
    latest_value: Optional[float]
    latest_unit: Optional[str]
    latest_measured_at: Optional[datetime]
    baseline_value: Optional[float]
    is_stable: bool
    trend: Optional[str]  # 'up', 'down', 'stable', None als onvoldoende data


class DashboardResponse(BaseModel):
    """Volledig persoonlijk dashboard voor één gebruiker."""
    user_id: int
    user_name: str
    blood_pressure: MarkerSummary
    hrv: MarkerSummary
    deep_sleep: MarkerSummary
    unread_alerts: int
    active_interventions: int


# ── Alerts ─────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    """Alert zoals teruggestuurd door de API."""
    id: int
    created_at: datetime
    alert_type: str
    severity: str
    message: str
    is_read: bool

    class Config:
        from_attributes = True
