"""
Vitalix — LLM abstractielaag
Alle Claude API-calls gaan via dit bestand. Nooit direct vanuit routers of jobs.

Wat dit bestand doet:
- Initialiseert de Anthropic client met prompt caching
- Bouwt de Bible-prompt op uit de drie lagen (Identity + Referentie + Dynamisch)
- Genereert inzichten op basis van gebruikersdata
- Extraheert JSON decisions uit de AI-output
- Logt token-gebruik voor kostenmonitoring

Prompt-architectuur (zie PRD sectie 5):
  Block 1 — gecached: vitalix_identity.md + vitalix_reference_data.json
  Block 2 — dynamisch: gebruikersprofiel + geleerde voorkeuren + recente metingen

Veiligheidsregels (per CLAUDE.md):
  - Nooit diagnoses stellen
  - Bij bloeddruk >160/100: altijd arts-melding toevoegen
  - Bij AFib-signaal: doorverwijzen
  - Alle output via deze laag — nooit directe Anthropic-calls elders
"""
import json
import logging
import re
from pathlib import Path
from typing import Optional

import anthropic
from app.config import settings

logger = logging.getLogger(__name__)

# Pad naar de Bible-bestanden
PROMPTS_DIR = Path(__file__).parent / "prompts"

# Singleton Anthropic client
_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    """
    Geeft de Anthropic client terug. Maakt hem aan bij eerste gebruik.
    Gooit een duidelijke fout als de API key ontbreekt.
    """
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is niet ingesteld. "
                "Voeg hem toe aan je .env bestand."
            )
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _load_prompt_file(filename: str) -> str:
    """
    Laadt een bestand uit app/prompts/. Geeft een lege string terug
    als het bestand niet bestaat — zodat het systeem werkt ook zonder
    volledig ingevulde bibles (Sprint 0).

    Args:
        filename: Bestandsnaam relatief aan app/prompts/.
    """
    path = PROMPTS_DIR / filename
    if not path.exists():
        logger.warning(f"Prompt bestand niet gevonden: {path} — leeg geladen")
        return ""
    return path.read_text(encoding="utf-8")


def _build_system_prompt(hardware_files: list[str] | None = None) -> list[dict]:
    """
    Bouwt Block 1 van de prompt op: gecachte identiteits- en referentielaag.
    Gebruikt Anthropic prompt caching om kosten te minimaliseren.

    Args:
        hardware_files: Lijst van hardware-bestandsnamen uit app/prompts/hardware/.
                        Alleen geladen als de gebruiker die apparaten heeft gekoppeld.

    Returns:
        Lijst van message-blokken voor de Anthropic API.
    """
    identity = _load_prompt_file("vitalix_identity.md")
    reference = _load_prompt_file("vitalix_reference_data.json")

    # Hardware-bestanden conditioneel laden (Laag 2)
    hardware_content = ""
    for hw_file in (hardware_files or []):
        content = _load_prompt_file(f"hardware/{hw_file}")
        if content:
            hardware_content += f"\n\n---\n{content}"

    full_system = identity
    if reference:
        full_system += f"\n\n---\n## Referentiedata\n{reference}"
    if hardware_content:
        full_system += f"\n\n---\n## Hardware & Domeinkennis{hardware_content}"

    # Prompt caching: Block 1 wordt gecached — betalen per token slechts 1×
    return [
        {
            "type": "text",
            "text": full_system,
            "cache_control": {"type": "ephemeral"},
        }
    ]


