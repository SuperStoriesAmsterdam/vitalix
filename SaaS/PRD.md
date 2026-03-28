# Product Requirements — Vitalix

> This document tells Claude Code *what* to build.
> CLAUDE.md tells it *how*. SUPERSTORIES-PLATFORM.md tells it *with what*.

---

## 1. Product Identity

| Field | Value |
|-------|-------|
| Product name | Vitalix |
| Product ID | `vitalix` |
| One-line description | Persoonlijk preventief gezondheidssysteem dat wearable-data, bloedwaarden en biometrie combineert tot één coherent beeld — en meet of interventies werken. |
| Target user | Gezondheidsbewuste volwassenen (45+, kankerhistorie, cardiovasculair risico) én vrouwen 20-35 die door de reguliere zorg niet serieus worden genomen. Begint als persoonlijk tool voor twee pilotgebruikers: Peter (59, man) en zijn partner (vrouw, 20-35). |
| Core problem | Gezondheidsdata bestaat versnipperd: wearable bij de ene app, bloed bij het lab, DNA ergens in een PDF. Niemand verbindt de punten. Huisarts vergelijkt met populatiegemiddelden, niet met jouw persoonlijke baseline. En als je een interventie start (probiotica, supplement, slaapprotocol) meet niemand ooit objectief of het heeft gewerkt. |

---

## 2. Core User Flows

### Flow 1: Onboarding — account aanmaken en eerste hardware koppelen
**Trigger:** Nieuwe gebruiker opent Vitalix voor het eerst.
**Steps:**
1. Gebruiker maakt account aan via magic link (email)
2. Gebruiker vult profiel in: naam, geboortedatum, geslacht, relevante geschiedenis (kanker, cardiovasculair, hormoonproblemen)
3. Gebruiker kiest welke hardware te koppelen — Withings BPM Core en/of Oura Ring
4. Per hardware: OAuth 2.0 flow (Withings) of Personal Access Token invoeren (Oura)
5. Systeem haalt historische data op (laatste 30 dagen) als background job
6. Dashboard toont eerste data + baseline-opbouwstatus per marker
**Result:** Gebruiker ziet zijn eerste metingen op een persoonlijk dashboard. Baseline-opbouw is gestart.
**Technical notes:**
- Withings: OAuth 2.0 flow via `/withings/auth` → `/withings/callback`
- Oura: Personal Access Token, opgeslagen encrypted in database
- Background job: historische data ophalen na koppeling (ARQ job)
- Baseline Calculator start zodra eerste meting binnenkomt

---

### Flow 2: Dagelijkse data-sync
**Trigger:** ARQ scheduled job, elke nacht om 03:00.
**Steps:**
1. Voor elke actieve gebruiker: haal nieuwe Withings-metingen op (bloeddruk, hartslag)
2. Voor elke actieve gebruiker: haal nieuwe Oura-data op (HRV, slaap, temperatuur, activiteit)
3. Sla nieuwe metingen op in database
4. Herbereken persoonlijke baseline per marker indien nieuwe data beschikbaar
5. Check alert-regels: is er een afwijking van de persoonlijke baseline die een melding rechtvaardigt?
6. Stuur notificatie (email) als alert-drempel overschreden
**Result:** Database is actueel, baseline wordt bijgewerkt, gebruiker ontvangt alert bij relevante afwijking.
**Technical notes:**
- ARQ background job: `sync_user_data(user_id)`
- Baseline herberekening: rolling 30-daags gemiddelde per marker, stabiel na minimum aantal metingen (configureerbaar per marker)
- Alert engine: pas signaleren als meerdere markers tegelijk afwijken (multi-modal bevestiging)

---

### Flow 3: Persoonlijk dashboard bekijken
**Trigger:** Gebruiker opent de app.
**Steps:**
1. Dashboard toont laatste meting per marker (bloeddruk, HRV, slaap, temperatuur)
2. Elke marker toont: huidige waarde + persoonlijke baseline + trend (pijl)
3. Baseline-opbouwstatus per marker: "X metingen — nog Y nodig voor stabiele baseline"
4. Actieve alerts (indien aanwezig) bovenaan in beeld
5. Actieve interventies (indien gestart) zichtbaar met countdown naar terugmeetmoment
**Result:** Gebruiker heeft in één oogopslag overzicht van zijn biologie + wat er aandacht verdient.
**Technical notes:**
- Eén API endpoint: `GET /health/dashboard/{user_id}`
- Geen real-time data nodig — dagelijkse sync is voldoende
- Trend berekening: vergelijk 7-daags gemiddelde met 30-daags baseline

