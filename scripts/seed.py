"""
Vitalix — seed script
Maakt testgebruikers + realistische demodata aan voor lokale ontwikkeling.

Gebruik:
    python scripts/seed.py

Wat het doet:
  1. Maakt drie gebruikers aan: Peter, Partner (Maya), Maddy
  2. Voegt 30 dagen bloeddrukmetingen toe voor Peter
  3. Voegt 30 dagen HRV/slaapdata toe voor Peter
  4. Voegt een reeks labwaarden toe voor alle drie
  5. Berekent baselines
  6. Voegt actieve interventies toe
  7. Genereert een paar alerts als voorbeeld

Veilig om meerdere keren te draaien: bestaande gebruikers worden overgeslagen.
"""
import sys
import os
from pathlib import Path

# Zorg dat de app-root in het pad staat
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, date, timedelta
import random

from app.database import SessionLocal, engine, Base
from app.models import (
    User, BloodPressureMeasurement, HRVReading,
    LabMarker, Baseline, Intervention, Alert, DailyInput
)
from app.baseline import recalculate_baseline_for_user

# Reproduceerbare willekeurige waarden
random.seed(42)


def make_user(db, name, email, dob, sex, health_profile):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"  ↩  {name} bestaat al (id={existing.id})")
        return existing
    user = User(
        name=name,
        email=email,
        date_of_birth=dob,
        sex=sex,
        health_profile=health_profile,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"  ✅ {name} aangemaakt (id={user.id})")
    return user


def seed_blood_pressure(db, user, days=30):
    """30 dagen bloeddruk met lichte dag-op-dag variatie."""
    count = 0
    for i in range(days):
        measured_at = datetime.utcnow() - timedelta(days=days - i, hours=7)
        # Peter heeft iets verhoogde bloeddruk: ~135/85 met variatie
        systolic = int(random.gauss(135, 8))
        diastolic = int(random.gauss(84, 6))
        heart_rate = int(random.gauss(62, 5))

        existing = db.query(BloodPressureMeasurement).filter(
            BloodPressureMeasurement.user_id == user.id,
            BloodPressureMeasurement.measured_at == measured_at
        ).first()
        if existing:
            continue

        db.add(BloodPressureMeasurement(
            user_id=user.id,
            measured_at=measured_at,
            systolic=max(100, systolic),
            diastolic=max(60, diastolic),
            heart_rate=max(45, heart_rate),
            source="withings"
        ))
        count += 1

    db.commit()
    print(f"  ✅ {count} bloeddrukmetingen voor {user.name}")


def seed_hrv(db, user, days=30):
    """30 dagen HRV/slaapdata, realistisch voor 59-jarige man."""
    count = 0
    for i in range(days):
        reading_date = date.today() - timedelta(days=days - i)

        existing = db.query(HRVReading).filter(
            HRVReading.user_id == user.id,
            HRVReading.date == reading_date
        ).first()
        if existing:
            continue

        # HRV daalt na alcohol/stress, wat variatie
        rmssd = round(random.gauss(38, 7), 1)
        ans_charge = round(random.gauss(62, 12), 1)

        db.add(HRVReading(
            user_id=user.id,
            date=reading_date,
            rmssd=max(15, rmssd),
            ans_charge=max(10, min(100, ans_charge)),
            deep_sleep_minutes=int(random.gauss(72, 18)),
            rem_sleep_minutes=int(random.gauss(88, 20)),
            light_sleep_minutes=int(random.gauss(180, 30)),
            sleep_efficiency=round(random.gauss(83, 6), 1),
            sleep_latency_minutes=int(random.gauss(14, 8)),
            sleep_score=int(random.gauss(68, 12)),
            source="polar"
        ))
        count += 1

    db.commit()
    print(f"  ✅ {count} HRV/slaap-dagen voor {user.name}")


