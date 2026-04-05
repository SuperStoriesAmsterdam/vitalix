"""
Vitalix — Claude AI integratie
Bouwt een contextuele prompt op basis van gebruikersdata en roept de Claude API aan.
"""
import logging
from datetime import date, timedelta
from anthropic import AsyncAnthropic
from sqlalchemy.orm import Session
from app.config import settings
from app.models import User, HRVReading, BloodPressureMeasurement, LabMarker, Baseline, DailyInput, Intervention

logger = logging.getLogger(__name__)


def build_user_context(db: Session, user: User) -> str:
    """Bouwt een complete contextstring op basis van alle beschikbare gebruikersdata."""

    lines = []

    # Persoonlijk profiel — geen naam, geen e-mail, geen identificerende info naar Anthropic
    lines.append("## Gebruikersprofiel")
    if user.date_of_birth:
        age = (date.today() - user.date_of_birth).days // 365
        lines.append(f"Leeftijd: {age} jaar")
    if user.sex:
        lines.append(f"Geslacht: {'Man' if user.sex == 'male' else 'Vrouw'}")

    hp = user.health_profile or {}
    if hp.get("family_history_status"):
        status_map = {"available": "beschikbaar", "partial": "gedeeltelijk", "unknown": "onbekend"}
        lines.append(f"Familiegeschiedenis: {status_map.get(hp['family_history_status'], hp['family_history_status'])}")
    if hp.get("diagnoses"):
        lines.append(f"Diagnoses: {', '.join(hp['diagnoses'])}")
    if hp.get("medications"):
        lines.append(f"Medicijnen: {', '.join(hp['medications'])}")
    if hp.get("supplements"):
        lines.append(f"Supplementen: {', '.join(hp['supplements'])}")

    # Baselines
    baselines = db.query(Baseline).filter(Baseline.user_id == user.id).all()
    if baselines:
        lines.append("\n## Persoonlijke baselines (30-daags gemiddelde)")
        for b in baselines:
            stable = "stabiel" if b.is_stable else f"in opbouw ({b.data_points}/{b.stability_threshold} metingen)"
            lines.append(f"- {b.marker_name}: {round(b.baseline_value, 1)} ({stable})")

    # Recente HRV en slaapdata (laatste 14 dagen)
    since_14 = date.today() - timedelta(days=14)
    hrv_readings = db.query(HRVReading).filter(
        HRVReading.user_id == user.id,
        HRVReading.date >= since_14
    ).order_by(HRVReading.date.desc()).limit(14).all()

    if hrv_readings:
        lines.append("\n## HRV & slaap (laatste 14 dagen)")
        for r in hrv_readings:
            parts = [f"{r.date}"]
            if r.rmssd is not None:
                parts.append(f"HRV: {round(r.rmssd, 1)}ms")
            if r.ans_charge is not None:
                parts.append(f"ANS-herstel: {round(r.ans_charge, 1)}")
            if r.sleep_score is not None:
                parts.append(f"slaapscore: {r.sleep_score}")
            if r.deep_sleep_minutes is not None:
                parts.append(f"diepe slaap: {r.deep_sleep_minutes}min")
            lines.append("- " + " | ".join(parts))

    # Recente bloeddruk (laatste 10 metingen)
    bp_readings = db.query(BloodPressureMeasurement).filter(
        BloodPressureMeasurement.user_id == user.id
    ).order_by(BloodPressureMeasurement.measured_at.desc()).limit(10).all()

    if bp_readings:
        lines.append("\n## Bloeddruk (laatste 10 metingen)")
        for r in bp_readings:
            hr = f" | hartslag: {r.heart_rate}bpm" if r.heart_rate else ""
            lines.append(f"- {r.measured_at.date()}: {r.systolic}/{r.diastolic} mmHg{hr}")

    # Labwaarden (meest recente per marker)
    lab_markers = db.query(LabMarker).filter(
        LabMarker.user_id == user.id
    ).order_by(LabMarker.measured_at.desc()).all()

    seen_markers = set()
    lab_lines = []
    for m in lab_markers:
        if m.marker_name not in seen_markers:
            seen_markers.add(m.marker_name)
            lab_lines.append(f"- {m.marker_name}: {m.value} {m.unit} ({m.measured_at.date()})")

    if lab_lines:
        lines.append("\n## Labwaarden (meest recent per marker)")
        lines.extend(lab_lines)

    # Recente dagelijkse invoer (laatste 7 dagen)
    since_7 = date.today() - timedelta(days=7)
    daily_inputs = db.query(DailyInput).filter(
        DailyInput.user_id == user.id,
        DailyInput.input_date >= since_7
    ).order_by(DailyInput.input_date.desc()).all()

    if daily_inputs:
        lines.append("\n## Dagelijkse invoer (laatste 7 dagen)")
        energy_labels = {1: "uitgeput", 2: "vermoeid", 3: "neutraal", 4: "goed", 5: "scherp"}
        for d in daily_inputs:
            parts = [f"{d.input_date}"]
            if d.energy_level:
                parts.append(f"energie: {energy_labels.get(d.energy_level, d.energy_level)}/5")
            if d.context_flags:
                parts.append(f"context: {', '.join(d.context_flags)}")
            if d.note:
                parts.append(f"notitie: {d.note}")
            lines.append("- " + " | ".join(parts))

    # Actieve interventies
    interventions = db.query(Intervention).filter(
        Intervention.user_id == user.id,
        Intervention.status == "active"
    ).all()

    if interventions:
        lines.append("\n## Actieve interventies")
        for i in interventions:
            lines.append(f"- {i.name} (gestart: {i.started_at.date()})")

    return "\n".join(lines)


SYSTEM_PROMPT = """Je bent Vitalix, een persoonlijk preventief gezondheidsassistent. Je analyseert gezondheidsdata en geeft inzichten op basis van patronen in de data van de gebruiker.

Jouw rol:
- Analyseer patronen in de data, vergelijk altijd met de persoonlijke baseline (niet alleen met populatienormen)
- Geef concrete, evidence-based observaties — geen vage adviezen
- Wees eerlijk als data ontbreekt of onvoldoende is voor een conclusie
- Verwijs naar een arts bij ernstige afwijkingen (bloeddruk >160/100, tekenen van AFib, etc.)
- Nooit een diagnose stellen — wel patronen benoemen die de moeite waard zijn om te bespreken met een arts
- Antwoord altijd in het Nederlands

Formaat:
- Geef een helder, leesbaar antwoord — geen opsommingslijsten tenzij dat echt helpt
- Als je een patroon ziet in meerdere markers tegelijk, benoem dat expliciet
- Eindig altijd met een concrete vervolgstap (meting, vraag aan arts, interventie om te proberen)
- Maximaal 300 woorden tenzij de vraag meer detail vereist"""


async def ask_claude(db: Session, user: User, question: str) -> dict:
    """
    Stuurt een vraag naar Claude met alle gebruikersdata als context.

    Returns:
        Dict met 'content' (antwoord) en 'thinking' (optioneel)
    """
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_context = build_user_context(db, user)

    user_message = f"""Hier is mijn actuele gezondheidsdata:

{user_context}

Mijn vraag: {question}"""

    try:
        response = await client.messages.create(
            model=settings.ai_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        content = response.content[0].text
        logger.info(f"Claude antwoord gegenereerd voor gebruiker {user.id}, {len(content)} tekens")

        return {
            "content": content,
            "thinking": None,
        }

    except Exception:
        logger.exception(f"Claude API fout voor gebruiker {user.id}")
        raise