---

### Flow 4: Interventie starten en terugmeten
**Trigger:** Gebruiker start een nieuwe interventie (probiotica, supplement, slaapprotocol, etc.)
**Steps:**
1. Gebruiker logt interventie in app: type, startdatum, beschrijving
2. Systeem maakt automatisch een baseline-snapshot van alle actieve markers op T=0
3. Na 4 weken: app stuurt tussencheck-notificatie — "Eerste weken verstreken, wearable-data toont [X]"
4. Na 8 weken: app vraagt gebruiker om bloedpanel opnieuw te laten doen
5. Na 12 weken: volledig vergelijkingsrapport — delta per marker, conclusie per interventie
**Result:** Gebruiker heeft objectief bewijs of de interventie effect heeft gehad op zijn biologie.
**Technical notes:**
- Model: `Intervention` met startdatum, type, baseline_snapshot (JSON), status
- Background job: check interventies dagelijks op checkpoints (28, 56, 84 dagen)
- Rapport: delta berekening baseline_snapshot vs. actuele waarden per marker

---

### Flow 5: Handmatige data invoeren (bloed, speeksel, urine)
**Trigger:** Gebruiker heeft lab-resultaten ontvangen (bloedpanel, speekseltest, urinetest).
**Steps:**
1. Gebruiker opent "Lab invoeren" scherm
2. Kiest testtype: bloed / speeksel / urine / ontlasting
3. Voert waarden in per marker via gestructureerd formulier (marker + waarde + datum)
4. Systeem slaat op, herberekent baseline voor die markers, checkt alert-regels
5. Dashboard toont nieuwe waarden direct
**Result:** Alle gezondheidsdata — ook niet-automatisch — staat in één systeem.
**Technical notes:**
- Sprint 0: gestructureerd formulier (handmatige invoer)
- Sprint 2+: PDF-upload met OCR voor automatisch uitlezen labresultaten
- Markers: gedefinieerd in een vaste lijst per testtype (zie Data Model)

---

## 3. Data Model

### User
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| name | String | |
| email | String unique | Voor magic link auth |
| date_of_birth | Date | Voor leeftijdscontext |
| sex | String | `male` / `female` — bepaalt welke markers relevant zijn |
| health_profile | JSON | Kankerhistorie, cardiovasculair risico, cyclusinformatie (vrouwen) |
| withings_access_token | String encrypted | OAuth token |
| withings_refresh_token | String encrypted | OAuth refresh |
| oura_access_token | String encrypted | Personal Access Token |
| created_at | DateTime | |

---

### BloodPressureMeasurement (Withings BPM Core)
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| measured_at | DateTime | Tijdstip van meting |
| systolic | Integer | mmHg |
| diastolic | Integer | mmHg |
| heart_rate | Integer | bpm |
| source | String | `withings` / `manual` |

---

### HRVReading (Oura Ring)
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| date | Date | Dag van meting |
| rmssd | Float | HRV RMSSD in ms |
| deep_sleep_minutes | Integer | Minuten diepe slaap |
| rem_sleep_minutes | Integer | Minuten REM-slaap |
| light_sleep_minutes | Integer | Minuten lichte slaap |
| sleep_efficiency | Float | 0-100% |
| sleep_latency_minutes | Integer | Inslaapduur in minuten |
| temperature_delta | Float | Afwijking van persoonlijke temp-baseline (°C) |
| readiness_score | Integer | Oura readiness score 0-100 |
| source | String | `oura` |

---

### LabMarker (handmatig ingevoerde lab-waarden: bloed, speeksel, urine, ontlasting)
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| measured_at | DateTime | Datum van bloedafname of testdatum |
| test_type | String | `blood` / `saliva` / `urine` / `stool` |
| marker_name | String | e.g. `hscrp`, `tsh`, `cortisol_morning` |
| value | Float | Numerieke waarde |
| unit | String | e.g. `mg/L`, `mIU/L`, `nmol/L` |
| source | String | `manual` / `pdf_ocr` (toekomstig) |

---

### Baseline (persoonlijke referentiewaarden per marker)
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| marker_name | String | Zelfde als LabMarker.marker_name of wearable-marker |
| baseline_value | Float | Persoonlijk gemiddelde |
| std_deviation | Float | Spreiding — voor afwijkingsdetectie |
| calculated_at | DateTime | Laatste herberekening |
| data_points | Integer | Aantal metingen gebruikt |
| is_stable | Boolean | True als voldoende datapunten (drempel per marker) |
| stability_threshold | Integer | Minimum datapunten voor stabiele baseline (configureerbaar) |