def _build_user_context(
    user_name: str,
    user_profile: dict,
    recent_data: dict,
    learned_preferences: list[dict] | None = None,
) -> str:
    """
    Bouwt Block 2 van de prompt op: dynamische gebruikerscontext.
    Dit blok wordt niet gecached — het is uniek per request.

    Args:
        user_name: Naam van de gebruiker.
        user_profile: health_profile JSON van de User.
        recent_data: Dict met recente metingen per marker.
        learned_preferences: Lijst van geleerde voorkeuren uit de feedback loop.

    Returns:
        Prompt-tekst voor het dynamische blok.
    """
    lines = [f"## Gebruiker: {user_name}", ""]

    # Profiel
    if user_profile:
        lines.append("### Gezondheidsprofiel")
        lines.append(json.dumps(user_profile, ensure_ascii=False, indent=2))
        lines.append("")

    # Geleerde voorkeuren (feedback loop)
    if learned_preferences:
        lines.append("### Geleerde voorkeuren (pas deze toe)")
        for pref in learned_preferences:
            lines.append(f"- [{pref.get('category', '?')}] {pref.get('preference', '')}")
        lines.append("")

    # Recente data
    lines.append("### Recente metingen")
    lines.append(json.dumps(recent_data, ensure_ascii=False, indent=2))

    return "\n".join(lines)


def extract_decisions(content: str) -> list[dict]:
    """
    Extraheert het verborgen JSON decisions-blok uit AI-output.
    Het blok staat tussen ```json en ``` aan het einde van de tekst.

    Args:
        content: Volledige AI-output tekst.

    Returns:
        Lijst van decision-dicts, of lege lijst als geen blok gevonden.
    """
    pattern = r"```json\s*(\[.*?\])\s*```"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return []
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        logger.warning("Kon decisions JSON niet parsen uit AI-output")
        return []


def strip_decisions(content: str) -> str:
    """
    Verwijdert het decisions JSON-blok uit de zichtbare tekst.
    De gebruiker ziet alleen de leesbare output.

    Args:
        content: Volledige AI-output tekst.

    Returns:
        Tekst zonder het JSON-blok.
    """
    pattern = r"\n*```json\s*\[.*?\]\s*```\s*$"
    return re.sub(pattern, "", content, flags=re.DOTALL).strip()


async def generate_insight(
    user_name: str,
    user_profile: dict,
    recent_data: dict,
    question: str | None = None,
    hardware_files: list[str] | None = None,
    learned_preferences: list[dict] | None = None,
) -> dict:
    """
    Genereert een inzicht op basis van gebruikersdata.
    Dit is de centrale functie — alle AI-calls gaan hier doorheen.

    Args:
        user_name: Naam van de gebruiker (voor personalisatie).
        user_profile: health_profile JSON van de User.
        recent_data: Dict met recente metingen, baselines en context.
        question: Optionele vraag van de gebruiker (voor Scherm 3).
                  Als None: systeem genereert proactief een inzicht.
        hardware_files: Actieve hardware-bestanden voor Laag 2.
        learned_preferences: Geleerde voorkeuren uit de feedback loop.

    Returns:
        Dict met:
          - content (str): Leesbare tekst voor de gebruiker
          - decisions (list): Geëxtraheerde decision-blokken
          - input_tokens (int): Verbruikte input tokens
          - output_tokens (int): Verbruikte output tokens
    """
    client = get_client()

    system_blocks = _build_system_prompt(hardware_files=hardware_files)
    user_context = _build_user_context(
        user_name=user_name,
        user_profile=user_profile,
        recent_data=recent_data,
        learned_preferences=learned_preferences,
    )

    if question:
        user_message = f"{user_context}\n\n---\n\n## Vraag van gebruiker\n{question}"
    else:
        user_message = (
            f"{user_context}\n\n---\n\n"
            "Analyseer de bovenstaande data en genereer een relevant inzicht. "
            "Focus op wat het meest opvallend of actionabel is voor deze gebruiker op dit moment."
        )

    logger.info(
        f"AI inzicht aangevraagd voor {user_name} "
        f"({'vraag' if question else 'proactief'})"
    )

    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=1024,
        system=system_blocks,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_content = response.content[0].text
    decisions = extract_decisions(raw_content)
    clean_content = strip_decisions(raw_content)

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens

    logger.info(
        f"AI inzicht gegenereerd voor {user_name} — "
        f"{input_tokens} input / {output_tokens} output tokens"
    )

    return {
        "content": clean_content,
        "decisions": decisions,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
