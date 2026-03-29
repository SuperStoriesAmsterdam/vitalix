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

## 1B. De kern — positionering en narratief

### Het centrale inzicht

Een cardioloog kijkt naar je hart. Een endocrinoloog naar je hormonen. Een neuroloog naar je zenuwstelsel. Een orthomoleculaire arts naar je tekorten. Een oncoloog naar je tumor.

Niemand kijkt naar jou als systeem.

Vitalix doet precies dat.

---

### Wat er nieuw is

De technologie bestaat al jaren. De apparaten zijn betaalbaar. De labs zijn toegankelijk. De wetenschap is publiek beschikbaar.

Wat nieuw is: de samenhang.

```
Bloedwaarden + wearable-data + microbioom +
DNA + hormonen + interventie-log

→ Één coherent beeld van jouw biologie
→ Op basis van jouw persoonlijke baseline
→ Met de vraag die niemand anders stelt:
  werkt het?
```

Voor een totaalbudget van ongeveer €1.000 heeft een gewone consument toegang tot wat vijf jaar geleden alleen beschikbaar was in exclusieve longevity-klinieken in Zwitserland voor €10.000 per weekend.

Dat is geen incrementele verbetering. Dat is een paradigmaverschuiving.

---

### De twee sleutelbegrippen

**Just the facts**
Vitalix communiceert alleen wat meetbaar en aantoonbaar is. Geen aannames, geen overpresentatie van bewijs, geen speculatie. Evidence-level wordt altijd vermeld. Feiten kunnen uitermate interessant zijn — droog hoeven ze niet te zijn.

**Het hele systeem**
Vitalix kijkt niet naar één marker, één orgaan of één klacht. Het kijkt naar het geheel — en naar de verbanden tussen de delen. HRV daalt. hsCRP stijgt. Slaap verslechtert. Dat zijn drie signalen van hetzelfde onderliggende proces. Vitalix verbindt de punten.

---

### Wat Vitalix niet is

```
Geen medisch apparaat        → geen diagnoses
Geen supplement-winkel       → geen commercieel belang
Geen biohacking-tool         → geen optimalisatie-fetish
Geen vervanging van de arts  → aanvulling op, niet vervanging van
```

Vitalix is het eerste platform dat de gewone consument behandelt als een systeem — met dezelfde objectiviteit en longitudinale blik die voorheen alleen voorbehouden was aan topsport en topgeneeskunde.

---

## 2. Core User Flows

### Flow 1: Onboarding — account aanmaken en eerste hardware koppelen
**Trigger:** Nieuwe gebruiker opent Vitalix voor het eerst.
**Steps:**
1. Gebruiker maakt account aan via magic link (email)
2. Gebruiker vult profiel in: naam, geboortedatum, geslacht, relevante geschiedenis (kanker, cardiovasculair, hormoonproblemen)
3. Gebruiker kiest welke hardware te koppelen — Polar Loop en/of Withings BPM Core
4. Per hardware: OAuth 2.0 flow voor beide apparaten
5. Systeem haalt historische data op (laatste 30 dagen) als background job
6. Dashboard toont eerste data + baseline-opbouwstatus per marker
**Result:** Gebruiker ziet zijn eerste metingen op een persoonlijk dashboard. Baseline-opbouw is gestart.
**Technical notes:**
- Polar: OAuth 2.0 flow via `/polar/auth` → `/polar/callback` — Polar AccessLink API
- Withings: OAuth 2.0 flow via `/withings/auth` → `/withings/callback`
- Background job: historische data ophalen na koppeling (ARQ job)
- Baseline Calculator start zodra eerste meting binnenkomt

---

### Flow 2: Dagelijkse data-sync
**Trigger:** ARQ scheduled job, elke nacht om 03:00.
**Steps:**
1. Voor elke actieve gebruiker: haal nieuwe Withings-metingen op (bloeddruk, hartslag)
2. Voor elke actieve gebruiker: haal nieuwe Polar Loop-data op (HRV, slaap, herstel, activiteit)
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
| polar_access_token | String encrypted | OAuth token |
| polar_refresh_token | String encrypted | OAuth refresh |
| polar_user_id | String | Polar's eigen gebruikers-ID |
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
- Vitalix schrijft **geen behandelingen voor**. Geen medicijnen, geen medische supplementdoseringen, geen therapeutische adviezen. Suppletierichtlijnen zijn gebaseerd op biomarkerdata en wetenschappelijke evidentie — geen medisch voorschrift.
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
[ ] Polar Loop OAuth koppeling
[ ] Nachtelijke ARQ sync job (Withings + Polar)
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

## 12. Vrouwengezondheid — de top 8 onbegrepen condities

> Dit is de strategische context voor het vrouwenprofiel in Vitalix. Geen buildtaak voor Sprint 0 — wel de kennis die bepaalt welke biomarkers, welke vragen in het intake-profiel, en welke interventie-tracking we bouwen.

Het gezondheidssysteem laat vrouwen structureel in de steek. Een 2024-analyse in *PNAS* toont dat vrouwen gemiddeld 30 minuten langer wachten op spoedhulp dan mannen bij identieke pijnscores. 62% van vrouwen voelt zich niet serieus genomen door artsen (Gender Pain Gap Index, 2024). De condities hieronder zijn het bewijs.

---

### 12.1 Endometriose

**Prevalentie:** 6–15% van vrouwen in de vruchtbare leeftijd
**Gemiddelde diagnosevertraging: 7–12 jaar** — een van de grootste systemische faalpatronen in de westerse geneeskunde

Endometriose is een oestrogeenafhankelijke ontstekingsziekte waarbij endometriumweefsel buiten de baarmoeder groeit. Klachten worden structureel afgedaan als "erge menstruatie."

**Wat Vitalix kan meten:**
- hsCRP, IL-6 → chronische systemische ontsteking zichtbaar
- Oestradiol:progesteron ratio → hormonale onevenwichtigheid
- HRV (Oura) → chronische pijn onderdrukt het autonome zenuwstelsel
- Cortisol dagcurve (speeksel) → stress-pijn wisselwerking
- Microbioom → verlaagde *Lactobacillus*, verhoogde pathogene anaeroben (Lancet Microbe 2023)