def seed_lab_markers_peter(db, user):
    """Realistische labwaarden voor Peter — man 59, lichte cardiovasculaire risicofactoren."""
    markers = [
        # Datum 3 maanden geleden
        (datetime.utcnow() - timedelta(days=90), "blood", "hscrp", 1.8, "mg/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "homocysteine", 14.2, "µmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "tsh", 2.1, "mIU/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "free_t4", 16.3, "pmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "free_t3", 4.8, "pmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "testosterone_total", 14.2, "nmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "cortisol_morning", 420, "nmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "ferritin", 88, "µg/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "vitamin_d", 52, "nmol/L"),
        (datetime.utcnow() - timedelta(days=90), "blood", "magnesium", 0.82, "mmol/L"),
        # Datum 6 weken geleden (follow-up)
        (datetime.utcnow() - timedelta(days=42), "blood", "hscrp", 1.4, "mg/L"),
        (datetime.utcnow() - timedelta(days=42), "blood", "homocysteine", 12.8, "µmol/L"),
        (datetime.utcnow() - timedelta(days=42), "blood", "vitamin_d", 61, "nmol/L"),
    ]

    count = 0
    for measured_at, test_type, marker_name, value, unit in markers:
        existing = db.query(LabMarker).filter(
            LabMarker.user_id == user.id,
            LabMarker.marker_name == marker_name,
            LabMarker.measured_at == measured_at
        ).first()
        if existing:
            continue
        db.add(LabMarker(
            user_id=user.id,
            measured_at=measured_at,
            test_type=test_type,
            marker_name=marker_name,
            value=value,
            unit=unit,
            source="manual"
        ))
        count += 1

    db.commit()
    print(f"  ✅ {count} labwaarden voor {user.name}")


def seed_lab_markers_maya(db, user):
    """
    Labwaarden voor partner (Maya) — post-borstkanker ER+/PR+/HER2-,
    op endocriene therapie, hersteld van leaky gut.
    """
    markers = [
        (datetime.utcnow() - timedelta(days=60), "blood", "estradiol", 18, "pmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "progesterone", 0.4, "nmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "shbg", 82, "nmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "tsh", 3.2, "mIU/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "free_t4", 14.1, "pmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "free_t3", 3.9, "pmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "hscrp", 0.6, "mg/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "vitamin_d", 78, "nmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "ferritin", 42, "µg/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "cortisol_morning", 380, "nmol/L"),
        (datetime.utcnow() - timedelta(days=60), "blood", "homocysteine", 9.4, "µmol/L"),
        # Slaap cortisol (speekseltest)
        (datetime.utcnow() - timedelta(days=60), "saliva", "cortisol_morning", 12.4, "nmol/L"),
        (datetime.utcnow() - timedelta(days=60), "saliva", "cortisol_evening", 2.1, "nmol/L"),
        # Darm
        (datetime.utcnow() - timedelta(days=60), "stool", "calprotectin", 28, "µg/g"),
        (datetime.utcnow() - timedelta(days=60), "stool", "zonulin", 62, "ng/mL"),
    ]

    count = 0
    for measured_at, test_type, marker_name, value, unit in markers:
        existing = db.query(LabMarker).filter(
            LabMarker.user_id == user.id,
            LabMarker.marker_name == marker_name,
            LabMarker.measured_at == measured_at
        ).first()
        if existing:
            continue
        db.add(LabMarker(
            user_id=user.id,
            measured_at=measured_at,
            test_type=test_type,
            marker_name=marker_name,
            value=value,
            unit=unit,
            source="manual"
        ))
        count += 1

    db.commit()
    print(f"  ✅ {count} labwaarden voor {user.name}")


def seed_lab_markers_maddy(db, user):
    """Labwaarden voor Maddy — pilotgebruiker, peri-menopauze, MTHFR-drager."""
    markers = [
        (datetime.utcnow() - timedelta(days=45), "blood", "estradiol", 145, "pmol/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "fsh", 18.2, "IU/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "lh", 14.6, "IU/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "progesterone", 8.2, "nmol/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "shbg", 58, "nmol/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "tsh", 1.8, "mIU/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "free_t3", 4.2, "pmol/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "hscrp", 2.4, "mg/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "homocysteine", 16.8, "µmol/L"),  # verhoogd (MTHFR)
        (datetime.utcnow() - timedelta(days=45), "blood", "vitamin_d", 44, "nmol/L"),
        (datetime.utcnow() - timedelta(days=45), "blood", "ferritin", 22, "µg/L"),         # laag
        (datetime.utcnow() - timedelta(days=45), "blood", "magnesium", 0.74, "mmol/L"),
        (datetime.utcnow() - timedelta(days=45), "saliva", "cortisol_morning", 18.6, "nmol/L"),
        (datetime.utcnow() - timedelta(days=45), "saliva", "cortisol_evening", 4.8, "nmol/L"),  # slecht dalpatroon
    ]

    count = 0
    for measured_at, test_type, marker_name, value, unit in markers:
        existing = db.query(LabMarker).filter(
            LabMarker.user_id == user.id,
            LabMarker.marker_name == marker_name,
            LabMarker.measured_at == measured_at
        ).first()
        if existing:
            continue
        db.add(LabMarker(
            user_id=user.id,
            measured_at=measured_at,
            test_type=test_type,
            marker_name=marker_name,
            value=value,
            unit=unit,
            source="manual"
        ))
        count += 1

    db.commit()
    print(f"  ✅ {count} labwaarden voor {user.name}")


def seed_intervention(db, user, name, intervention_type, days_ago, notes=None):
    existing = db.query(Intervention).filter(
        Intervention.user_id == user.id,
        Intervention.name == name
    ).first()
    if existing:
        return
    db.add(Intervention(
        user_id=user.id,
        name=name,
        intervention_type=intervention_type,
        started_at=datetime.utcnow() - timedelta(days=days_ago),
        status="active",
        notes=notes,
    ))
    db.commit()
    print(f"  ✅ Interventie '{name}' voor {user.name}")


def seed_alert(db, user, alert_type, severity, message):
    existing = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.alert_type == alert_type
    ).first()
    if existing:
        return
    db.add(Alert(
        user_id=user.id,
        alert_type=alert_type,
        severity=severity,
        marker_names=[alert_type.replace("_elevated", "").replace("_suppressed", "")],
        message=message,
        is_read=False,
    ))
    db.commit()