---

### Intervention (interventie-feedbackloop)
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| name | String | e.g. "Ortho-flor probiotica", "Omega-3 suppletie" |
| intervention_type | String | `probiotic` / `supplement` / `sleep` / `diet` / `hrt` / `other` |
| started_at | DateTime | Startdatum |
| baseline_snapshot | JSON | Alle actieve markers op T=0 |
| status | String | `active` / `completed` / `abandoned` |
| notes | String | Vrije tekst gebruiker |

---

### Alert
| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| user_id | Integer FK → User | |
| created_at | DateTime | |
| alert_type | String | `hrv_suppressed` / `bp_elevated` / `marker_trend` / `intervention_checkpoint` |
| severity | String | `info` / `orange` / `red` |
| marker_names | JSON | Lijst van markers die de alert triggeren |
| message | String | Leesbare tekst voor gebruiker |
| is_read | Boolean | |

---

### Relationships
- User → BloodPressureMeasurement: one-to-many
- User → HRVReading: one-to-many
- User → LabMarker: one-to-many
- User → Baseline: one-to-many (één per marker)
- User → Intervention: one-to-many
- User → Alert: one-to-many

---

## 4. External Integrations

| Service | What for | Sync or background job? |
|---------|----------|------------------------|
| **Withings Health API** | Bloeddruk + hartslag van BPM Core ophalen | ARQ background job (nachtelijk) + directe sync na OAuth |
| **Oura API v2** | HRV, slaap, temperatuur, activiteit, readiness ophalen | ARQ background job (nachtelijk) + directe sync na token invoer |
| **Resend** | Magic link emails + alert notificaties + interventie-checkpoints | Background job |

**Toekomstige integraties (niet in Sprint 0):**
- PDF OCR voor labresultaten (Google Document AI of AWS Textract)
- Cyclus-tracker koppeling (Natural Cycles, Clue — voor vrouwenprofiel)
- DNA-data parsing (23andMe / MyHeritage raw export)

---

## 5. Pricing Tiers & Feature Flags

> Prijspunten nog niet vastgesteld. Structuur wel.

| Tier | Price | Features included |
|------|-------|-------------------|
| Personal | PM | Twee gebruikers (pilot), alle features, geen licentiebeperking |
| Pro | PM | Wearable integraties, lab invoer, baseline calculator, interventie tracker, alerts |
| Employer | PM | Multi-user, team dashboard, anonieme aggregatie, white-label |

**Feature flags:**
- `wearable_sync` — automatische Withings + Oura synchronisatie
- `intervention_tracker` — interventie-feedbackloop met checkpoints
- `lab_ocr` — PDF-upload en automatisch uitlezen labresultaten (toekomstig)
- `dna_integration` — DNA-data interpretatie en baseline-kalibratie (toekomstig)
- `team_dashboard` — werkgever/groepsoverzicht (toekomstig)
- `cycle_sync` — cyclus-tracker koppeling voor vrouwenprofiel (toekomstig)

---

## 6. AI Behaviour

### Sprint 0: geen AI
Sprint 0 gebruikt geen LLM. De intelligentie zit in de baseline-berekening en correlatie-regels — dat is statistiek, geen AI.

### Sprint 2+: Insight Summariser
Wanneer meerdere markers tegelijk afwijken, genereert de app een leesbare samenvatting.

- **Input:** Lijst van afwijkende markers + richting van afwijking + persoonlijke context (leeftijd, geslacht, actieve interventies)
- **Output:** 2-3 zinnen in het Nederlands die het patroon beschrijven zonder diagnostische claims
- **Tone:** Informatief, niet alarmerend, niet medisch. "Uw HRV is de afgelopen week gedaald terwijl uw bloeddruk licht gestegen is. Dit patroon kan wijzen op verhoogde stressbelasting."
- **Constraints:** Mag NOOIT een diagnose stellen. Mag NOOIT een behandeling voorschrijven. Sluit altijd af met doorverwijzing naar arts bij significante afwijking.
- **Model preference:** Claude Sonnet (via Anthropic) — nuanced, geen overdreven alarmisme
- **Temperature:** 0.3 — gestructureerde output, weinig variatie

---

## 7. Multi-language