**Vitalix kan endometriose niet diagnosticeren.** Wat het wél doet: zes maanden longitudinale data over ontsteking, hormonen en HRV per cyclusfase — waardoor een gynaecoloog een heel ander gesprek voert.

**Chlamydia-connectie (emerging evidence, klinisch relevant):**
Onbehandelde *Chlamydia trachomatis* infectie is bij vrouwen in 70–80% van de gevallen asymptomatisch. Jaren onopgemerkt. De gevolgen accumuleren stilletjes:
- Chlamydia → PID (Pelvic Inflammatory Disease) → bekkenontsteking en adhesies
- PID heeft een bewezen causaal verband met endometriose (Mendeliaanse randomisatie, 2024)
- Chlamydia-hitteschok-eiwit (Chsp60) triggert een immuunrespons die mechanistisch overlapt met endometriose-pathologie
- *Fusobacterium nucleatum* — een bacterie die ook via seksuele overdracht verspreidt — is gevonden in 64,3% van endometrioseweefsels vs. 7,1% van controles

**Klinische observatie (partner, werkt met jonge vrouwen):** Veel vrouwen van 20–35 hebben jaren onbehandelde chlamydia gehad. Er lijkt een patroon te zijn tussen deze voorgeschiedenis en latere endometriose-diagnose. Dit is nog geen wetenschappelijke consensus — het is een practitioner-signaal dat de opkomende literatuur ondersteunt.

**Intake-vraag voor vrouwenprofiel:** seksuele gezondheidsgeschiedenis, inclusief STI-voorgeschiedenis en behandeling.

---

### 12.2 Candida overgroei

**Prevalentie:**
- Vaginale candidiasis: 75% van vrouwen minimaal één keer in hun leven
- Recidiverend (>4x/jaar): ~9% van vrouwen
- Darmovergroei (SIFO): niet goed onderzocht; ~26% in patiënten met onverklaarde GI-klachten

**Mainstream positie:** "Systemische candida overgroei" wordt door de reguliere geneeskunde niet erkend als diagnose bij immuuncompetente mensen. Dit is het meest omstreden onderwerp op deze lijst.

**Wat er wél wetenschappelijk staat:**
- Antibioticagebruik verstoort *Lactobacillus*, faciliteert Candida proliferatie — sterke consensus
- Oestrogeen bevordert Candida-adhesie in vaginaal weefsel — consistent bewijs
- SIFO (Small Intestinal Fungal Overgrowth) wordt toenemend erkend in conventionele gastroenterologie

**Wat Vitalix kan meten:**
- Organische zuurprofiel (urine): D-arabinitol — directe Candida-metaboliet, kwantitatief, traceerbaar
- Microbioom (ontlasting): Candida aanwezigheid en verhouding tot beschermende flora
- Interventie-tracking: gaat D-arabinitol omlaag na dieetverandering of probiotica?

**De Vitalix-waarde:** Dit is precies de "meet of het werkt"-functie. Een orthomoleculair arts schrijft een Candida-protocol voor. Vitalix meet na 8 weken of het D-arabinitol-niveau is gedaald. Dat is objectief bewijs wat de arts nooit levert.

---

### 12.3 PCOS

**Prevalentie:** 5–15% van vrouwen in de vruchtbare leeftijd — de meest voorkomende endocriene-metabole aandoening in deze groep

Insulineresistentie aanwezig bij 50–80% van PCOS-patiënten — maar zelden getest of behandeld in de huisartsenpraktijk.

**Biomarkers:**
LH:FSH ratio, AMH, vrij testosteron, SHBG, nuchtere insuline, HOMA-IR, CRP, triglyceriden

**Gut-connectie (sterk emerging):** Consistent microbioom-dysbiose: verlaagde *Lactobacillus*, verhoogde *Escherichia/Shigella*. Darmbacteriën reguleren oestrogeen- en schildklierhormoonmetabolisme.

---

### 12.4 Hashimoto / Schildklieraandoeningen

**Prevalentie:** ~1 op 8 vrouwen in hun leven. Vrouwen 2,7x vaker getroffen dan mannen.

**Kritieke onderdiagnose:** TPO-antistoffen kunnen 10–20 jaar verhoogd zijn vóórdat TSH boven de referentiewaarde stijgt. Huisartsen testen alleen TSH. Vrouwen met Hashimoto en "normaal TSH" worden structureel weggestuurd.

**Biomarkers:** TSH, vrij T3, vrij T4, anti-TPO, anti-Tg, selenium, reverse T3

**Selenium-inzicht:** Seleniumsuppletie vermindert TPO-antistoffen meetbaar (meta-analyse 2024) — een interventie die Vitalix objectief kan traceren.

---

### 12.5 IJzertekort

**Prevalentie:** 10–22% van premenopauzale vrouwen. Meest voorkomende nutritionele deficiëntie ter wereld.

**Het laboratoriumprobleem:** Labs vlaggen ferritine pas als afwijkend onder 12–15 μg/L. Fysiologisch optimum voor klachtenvrij functioneren: >50 μg/L. Vrouwen met ferritine van 15–40 en significante klachten worden structureel weggestuurd met "uw ijzer is prima."

**Biomarkers:** Ferritine (optimum >50), transferrine-saturatie, sTfR, reticulocyt-hemoglobine

---

### 12.6 Oestrogeendominantie

Geen ICD-10-diagnose — maar het mechanisme onderbouwt: endometriose, PCOS, vleesbomen (70–80% van vrouwen vóór de menopauze), PMDD (3–8%).

**Het estroboloom:** Darmbacteriën reguleren via beta-glucuronidase hoeveel oestrogeen wordt gerecirculeerd. Dysbiose → verhoogd circulerend oestrogeen → oestrogeendominantie. Dit verbindt darmgezondheid direct aan hormoonbalans.

**Biomarkers:** Oestradiol:progesteron ratio, SHBG, DUTCH-test metabolieten (2-OH / 16-OH estron), cortisol (progesteron en cortisol delen precursors — chronische stress putt progesteron uit)

---