def seed_daily_inputs(db, user, days=7):
    count = 0
    energy_pattern = [3, 4, 2, 4, 5, 3, 4]  # laatste 7 dagen
    for i in range(days):
        input_date = date.today() - timedelta(days=days - i - 1)
        existing = db.query(DailyInput).filter(
            DailyInput.user_id == user.id,
            DailyInput.input_date == input_date
        ).first()
        if existing:
            continue
        flags = []
        if i == 2:
            flags = ["alcohol", "late_bed"]
        db.add(DailyInput(
            user_id=user.id,
            energy_level=energy_pattern[i],
            context_flags=flags,
            input_date=input_date,
        ))
        count += 1
    db.commit()
    print(f"  ✅ {count} dagelijkse invoeren voor {user.name}")


def main():
    print("\n🌱 Vitalix seed script gestart...\n")

    # Zorg dat tabellen bestaan
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Peter ─────────────────────────────────────────────────────────────
        print("👤 Peter")
        peter = make_user(
            db, "Peter", "peter@vitalix.app",
            date(1965, 7, 14), "male",
            {
                "cardiovascular_risk": "moderate",
                "conditions": ["irregular_heartbeat"],
                "thyroid_history": True,
                "notes": "Atriumfibrilleren gedetecteerd via Withings. Volgt behandeling."
            }
        )
        seed_blood_pressure(db, peter, days=30)
        seed_hrv(db, peter, days=30)
        seed_lab_markers_peter(db, peter)
        seed_daily_inputs(db, peter, days=7)
        seed_intervention(db, peter, "Magnesium bisglycinaat", "supplement", 21,
                          "400mg voor het slapen. Doel: slaapkwaliteit + HRV verbeteren.")
        seed_intervention(db, peter, "Slaapschema optimaliseren", "sleep", 14,
                          "Voor 23:00 in bed, telefoon weg om 22:30.")
        seed_alert(db, peter, "bp_elevated", "orange",
                   "Je systolische bloeddruk lag de afgelopen 7 dagen gemiddeld op 141 mmHg — "
                   "boven je persoonlijke baseline van 135. Let op zout en stress.")
        seed_alert(db, peter, "homocysteine_elevated", "orange",
                   "Homocysteïne (14.2 µmol/L) ligt boven de optimale grens van 10 µmol/L. "
                   "Overweeg folaat (5-MTHF) en B12 suppletie.")

        # ── Partner (Maya) ────────────────────────────────────────────────────
        print("\n👤 Maya (partner)")
        maya = make_user(
            db, "Maya", "maya@vitalix.app",
            date(1968, 3, 22), "female",
            {
                "cancer_history": {
                    "type": "invasive_lobular_carcinoma",
                    "receptor_status": "ER+PR+HER2-",
                    "tumor_size_mm": 8,
                    "year": 2025,
                    "treatment": "lumpectomy + endocrine_therapy"
                },
                "gut_history": "leaky_gut_resolved_2024",
                "endocrine_therapy": "aromatase_inhibitor",
                "notes": "Volgt hormoontherapie. Laag oestrogeen verwacht."
            }
        )
        seed_lab_markers_maya(db, maya)
        seed_intervention(db, maya, "Ortho-flor probiotica", "probiotic", 45,
                          "10 miljard CFU dagelijks. Ondersteunt estroboloom na leaky gut herstel.")
        seed_intervention(db, maya, "Vitamine D3+K2", "supplement", 30,
                          "4000 IU D3 + 100mcg K2. Doel: niveau naar 80-100 nmol/L brengen.")

        # ── Maddy ─────────────────────────────────────────────────────────────
        print("\n👤 Maddy (pilotgebruiker)")
        maddy = make_user(
            db, "Maddy", "maddy@vitalix.app",
            date(1978, 11, 5), "female",
            {
                "phase": "perimenopause",
                "mthfr_suspected": True,
                "wearables": ["whoop"],
                "monitors": ["withings_bpm_vision"],
                "notes": "Verhoogd homocysteïne suggreert MTHFR-variant. "
                         "Hoge avond-cortisol, laag ferritine. Pilotgebruiker 1D. "
                         "Whoop voor HRV/slaap, Withings BPM Vision voor bloeddruk."
            }
        )
        seed_lab_markers_maddy(db, maddy)
        seed_intervention(db, maddy, "5-MTHF methylfolaat", "supplement", 14,
                          "400mcg actief folaat. Ondersteunt methylatieroute bij MTHFR-variant.")
        seed_alert(db, maddy, "homocysteine_elevated", "red",
                   "Homocysteïne (16.8 µmol/L) is significant verhoogd. "
                   "Dit kan wijzen op MTHFR-variant en verhoogt cardiovasculair risico. "
                   "Overleg met je arts over 5-MTHF en B12.")
        seed_alert(db, maddy, "ferritin_low", "orange",
                   "Ferritine (22 µg/L) is laag. Dit kan vermoeidheid en concentratieproblemen "
                   "veroorzaken — zeker in peri-menopauze. Overweeg ijzersuppletie met je arts.")

        # ── Baselines herberekenen ─────────────────────────────────────────────
        print("\n📊 Baselines berekenen...")
        for marker in ["systolic", "diastolic", "hrv_rmssd", "deep_sleep_minutes", "ans_charge"]:
            recalculate_baseline_for_user(db, peter.id, marker)
        print("  ✅ Baselines voor Peter bijgewerkt")

        print("\n✅ Seed voltooid. Je kunt nu inloggen met:")
        print("   peter@vitalix.app")
        print("   maya@vitalix.app")
        print("   maddy@vitalix.app\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