| Aspect | Approach |
|--------|----------|
| UI language | Nederlands — primaire markt NL/BE |
| AI output language | Nederlands |
| Email language | Nederlands |
| Marker namen | Medisch-internationale namen (hsCRP, HRV, TSH) — universeel begrijpelijk in context |

---

## 8. Wat Vitalix NIET doet

- Vitalix stelt **geen diagnoses**. Nooit. Elke significante afwijking wordt doorverwezen naar een arts.
- Vitalix schrijft **geen behandelingen voor**. Geen medicijnen, geen supplementdoseringen, geen therapeutische adviezen.
- Vitalix is **geen vervanger van medische zorg**. Het is aanvullend op de huisarts, niet concurrerend.
- Vitalix maakt **geen klinische claims**. "Uw marker wijkt af van uw baseline" — niet "U heeft een ontsteking."
- Vitalix doet **geen real-time monitoring**. Dagelijkse sync is voldoende — geen 5-minuut alerts.
- Vitalix beheert **geen labafspraken**. Gebruiker regelt zelf bloedpanel, speeksel- en urinetest via gekoppelde labs.
- Vitalix biedt **geen dieetplannen of trainingsschema's**. Het signaleert biologische patronen — wat de gebruiker ermee doet is zijn keuze.

---

## 9. Sprint-fasering

### Sprint 0 — persoonlijk tool (Peter + partner)
```
[ ] FastAPI app met SuperStories standaard structuur
[ ] Magic link auth (twee gebruikers)
[ ] Withings BPM Core OAuth koppeling
[ ] Oura Ring token koppeling
[ ] Nachtelijke ARQ sync job (Withings + Oura)
[ ] Persoonlijke baseline calculator (rolling average + stabiliteitsstatus)
[ ] Dashboard: laatste metingen + baseline + trend per marker
[ ] Handmatige lab-invoer (bloed, speeksel, urine)
[ ] Interventie-log: starten, baseline snapshot, checkpoints
[ ] Eenvoudige alerts: afwijking > 1 SD van persoonlijke baseline
[ ] Seed script: demo data voor Peter en partner
```

### Sprint 1 — interventie-feedbackloop compleet
```
[ ] 4/8/12-weken checkpoint notificaties (email via Resend)
[ ] Delta-rapport per interventie: voor vs na per marker
[ ] HRV trend gedurende interventieperiode (wearable continu)
[ ] Vrouwenprofiel: cyclus-invoeropties voor timing bloedpanel
```

### Sprint 2 — uitbreiding data-lagen
```
[ ] PDF-upload labresultaten (OCR)
[ ] Multi-modale correlatie (HRV + bloeddruk + bloedmarker tegelijk)
[ ] Stressas: speeksel cortisol dagcurve invoer + patroon visualisatie
[ ] Microbioom invoer (Biomesight export)
```

### Sprint 3 — platform
```
[ ] Multi-user onboarding (buiten pilot)
[ ] DNA-data parsing (23andMe raw export)
[ ] Werkgeverspakket (team dashboard, anonieme aggregatie)
[ ] Licentie-systeem (SuperStories distribution framework)
```

---

## 10. Launch Checklist (Sprint 0)

```
[ ] Withings OAuth flow werkt end-to-end op lokale omgeving
[ ] Oura token sync haalt echte data op
[ ] Nachtelijke sync job draait zonder fouten
[ ] Baseline calculator levert stabiele waarde na voldoende datapunten
[ ] Dashboard toont correcte data voor Peter én partner (multi-user isolatie getest)
[ ] Handmatige lab-invoer slaat op en verschijnt in dashboard
[ ] Interventie aanmaken + baseline snapshot werkt
[ ] Magic link auth werkt (email via Resend)
[ ] Seed script maakt demo data aan voor beide gebruikers
[ ] .env.example compleet met alle benodigde variabelen
[ ] PostgreSQL + Alembic migraties draaien lokaal
```

---

## 11. Vitalix-specifieke environment variables

```bash
# Withings API
WITHINGS_CLIENT_ID=
WITHINGS_CLIENT_SECRET=
WITHINGS_REDIRECT_URI=http://localhost:8000/withings/callback

# Oura API
# Geen client credentials nodig — Personal Access Token per gebruiker
# Token wordt encrypted opgeslagen in de database

# Product
PRODUCT_ID=vitalix
APP_VERSION=0.1.0
```

---

*SuperStories BV — Vitalix PRD — v0.1 — 28 maart 2026*
*Sprint 0: persoonlijk tool voor twee pilotgebruikers. Bouw alleen wat hier staat.*