### 12.7 Auto-immuuncondities

**80% van alle auto-immuunziekten treft vrouwen.** Lupus 9:1, reumatoïde artritis 11:1, Hashimoto 7–10:1. Gemiddelde diagnosevertraging bij lupus: 6 jaar.

**Mechanisme (NIH 2024):** Het inactieve X-chromosoom wordt gedeeltelijk gereactiveerd in lymfocyten bij vrouwen, wat immuungenen upreguleert. Dit is de ontdekte biologische reden voor de vrouwelijke auto-immuunpredispositie.

**Biomarkers:** ANA, anti-dsDNA, anti-CCP, ESR, CRP, vitamine D, microbioom

---

### 12.8 ME/CVS en Fibromyalgie

**Prevalentie:** ME/CVS treft 17 miljoen mensen wereldwijd; vrouwen 1,5–2x vaker. Fibromyalgie: 3:1 vrouw:man.

**Geen gevalideerde biomarker beschikbaar.** Dit is de grootste diagnostische lacune op deze lijst. Diagnose is klinisch en uitsluitend. Vrouwen worden systematisch doorverwezen naar psychiatrie.

**Wat Vitalix wél kan bijdragen:** HRV-patroon, cortisolcurve, slaapkwaliteit, inflammatiemarkers en microbioom samen geven een longitudinaal beeld dat de behandelaar iets geeft om mee te werken — ook zonder een gevalideerde single-biomarker.

---

### Het overkoepelende patroon

```
Darmgezondheid → Estroboloom → Hormoonbalans
      ↓                              ↓
  Ontsteking ←——————————————— Immuunsysteem
      ↓
  HRV-suppressie + slaapstoornissen
      ↓
  Chronische klachten die de huisarts "niet ziet"
```

De darm, het hormoonprofiel, het immuunsysteem en het autonome zenuwstelsel zijn één systeem. Vitalix is het eerste platform dat ze als één systeem monitort — en meet of interventies dat systeem daadwerkelijk verbeteren.

**Gemiddelde diagnosevertraging over deze condities: 2–12 jaar.**
Vitalix lost niet de diagnose op. Het levert de data waardoor die 2–12 jaar wordt ingekort.

---

## 13. Vitalix voor vrouwen — marktpositie en strategische context

> Geen buildtaak voor Sprint 0. Wel de strategische lens waarmee elk productbesluit voor het vrouwenprofiel wordt genomen.

### 13.1 De kernobservatie

Mannen en vrouwen gebruiken een gezondheidstool om fundamenteel verschillende redenen.

```
Mannen     → biohacking, optimalisatie, presteren
             "hoe word ik beter?"

Vrouwen    → welzijn, begrip, erkenning
             "waarom doet mijn lichaam dit niet wat ik wil?"
```

Vrouwen hebben een lichaam dat maandelijks verandert — beïnvloed door de cyclus, externe hormonen (pil), stress, slaap, en levensfase. En ze worden door het medische systeem structureel niet serieus genomen als ze zeggen dat er iets niet klopt.

**Vitalix voor vrouwen is geen biohacking-tool.**
Het is het eerste systeem dat hen gelooft — omdat het objectief meet wat zij al wisten.

> *"Je lichaam stuurde al jaren signalen. Nu leer je ze lezen."*

---

### 13.2 De pil — jaren gemaskeerde biologie

De hormonale anticonceptiepil onderdrukt de eigen hormoonproductie volledig. Een vrouw op de pil heeft geen eisprong en geen echte menstruatie — alleen een onttrekkingsbloeding. Dit maskeert structureel:

- PCOS-symptomen (cyclusstoornissen onzichtbaar)
- Endometriose-progressie (pijn onderdrukt, ziekte groeit door)
- Hormonale dysregulatie (oestradiol:progesteron ratio niet meetbaar)
- Vroege Hashimoto-signalen (hormoonprofiel verstoord door suppressie)

Als een vrouw stopt met de pil — vaak omdat ze zwanger wil worden — komen de onderliggende condities in volle kracht naar boven. Post-pil amenorroe en post-pil PCOS zijn reële klinische fenomenen. De huisarts zegt: "geef je lichaam even de tijd." Intussen zijn de onderliggende condities soms jaren ongezien geprogresseerd.

**Vitalix is bij uitstek het platform dat dit zichtbaar maakt zodra ze stopt** — door direct te beginnen met het meten van haar eigen hormonale profiel, cyclus en inflammatiemarkers.

---

### 13.3 De onvruchtbaarheidsketen

De partner van de oprichter werkt met jonge vrouwen en ziet een consistent patroon:

```
Onbehandelde chlamydia (asymptomatisch, soms jaren)
→ PID (pelvic inflammatory disease)
→ Tubaire adhesies en beschadiging
→ Verminderde tubaire doorgankelijkheid
→ Onvruchtbaarheid of ectopische zwangerschap
```

Parallel lopen de hormonale routes:
- Endometriose → verminderde eicelkwaliteit, implantatieproblemen
- PCOS → anovulatie → onvruchtbaarheid
- Hashimoto → verhoogd miskraamrisico
- IJzertekort → verstoorde implantatie

**Waar Vitalix waarde heeft in dit traject:**
- Inflammatiemarkers monitoren die op onderliggende disfunctie wijzen
- Hormoonpatronen tracken die op PCOS of oestrogeendominantie wijzen
- AMH (anti-Mülleriaans hormoon) opnemen in het bloedpanel als maat voor ovariële reserve
- Interventies objectief meten — verbetert het hormoonprofiel na behandeling?
- Longitudinale data leveren waarmee een gynaecoloog eerder en beter handelt

**Waar Vitalix niet bij kan:**
- Tubaire schade zien (echografie of laparoscopie vereist)
- Diagnose stellen
- Medische behandeling vervangen

---

### 13.4 Waarom Vitalix voor vrouwen groter kan zijn dan voor mannen

De condities beschreven in Sectie 12 — endometriose, PCOS, Hashimoto, ijzertekort, candida overgroei, oestrogeendominantie, auto-immuun, ME/CVS — hebben allemaal drie dingen gemeen:

