"""
Vitalix — Baseline Calculator
Berekent de persoonlijke referentiewaarde per marker per gebruiker.

Kernprincipe: niet de populatienorm, maar jouw eigen biologische gemiddelde.
Een afwijking is alleen relevant als die afwijkt van jouw eigen patroon.

Stabiliteitdrempels per marker (minimum datapunten voor een betrouwbare baseline):
- Bloeddruk (dagelijks meetbaar): 10 metingen
- HRV (dagelijks via Oura): 14 metingen (twee weken)
- Bloedmarkers (maandelijks): 3 metingen (drie maanden)
"""
import logging
import math
from sqlalchemy.orm import Session
from app.models import BloodPressureMeasurement, HRVReading, LabMarker, Baseline

logger = logging.getLogger(__name__)

# Minimum aantal metingen per marker voor een stabiele baseline
STABILITY_THRESHOLDS = {
    "systolic": 10,
    "diastolic": 10,
    "hrv_rmssd": 14,
    "deep_sleep_minutes": 14,
    "default": 10,
}


def recalculate_baseline_for_user(
    db: Session,
    user_id: int,
    marker_name: str
) -> None:
    """
    Herberekent de persoonlijke baseline voor één marker van één gebruiker.
    Maakt een nieuwe Baseline-rij aan als die nog niet bestaat, anders updaten.

    Args:
        db: Actieve database-sessie.
        user_id: ID van de gebruiker.
        marker_name: Naam van de marker (e.g. 'systolic', 'hrv_rmssd').
    """
    values = _get_values_for_marker(db, user_id, marker_name)

    if not values:
        return

    average = sum(values) / len(values)
    std_dev = _calculate_std_deviation(values, average)
    threshold = STABILITY_THRESHOLDS.get(marker_name, STABILITY_THRESHOLDS["default"])
    is_stable = len(values) >= threshold

    existing_baseline = db.query(Baseline).filter(
        Baseline.user_id == user_id,
        Baseline.marker_name == marker_name
    ).first()

    if existing_baseline:
        existing_baseline.baseline_value = average
        existing_baseline.std_deviation = std_dev
        existing_baseline.data_points = len(values)
        existing_baseline.is_stable = is_stable
        existing_baseline.stability_threshold = threshold
    else:
        db.add(Baseline(
            user_id=user_id,
            marker_name=marker_name,
            baseline_value=average,
            std_deviation=std_dev,
            data_points=len(values),
            is_stable=is_stable,
            stability_threshold=threshold,
        ))

    db.commit()
    logger.info(
        f"Baseline bijgewerkt: gebruiker {user_id}, marker '{marker_name}', "
        f"waarde {average:.2f}, stabiel: {is_stable}"
    )


def _get_values_for_marker(
    db: Session,
    user_id: int,
    marker_name: str
) -> list[float]:
    """
    Haalt alle beschikbare meetwaarden op voor de opgegeven marker.
    Ondersteunt wearable-markers (bloeddruk, HRV) en lab-markers.

    Returns:
        Lijst van numerieke waarden, gesorteerd van oud naar nieuw.
    """
    if marker_name == "systolic":
        rows = db.query(BloodPressureMeasurement.systolic).filter(
            BloodPressureMeasurement.user_id == user_id
        ).order_by(BloodPressureMeasurement.measured_at).all()
        return [row.systolic for row in rows if row.systolic is not None]

    if marker_name == "diastolic":
        rows = db.query(BloodPressureMeasurement.diastolic).filter(
            BloodPressureMeasurement.user_id == user_id
        ).order_by(BloodPressureMeasurement.measured_at).all()
        return [row.diastolic for row in rows if row.diastolic is not None]

    if marker_name == "hrv_rmssd":
        rows = db.query(HRVReading.rmssd).filter(
            HRVReading.user_id == user_id
        ).order_by(HRVReading.date).all()
        return [row.rmssd for row in rows if row.rmssd is not None]

    if marker_name == "deep_sleep_minutes":
        rows = db.query(HRVReading.deep_sleep_minutes).filter(
            HRVReading.user_id == user_id
        ).order_by(HRVReading.date).all()
        return [row.deep_sleep_minutes for row in rows if row.deep_sleep_minutes is not None]

    # Lab markers (bloed, speeksel, urine)
    rows = db.query(LabMarker.value).filter(
        LabMarker.user_id == user_id,
        LabMarker.marker_name == marker_name
    ).order_by(LabMarker.measured_at).all()
    return [row.value for row in rows if row.value is not None]


def _calculate_std_deviation(values: list[float], average: float) -> float:
    """
    Berekent de standaardafwijking van een lijst waarden.
    Gebruikt voor het detecteren van significante afwijkingen van de baseline.

    Returns:
        Standaardafwijking als float.
    """
    if len(values) < 2:
        return 0.0
    variance = sum((value - average) ** 2 for value in values) / len(values)
    return math.sqrt(variance)
