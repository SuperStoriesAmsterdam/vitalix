"""
Vitalix — SQLAlchemy modellen
Alle database-entiteiten voor Sprint 0.
Zie PRD.md sectie 3 voor de volledige uitleg per model.
"""
from sqlalchemy import (
    Column, Integer, Float, String, Boolean,
    DateTime, Date, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    """
    Gebruikersprofiel. Sprint 0: twee gebruikers — Peter en partner.
    sex bepaalt welke markers relevant zijn (vrouwspecifieke markers bij 'female').
    health_profile bevat context: kankerhistorie, cardiovasculair risico, cyclusinformatie.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    date_of_birth = Column(Date, nullable=True)
    sex = Column(String, nullable=True)  # 'male' of 'female'
    health_profile = Column(JSON, nullable=True)  # vrije context per gebruiker
    withings_access_token = Column(String, nullable=True)
    withings_refresh_token = Column(String, nullable=True)
    oura_access_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    blood_pressure_measurements = relationship(
        "BloodPressureMeasurement", back_populates="user"
    )
    hrv_readings = relationship("HRVReading", back_populates="user")
    lab_markers = relationship("LabMarker", back_populates="user")
    baselines = relationship("Baseline", back_populates="user")
    interventions = relationship("Intervention", back_populates="user")
    alerts = relationship("Alert", back_populates="user")


class BloodPressureMeasurement(Base):
    """
    Bloeddrukmetingen van de Withings BPM Core.
    Systolisch, diastolisch en hartslag per meting.
    """
    __tablename__ = "blood_pressure_measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    measured_at = Column(DateTime, nullable=False, index=True)
    systolic = Column(Integer, nullable=False)   # mmHg
    diastolic = Column(Integer, nullable=False)  # mmHg
    heart_rate = Column(Integer, nullable=True)  # bpm
    source = Column(String, default="withings")  # 'withings' of 'manual'

    user = relationship("User", back_populates="blood_pressure_measurements")


class HRVReading(Base):
    """
    Dagelijkse HRV en slaapdata van de Oura Ring.
    Één rij per dag per gebruiker.
    """
    __tablename__ = "hrv_readings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    rmssd = Column(Float, nullable=True)                  # HRV in ms
    deep_sleep_minutes = Column(Integer, nullable=True)
    rem_sleep_minutes = Column(Integer, nullable=True)
    light_sleep_minutes = Column(Integer, nullable=True)
    sleep_efficiency = Column(Float, nullable=True)        # 0-100%
    sleep_latency_minutes = Column(Integer, nullable=True) # minuten tot inslapen
    temperature_delta = Column(Float, nullable=True)       # afwijking van persoonlijke norm
    readiness_score = Column(Integer, nullable=True)       # Oura score 0-100
    source = Column(String, default="oura")

    user = relationship("User", back_populates="hrv_readings")


class LabMarker(Base):
    """
    Handmatig ingevoerde labwaarden: bloed, speeksel, urine, ontlasting.
    Elke rij is één marker op één tijdstip.
    marker_name gebruikt gestandaardiseerde codes (zie schemas.py voor geldige waarden).
    """
    __tablename__ = "lab_markers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    measured_at = Column(DateTime, nullable=False, index=True)
    test_type = Column(String, nullable=False)   # 'blood', 'saliva', 'urine', 'stool'
    marker_name = Column(String, nullable=False, index=True)  # e.g. 'hscrp', 'tsh'
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)        # e.g. 'mg/L', 'mIU/L'
    source = Column(String, default="manual")    # 'manual' of 'pdf_ocr' (toekomstig)

    user = relationship("User", back_populates="lab_markers")


class Baseline(Base):
    """
    Persoonlijke referentiewaarde per marker per gebruiker.
    Wordt herberekend na elke nieuwe meting.
    is_stable wordt True zodra data_points >= stability_threshold.
    """
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    marker_name = Column(String, nullable=False, index=True)
    baseline_value = Column(Float, nullable=False)
    std_deviation = Column(Float, nullable=True)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    data_points = Column(Integer, default=0)
    is_stable = Column(Boolean, default=False)
    stability_threshold = Column(Integer, default=10)  # configureerbaar per marker

    user = relationship("User", back_populates="baselines")


class Intervention(Base):
    """
    Interventie-feedbackloop. Gebruiker logt wat hij start (probiotica, supplement, etc.).
    Het systeem maakt een baseline_snapshot op T=0 en vergelijkt na 8-12 weken.
    """
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)         # e.g. "Ortho-flor probiotica"
    intervention_type = Column(String, nullable=False)  # zie InterventionType in schemas
    started_at = Column(DateTime, nullable=False)
    baseline_snapshot = Column(JSON, nullable=True)  # alle actieve markers op T=0
    status = Column(String, default="active")     # 'active', 'completed', 'abandoned'
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="interventions")


class Alert(Base):
    """
    Signalen die de alert-engine aanmaakt wanneer markers afwijken van de persoonlijke baseline.
    Wordt ook gebruikt voor interventie-checkpoints (4/8/12 weken).
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type = Column(String, nullable=False)   # 'hrv_suppressed', 'bp_elevated', etc.
    severity = Column(String, nullable=False)      # 'info', 'orange', 'red'
    marker_names = Column(JSON, nullable=True)     # welke markers triggeren dit
    message = Column(Text, nullable=False)         # leesbare tekst voor gebruiker
    is_read = Column(Boolean, default=False)

    user = relationship("User", back_populates="alerts")