1. Ze treffen overwegend vrouwen
2. Ze worden structureel te laat ontdekt (2–12 jaar vertraging)
3. Ze zijn meetbaar via de biomarkers die Vitalix monitort

De reguliere geneeskunde faalt hier systematisch. Vitalix vult precies die leemte — niet als medisch apparaat, maar als het eerste platform dat vrouwen longitudinale, objectieve data geeft over hun eigen biologie.

**De markt:** Elke vrouw die ooit te horen heeft gekregen "uw waarden zijn normaal" terwijl ze zich niet normaal voelde. Dat is geen niche.

---

---

## 14. Supplementenmodule — data-gedreven suppletierichtlijnen

> Geen buildtaak voor Sprint 0. Wel de architectuur waarmee de module later wordt gebouwd. De interventie-feedbackloop (Flow 4) is de technische basis.

### 14.1 Kernprincipe

Vitalix adviseert geen supplementen op basis van symptomen of algemene aanbevelingen. Elk suppletieadvies is gekoppeld aan drie vereisten:

```
1. Jouw biomarker wijkt af van jouw persoonlijke baseline
   (niet van een populatiegemiddelde)

2. Er is wetenschappelijk bewijs voor suppletie bij deze afwijking
   (evidence-level gedifferentieerd: sterk / matig / opkomend)

3. Er is een meetmoment gepland om te verificeren of het werkt
   (8-12 weken — bloedwaarden of wearable-trend)
```

Zonder alle drie: geen advies.

---

### 14.2 De supplementenbijbel — kennisarchitectuur

De module werkt met een gestructureerde kennisbasis per supplement:

```
supplement/
├── naam: Vitamine D3
├── biomarker_trigger: 25-OH vitamine D < 50 nmol/L
├── evidence_level: sterk (meerdere RCTs, meta-analyses)
├── bronnen: [PubMed IDs]
├── richtlijn_dosering: 2000-4000 IE/dag bij deficiëntie
├── suppletievorm: D3 (cholecalciferol) — niet D2
├── cofactoren: magnesium, vitamine K2 (MK-7)
├── terugmeetmarker: 25-OH vitamine D bloedwaarde
├── terugmeetmoment: 12 weken
└── interacties: bloedverdunners (verhoogd effect)
```

---

### 14.3 Kernlijst — biomarker-gekoppelde supplementen

| Supplement | Trigger | Evidence | Terugmeetmarker |
|---|---|---|---|
| **Vitamine D3** | 25-OH vit D < 50 nmol/L | Sterk | 25-OH vit D bloedwaarde |
| **Magnesium bisglycinaat** | Mg < 0.80 mmol/L + slechte slaap | Matig-sterk | Mg bloedwaarde + slaapscore Polar |
| **Omega-3 (EPA/DHA)** | hsCRP verhoogd + lage inname | Sterk | hsCRP na 12 weken |
| **Vitamine B12** | B12 < 300 pmol/L | Sterk | B12 bloedwaarde |
| **IJzer (bisglycinaat)** | Ferritine < 30 µg/L | Sterk | Ferritine + Hb |
| **Zink** | Zn laag + immuunsignalen | Matig | Zn bloedwaarde |
| **CoQ10** | Ouder > 50 + vermoeidheid + statinegebruik | Matig | HRV-trend Polar |
| **Probiotica** | Microbioom deficiëntie specifieke stam | Opkomend | Microbioomtest herhalen |
| **Indool-3-carbinol** | Oestrogeendominantie (vrouwen) | Opkomend | Oestradiol:progesteron ratio |
| **Ashwagandha** | Cortisol dagcurve verstoord + HRV laag | Matig | Cortisol herhaling + HRV-trend |

---

### 14.4 Wat Vitalix anders doet dan de supplementenmarkt

```
Supplementenmarkt:          Vitalix:
────────────────────        ──────────────────────────────
Generiek advies             Jouw biomarker als trigger
Symptoomgebaseerd           Datagedreven
Commercieel belang          Geen affiliate, geen merk
Geen follow-up              Meetmoment ingebouwd
Vorm irrelevant             Vorm specifiek (D3 niet D2,
                            bisglycinaat niet oxide)
Geen interacties            Interacties gedocumenteerd
```

---

### 14.5 Suppletievorm — waarom dit ertoe doet

De markt verkoopt supplementen op naam. Vitalix adviseert op vorm:

```
Magnesium oxide      → slechte absorptie, laxerend effect
Magnesium bisglycinaat → hoge biologische beschikbaarheid, slaapondersteunend

Vitamine D2 (ergocalciferol) → mindere omzetting
Vitamine D3 (cholecalciferol) → superieure opname en werkzaamheid

IJzer sulfaat        → maagklachten, slechte tolerantie
IJzer bisglycinaat   → hoge absorptie, goed verdragen
```

Dit is precies de kennis die de orthomoleculaire arts heeft — maar die de huisarts én de supplementenwinkel niet geven.

---

### 14.6 De feedbackloop

Elk suppletieadvies activeert automatisch Flow 4 (Interventie starten):

```
Dag 0:    Vitalix signaleert afwijking
          → Suppletieadvies gegenereerd
          → Baseline-snapshot gemaakt van alle relevante markers

Dag 28:   Tussencheck via wearable-data
          "HRV-trend afgelopen 4 weken: +8% — positief signaal"

Dag 56:   Bloedpanel-herinnering
          "Tijd om vitamine D opnieuw te meten"

Dag 84:   Volledig rapport
          Werkte het? Ja / Nee / Gedeeltelijk
          → Advies bijgesteld of bevestigd
```

Dit is wat de orthomoleculaire arts nooit kan bieden: objectieve, longitudinale verificatie of de interventie biologisch effect heeft gehad.

---

### 14.7 Vrouwen-specifieke supplementen

Voor het vrouwenprofiel (cyclus, hormonen, endometriose, PCOS):

| Supplement | Indicatie | Trigger |
|---|---|---|
| **Vitamine B6** | PMS, oestrogeenmetabolisme | Progesterondeficiëntie + PMS-klachten |
| **Zink** | PCOS, androgeenbalans | Verhoogd testosteron + microbioom |
| **N-acetylcysteïne (NAC)** | PCOS, insulineresistentie | HOMA-IR verhoogd |
| **Indool-3-carbinol / DIM** | Oestrogeendominantie, endometriose | Oestradiol:progesteron ratio |
| **Omega-3** | Endometriose, prostaglandinen | hsCRP + pijnpatroon cyclus |
| **Magnesium** | Menstruatiepijn, slaap, PMS | Mg laag + slaapscore + cyclussignalen |

---

## 15. De Vitalix Concierge — architectuur en twee modi

### 15.1 Wat de concierge is

De Vitalix concierge is een AI-assistent die gezondheids- vragen beantwoordt op basis van twee bronnen: een wetenschappelijke kennisbank én de persoonlijke biomarkerdata van de gebruiker. Hij is geen chatbot. Hij is een redenerende laag bovenop gevalideerde wetenschap en persoonlijke data.

De concierge werkt in twee modi — afhankelijk van of de gebruiker een abonnement heeft.

---

### 15.2 Vrije modus (geen abonnement vereist)

```
Gebruiker stelt vraag
→ Concierge zoekt relevante passages in kennisbank
→ Beantwoordt op basis van wetenschap
→ Geen persoonlijke data beschikbaar
→ Natuurlijke CTA aan het einde:
  "Wil je weten of dit bij jou speelt?
   Meet het. → Vitalix abonnement"
```

**Doel:** Vertrouwen opbouwen vóór de verkoopconversatie. De concierge geeft echte waarde — niet een demo, niet een sales pitch.

---

### 15.3 Betaalde modus (abonnement actief)

```
Gebruiker stelt vraag
→ Concierge laadt gebruikersprofiel:
  ├── Laatste biomarkerwaarden
  ├── Wearable trends (Polar Loop, 30/90 dagen)
  ├── Actieve supplementen + startdatums
  ├── Lopende interventies
  └── Gespreksgeschiedenis (persistent)
→ Zoekt relevante passages in kennisbank
→ Redeneert over persoonlijke data + wetenschap
→ Geeft gepersonaliseerd antwoord met meetbaar advies
```

**Voorbeeld:**
> "Waarom slaap ik slechter de laatste twee weken?"
>
> "Je diepe slaap is gedaald van gemiddeld 94 naar 67 minuten sinds 14 maart. Dit correleerde met een HRV-daling van 12% op dezelfde datum. Jouw laatste magnesiumwaarde was 0.74 mmol/L — aan de lage kant van jouw persoonlijke baseline van 0.81. Overweeg de dosering te verhogen naar magnesiumbisglycinaat 400mg voor het slapen en meet over 8 weken opnieuw."

---

### 15.4 Geheugen per gebruiker

De concierge heeft geen sessiegeheugen — hij heeft permanent geheugen per gebruiker.

```
Opgeslagen in PostgreSQL per gebruiker:
├── Volledige gespreksgeschiedenis
├── Actueel biomarkerprofiel
├── Supplement- en interventie-log
└── Wearable trends (rolling)

Bij elke nieuwe vraag laadt de concierge:
├── Laatste 10 berichten van die gebruiker
├── Actueel gezondheidsoverzicht
└── Relevante passages uit de wetenschappelijke bijbel
    (via pgvector similarity search)
```

Elke keer dat een gebruiker de concierge opent, kent hij de volledige context — zonder dat de gebruiker opnieuw hoeft uit te leggen wie hij is of wat zijn situatie is.

---

### 15.5 De wetenschappelijke bijbel

De kennisbank is geen LLM-geheugen. Het is een gecureerde database van wetenschappelijk onderbouwde informatie per conditie, per biomarker en per supplement — met evidence-levels gedifferentieerd:

```
Niveau 1: Sterke consensus
          Meerdere gerandomiseerde studies, meta-analyses
Niveau 2: Goed onderbouwd, emerging
          Kleinere studies, mechanistisch plausibel
Niveau 3: Practitioner signal
          Klinische observaties, expert input
          (zoals: partner ziet verband chlamydia-endometriose)
```

De concierge communiceert altijd het evidence-level van zijn antwoord. Geen aannames, geen overpresentatie van bewijs.

---

### 15.6 Technische implementatie

```
app/ai.py               → LLM abstractielaag (al aanwezig)
app/routers/
  concierge.py          → gratis endpoint (geen auth vereist)
  chat.py               → betaald endpoint (auth + biomarkerdata)
PostgreSQL + pgvector   → kennisbank + gespreksgeschiedenis
app/jobs/
  knowledge_sync.py     → kennisbank bijwerken (nieuw bewijs)
```

---

## 16. Redactionele filosofie — Just the Facts

### 16.1 De kern

Vitalix communiceert op één manier: feitelijk, helder, zonder aannames. Feiten kunnen uitermate interessant zijn — droog hoeft dat niet te betekenen. Maar speculatie, overpresentatie van bewijs en conspiracy-denken hebben geen plaats.

> **"Just the facts"** — dit is zowel een payoff als een werkprincipe voor alle informatie die Vitalix verstrekt.

---

### 16.2 De EU supplementen-paradox

Een voorbeeld van waarom feitelijke informatie krachtig is — en waarom Vitalix een unieke positie inneemt.

**De regelgeving:**
EU-verordening EC 1924/2006 bepaalt dat supplementfabrikanten alleen gezondheidsclaims mogen maken die zijn goedgekeurd in de Europese gezondheidsclaimsdatabase. Claims gebaseerd op wetenschappelijk onderzoek dat niet aan de EU is voorgelegd voor goedkeuring — mogen niet op een verpakking staan.

**Het gevolg:**
Een probiotica-fabrikant mag niet schrijven "helpt bij candida overgroei" — ook al bestaat daarvoor wetenschappelijk bewijs. Een magnesiumfabrikant mag niet schrijven "ondersteunt diepe slaap bij tekort" — ook al laten meerdere studies dat zien.

**Waarom dit bestaat:**
De EU wil consumenten beschermen tegen misleidende gezondheidsclaims. De goedkeuringsprocedure is bedoeld als kwaliteitsfilter. Dat is een legitiem doel.

**Wat het onbedoeld veroorzaakt:**
Het goedkeuringsproces is duur en traag. Kleine fabrikanten en academische onderzoekers kunnen het proces niet altijd doorlopen. Het resultaat: wetenschappelijk gevalideerde informatie bereikt de consument niet via het productlabel.

**Wat Vitalix anders doet:**
Vitalix verkoopt geen supplementen. Vitalix analyseert data en verstrekt persoonlijke inzichten op basis van biomarkers. Dat valt in een fundamenteel andere juridische categorie — geen gezondheidsclaim op een product, maar een persoonlijk data-inzicht.

```
Supplementlabel (verboden):
"Dit product helpt bij candida overgroei"

Vitalix (toegestaan):
"Jouw microbioomtest toont een candida-overgroei.
 Wetenschappelijk onderzoek (niveau 2) suggereert
 dat Lactobacillus rhamnosus GG hier effectief bij
 kan zijn. Na 8 weken meten we opnieuw."
```

Vitalix kan zeggen wat het etiket niet mag zeggen — niet omdat we regels omzeilen, maar omdat we in een andere categorie opereren.

---

### 16.3 Just the Facts — werkprincipes voor de concierge

```
✅ Altijd evidence-level vermelden
✅ Onderscheid maken tussen bewezen en plausibel
✅ Persoonlijke data als vertrekpunt, niet als conclusie
✅ Tijdlijn communiceren (vitamine D werkt na 8-12 weken,
   niet na 3 dagen)
✅ Zeggen wat we niet weten
✅ Doorverwijzen naar arts waar relevant

❌ Geen diagnoses
❌ Geen claims zonder databasis
❌ Geen aannames over oorzaak-gevolg zonder bewijs
❌ Geen conspiracy-narratieven over regulering
❌ Geen supplement-aanbevelingen zonder tekort aangetoond
```

---

## 17. DNA-onderzoek — disclaimer en ethisch kader

### 17.1 Waarom een disclaimer verplicht is

DNA-onderzoek onderscheidt zich fundamenteel van andere data in Vitalix. Bloedwaarden veranderen. Wearable-data is van gisteren. DNA is permanent — en de informatie erin kan confronterend, onomkeerbaar en verreikend zijn.

Vitalix vereist actieve informed consent voordat een gebruiker DNA-data koppelt of uploadt. Geen opt-out checkbox. Een bewust doorlopen stap.

---

### 17.2 Wat DNA-onderzoek kan onthullen

```
Erfelijke kankerrisico's
├── BRCA1/BRCA2 → sterk verhoogd risico op borst- en
│                  eierstokkanker
├── Lynch syndroom → verhoogd risico darmkanker
└── Andere tumorsuprressor-varianten

Neurologische risico's
├── APOE4 → verhoogd risico op Alzheimer
│            homozygoot APOE4/APOE4: significant verhoogd
└── Nog geen behandeling beschikbaar

Cardiovasculaire risico's
├── Familiaire hypercholesterolemie
└── Hartritme-gerelateerde varianten

Farmacogenetica
├── Hoe je lichaam medicijnen metaboliseert
├── Relevant bij kankerbehandeling, antidepressiva,
│   bloedverdunners
└── Kan behandeladvies van arts veranderen
```

---

### 17.3 Wat de gebruiker moet begrijpen vóór DNA-koppeling

**1. DNA-informatie raakt ook je familie**
Een genetische variant die jij ontdekt, geldt mogelijk ook voor je ouders, broers, zussen en kinderen. Je neemt niet alleen een beslissing voor jezelf.

**2. Weten is niet hetzelfde als lotsbestemming**
Een verhoogd genetisch risico betekent niet dat je de ziekte krijgt. Het betekent dat je risicoprofiel anders is dan gemiddeld. Leefstijl, omgeving en toeval spelen een grote rol.

**3. Sommige informatie heeft geen behandeling**
APOE4 en Alzheimer is het meest bekende voorbeeld. Je kunt de informatie krijgen — maar er is op dit moment geen bewezen interventie die het risico elimineert. Wil je dat weten?

**4. Psychologische impact**
Onderzoek toont aan dat confronterende genetische uitslagen significante psychologische impact kunnen hebben — angst, rouw, veranderd zelfbeeld. Dit is niet iets om licht over te gaan.

---

### 17.4 Hoe Vitalix hiermee omgaat

**Gefaseerde onthulling:**
Vitalix toont standaard alleen de DNA-markers die direct relevant zijn voor de biomarkers die al gemeten worden — vitamine D-metabolisme, omega-3 verwerking, ontstekingsrespons, schildklierfunctie.

Hoog-impact genetische informatie (BRCA, APOE4, Lynch) wordt niet automatisch getoond. De gebruiker kiest actief of hij deze informatie wil zien.

```
Standaard zichtbaar:     Nutriëntenmetabolisme (MTHFR,
                         VDR, FADS1/2, COMT)
                         Farmacogenetica (CYP450-varianten)
                         Inflammatierespons (IL-6, TNF-α)

Actieve keuze vereist:   Erfelijke kankerrisico's
                         APOE4 / Alzheimer-risico
                         Andere hoog-impact varianten
```

**Aanbeveling genetisch counselor:**
Bij hoog-impact bevindingen raadt Vitalix altijd aan een gecertificeerd genetisch counselor te raadplegen vóór verdere actie. Vitalix interpreteert geen klinische genetische diagnoses.

**Data-soevereiniteit:**
DNA-data wordt nooit gedeeld, nooit gebruikt voor onderzoek zonder expliciete toestemming, en kan op elk moment volledig verwijderd worden uit het systeem.

---

### 17.5 De disclaimer — tekst voor gebruikersinterface

> **Voordat je doorgaat**
>
> DNA-onderzoek kan informatie onthullen die confronterend is — over erfelijke ziekterisico's, neurologische aandoeningen of informatie die ook relevant is voor je familieleden.
>
> Vitalix toont standaard alleen DNA-markers die direct verband houden met je gemeten biomarkers. Hoog-impact informatie (zoals erfelijke kankerrisico's of Alzheimer-risico) toon je alleen als je daar bewust voor kiest.
>
> Weten is niet hetzelfde als lotsbestemming. Maar sommige informatie kan niet worden "ont-weten." Neem de tijd voor deze keuze.
>
> Bij confronterende bevindingen raden wij altijd aan een gecertificeerd genetisch counselor te raadplegen.
>
> [Ik begrijp dit en wil doorgaan] [Ik sla DNA-koppeling voor nu over]

---

## 18. UX-principe — Zero Friction

> Dit is geen feature. Het is een ontwerpfilosofie die elk scherm, elke interactie en elke databron bepaalt.

### 18.1 De kern

De gebruiker wil niet nadenken over het platform. De gebruiker wil leven — en achteraf begrijpen wat zijn biologie deed.

```
Goed:    Data komt vanzelf binnen
         Inzicht verschijnt wanneer het relevant is
         Vragen stellen via gesprek, niet via formulieren

Fout:    Dagelijkse invoerschermen
         Herinneringen om data in te voeren
         Formulieren met velden
         Dashboards die aandacht eisen
```

### 18.2 Wat automatisch binnenkomt

```
Polar Loop           → HRV, slaap, hartslag, activiteit,
                       SpO2 — nachtelijke sync
                       Gebruiker doet niets

Withings BPM Core    → Bloeddruk + ECG
                       Automatisch gesync'd na elke meting
                       Gebruiker doet niets
```

### 18.3 Wat via de concierge binnenkomt

Alles wat niet automatisch meetbaar is, gaat via gesprek. Geen formulieren.

```
Bloedtest ontvangen:
Gebruiker:  "Bloedtest binnen. Vitamine D 38,
             hsCRP 2.1, ferritine 67"
Concierge:  Parseert automatisch, logt waarden,
            koppelt aan persoonlijke baseline

Supplement gestart:
Gebruiker:  "Ben begonnen met Omega-3 vandaag,
             2 gram per dag"
Concierge:  Logt interventie met startdatum,
            zet automatisch herinnering voor
            follow-up meting over 12 weken

Interventie gestart:
Gebruiker:  "Begin vandaag met Systema
             breath hold training"
Concierge:  Logt startdatum, koppelt aan
            HRV-trend in Polar Loop data
```

### 18.4 Wat nooit handmatig ingevoerd hoeft te worden

```
Ademfrequentie       → Skip — HRV vertelt hetzelfde verhaal
Dagelijks humeur     → Skip — HRV + slaap zijn objectiever
Activiteiten-log     → Skip — Polar Loop detecteert automatisch
Stressscore          → Skip — pseudowetenschap, zie Section 16
```

### 18.5 De ontwerpregels

```
Regel 1:  Als iets automatisch kan — dan automatisch.
          Geen handmatige invoer als er een API bestaat.

Regel 2:  Als iets handmatig moet — dan via gesprek.
          Geen formulieren. Geen velden. Gewoon zeggen wat er is.

Regel 3:  Het platform spreekt de gebruiker aan.
          Niet andersom. Vitalix signaleert wanneer er
          iets te zien is. De gebruiker hoeft niet
          dagelijks in te loggen.

Regel 4:  Één apparaat, altijd om.
          Polar Loop werkt dag én nacht, op pols of biceps.
          Geen ring die je afzet tijdens training.
          Geen horloge dat je oplaadt terwijl je slaapt.

Regel 5:  Minder data, beter geselecteerd is meer waard
          dan veel data die niemand leest.
```

### 18.6 De belofte aan de gebruiker

```
"Draag de Loop. Meet bloeddruk eens per week.
 Doe eens per kwartaal een bloedpanel.
 Vertel de concierge wat je start of stopt.

 Vitalix doet de rest."
```

---

## 19. Zeldzame aandoeningen en kanker — aanvullende waarde

> Geen buildtaak voor Sprint 0. Wel een strategische richting voor fase 2+.

### 19.1 Het probleem bij zeldzame kanker

```
Oncoloog bij zeldzame tumor:
→ Ziet misschien 2-3 gevallen per jaar
→ Behandelrichtlijnen gebaseerd op kleine studies
→ Kwartaalcontrole: bloed eens per 3 maanden
→ Scan eens per 6 maanden
→ Patiënt staat er grotendeels alleen voor
   tussen de controles in
```

Standaard oncologie werkt met populatiegemiddelden. Bij zeldzame kanker is er nauwelijks een populatie om van te middelen.

### 19.2 Wat Vitalix biedt dat de oncologie niet heeft

```
Continue biomarkermonitoring:
├── Tumormarkers (CEA, PSA, CA-125 afhankelijk
│   van kankertype) — kwartaalbloedpanel
├── Inflammatiepanel (hsCRP, NLR, IL-6)
│   — proxy voor tumoractiviteit
├── HRV als systemische gezondheidsindex
│   — daalt bij onderliggende ziekte
├── Slaapkwaliteit — daalt vroeg bij recidief
└── Vermoeidheidspatroon — Polar Loop registreert
    afwijkingen van persoonlijke baseline

Interventie-tracking:
→ Reageert immunotherapie op inflammatiemarkers?
→ Daalt hsCRP na chemokuur?
→ Herstelt HRV na behandeling?
→ Wanneer is de persoonlijke baseline hersteld?

Longitudinale data voor de arts:
→ 6 maanden continu data die de oncoloog
   normaal nooit heeft
→ Patronen zichtbaar die in kwartaalcontroles
   onzichtbaar blijven
→ Patiënt komt met feiten, niet met gevoel
```

### 19.3 Waarom dit voor artsen waardevol is

Een oncoloog die een patiënt met een zeldzame tumor ziet, heeft normaal:
- Bloed eens per 3 maanden
- Scan eens per 6 maanden
- Wat de patiënt zichzelf herinnert

Een Vitalix-gebruiker brengt mee:
- Dagelijkse HRV afgelopen 6 maanden
- Wekelijkse bloeddruk
- Slaapkwaliteit gecorreleerd aan behandelperiodes
- Eigen interventie-log met meetbare uitkomsten
- Tijdlijn van wanneer de biologie veranderde

Dat is informatie die de arts nergens anders vandaan krijgt. En bij zeldzame kanker — waar de arts net zo weinig weet als de patiënt — is elke objectieve datapunt waardevol.

### 19.4 Wat Vitalix niet doet

```
Vitalix diagnosticeert niet.
Vitalix vervangt geen oncoloog.
Vitalix geeft geen behandeladvies.

Vitalix meet. En bij kanker is meten —
zelfs zonder de perfecte interpretatie —
fundamenteel beter dan niet meten.
```

### 19.5 De research-dimensie

Geanonimiseerde, longitudinale data van zeldzame kankerpatiënten die continu monitoren is wetenschappelijk waardevol. Niet als diagnostisch instrument — maar als observationele dataset die onderzoekers patronen laat zien die in kleine klinische studies onzichtbaar blijven.

Dit is ook WBSO-grondslag: technische onzekerheid in het detecteren van biomarkerpatronen bij zeldzame aandoeningen via multi-modale data-integratie.

---

## 20. Vitalix als intelligente trainingscoach

> Geen buildtaak voor Sprint 0. Wel een kernpropositie die het platform onderscheidt van elke wearable-app, personal trainer-app en supplement-tool op de markt.

### 20.1 De coach die jou 24/7 kent

Een personal trainer ziet je 1 tot 3 uur per week. Hij raadt wat je nodig hebt. Hij geeft generiek advies op basis van gemiddelden.

Vitalix ziet je 24/7. Het meet wat je nodig hebt. Het geeft advies op basis van jouw biologie op dit specifieke moment.

```
Menselijke coach:
→ 3 uur per week observatie
→ Advies op basis van indruk
→ Geen objectieve data tussen sessies

Vitalix:
→ 24/7 continue monitoring
→ Advies op basis van gemeten waarden
→ Persoonlijke baseline als referentie
→ Crosskoppeling tussen training,
   herstel, voeding, supplementen en slaap
```

### 20.2 Trainingsprogramma als context

Een gebruiker voert eenmalig in:
- Type training (kracht, martial arts, cardio, mobilitiet)
- Weekschema (wanneer, hoe lang, welke intensiteit)
- Trainingszones (op basis van hartslagdrempels)
- Doelen (herstel, prestatie, gezondheid, afvallen)

Vanaf dat moment weet Vitalix altijd:
- Wat je vandaag hebt gedaan
- Wat er morgen gepland staat
- Wat je biologie zegt over de combinatie van die twee

### 20.3 Contextuele coaching — voorbeelden

```
Voorbeeld 1 — hersteladvies:
"Je bent gisteren 47 minuten in zone 4
 geweest terwijl je HRV 18% onder je
 persoonlijke baseline lag.
 Dat verklaart je vermoeidheid vandaag.
 Morgen staat krachttraining gepland —
 overweeg dat te verschuiven naar
 overmorgen."

Voorbeeld 2 — fascia en herstel:
"Na Systema-training duurt jouw
 fascia-herstel gemiddeld 38 uur.
 Dat zie ik aan je HRV-patroon de dag
 erna. Anderen hebben 24 uur nodig.
 Jij niet. Jouw schema houdt hier
 geen rekening mee."

Voorbeeld 3 — circadiaan ritme:
"Je cortisol-piek zit consistent om
 07:30. Je traint nu om 19:00.
 Jouw HRV-data suggereert dat
 ochtendtraining voor jou 23% meer
 herstelcapaciteit oplevert."

Voorbeeld 4 — supplement-koppeling:
"Je Omega-3 index is 4.8% — optimaal
 is 8%+. Je traint 4x per week.
 Lage Omega-3 remt spierherstel en
 verhoogt inflammatie na inspanning.
 Je hsCRP bevestigt dit patroon."

Voorbeeld 5 — ademhaling en zones:
"Je gemiddelde ademfrequentie in rust
 is 14/min. Bij zone 3+ training switch
 je naar mondademhaling — dat zie ik
 aan je HRV-fluctuatie. Overweeg
 Oxygen Advantage neusademhaling
 protocol te introduceren."
```

### 20.4 Kennisgebieden van de coach

De concierge heeft diepgaande wetenschappelijke kennis over:

```
Trainingszones
├── Zone 1-5 definities en fysiologie
├── Persoonlijke drempelberekening
├── Wanneer welke zone — op basis van
│   HRV, doelen en hersteltoestand
└── MAF-methode (Phil Maffetone)

Fascia
├── Herstelprotocollen na verschillende
│   trainingstypes
├── Mobiliteit vs. kracht timing
└── Hydratatie en fasciagezondheid

Ademhaling
├── Oxygen Advantage protocol
├── CO2-tolerantie opbouwen
├── Neusademhaling tijdens training
├── Buteyko-methode basis
└── Ademhaling en HRV-connectie

Voedingssupplementen
├── Alleen aanbevolen bij gemeten tekort
├── Timing van supplementen rondom training
├── Interacties tussen supplementen
└── Doseringen op basis van bloedwaarden

Herstel
├── Actief vs. passief herstel
├── Slaap als primaire herstelinterventie
├── Koudeblootstelling en HRV
└── Stressmanagement en cortisol
```

### 20.5 Wat de coach niet doet

```
Geen generieke trainingsschema's geven
Geen advies zonder data-onderbouwing
Geen claims over prestatieverbetering
Geen vervanging van medische begeleiding
bij blessures of aandoeningen
```

### 20.6 De personal trainer als partner

De intelligente coach maakt personal trainers niet overbodig — het maakt hen beter.

Een personal trainer die Vitalix gebruikt voor zijn klanten heeft toegang tot:
- Hoe de klant herstelt tussen sessies
- Of de intensiteit aansluit bij de biologische capaciteit
- Of supplementen en voeding het trainingseffect ondersteunen
- Objectieve data om het programma op aan te passen

Dit is de ambassadeursrol van de personal trainer: niet vervangen door Vitalix, maar versterkt door Vitalix.

---

*SuperStories BV — Vitalix PRD — v0.1 — 28 maart 2026*
*Sprint 0: persoonlijk tool voor twee pilotgebruikers. Bouw alleen wat hier staat.*
