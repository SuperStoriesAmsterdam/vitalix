# Product Requirements — Vitalix

> Dit document vertelt Claude Code *wat* te bouwen.
> CLAUDE.md vertelt *hoe*. SUPERSTORIES-PLATFORM.md vertelt *met wat*.

**Versie:** 2.0
**Datum:** 2026-04-01

---

## 1. Product Identity

| Field | Value |
|-------|-------|
| Product naam | Vitalix |
| Product ID | `vitalix` |
| One-liner | Persoonlijk preventief gezondheidssysteem dat wearable-data, bloedwaarden en biometrie combineert tot één coherent beeld — en meet of interventies werken. |
| Doelgroep | Gezondheidsbewuste volwassenen 40+, vrouwen 35-55 met hormonaal bewustzijn, mensen zonder medische familiegeschiedenis. Start als privétool voor twee pilotgebruikers: Peter (59) en zijn partner. |
| Kernprobleem | Gezondheidsdata bestaat versnipperd. Niemand verbindt de punten. Huisarts vergelijkt met populatiegemiddelden, niet met jouw persoonlijke baseline. Als je een interventie start meet niemand objectief of het heeft gewerkt. |

---

## 1A. Doelgroep — Vrouwen 35–55

Vrouwen in de perimenopauze ervaren symptomen die door reguliere zorg systematisch worden onderschat: vermoeidheid, slaapproblemen, stemmingswisselingen, gewichtstoename, concentratieproblemen. De standaardreactie van de huisarts is een bloedtest met populatiewaarden die "normaal" zeggen — terwijl de vrouw zelf weet dat er iets veranderd is.

Vitalix geeft hen wat de huisarts niet kan geven: een longitudinale spiegel van hun eigen biologie. Niet de norm van een gemiddelde vrouw — hun eigen baseline, over maanden opgebouwd.

**Wat Vitalix specifiek doet voor deze groep:**
- HRV en slaapkwaliteit als objectieve maat voor hormonale schommelingen — oestrogeen en progesteron beïnvloeden direct de autonome zenuwstelselactiviteit
- Cortisol-tracking (speekseltest ochtend/avond) om het dag-ritme te volgen — een afgevlakt cortisol-ritme is een vroeg signaal van HPA-as disregulatie
- Cyclus als context-laag: labwaarden worden geïnterpreteerd relatief aan de cyclusfase, niet als losse getallen
- Interventie-tracking: HRT, voeding, supplementen — objectief meten of het werkt
- Verbinding met de estroboloom: darmmarkers (calprotectine, zonuline) beïnvloeden oestrogeenmetabolisme via β-glucuronidase. Dit verband is medisch onderbouwd maar wordt in de praktijk zelden gemeten.

**Pilotgebruiker 1A:** Maya (partner van Peter) — post-oncologie ER+/PR+/HER2-, op aromatase-remmers, hersteld van leaky gut.
**Pilotgebruiker 1D:** Maddy — perimenopauze, vermoedelijk MTHFR-variant, Whoop + Withings BPM Vision.

---

## 1B. Doelgroep — Mannen 45–65 met cardiovasculair risico

Mannen in deze leeftijdsgroep hebben het hoogste cardiovasculaire risico maar de laagste zorgconsumptie — ze gaan pas naar de dokter als er iets mis is. Preventie is abstract. "Je bloeddruk is een beetje hoog" leidt zelden tot gedragsverandering.

Vitalix maakt preventie concreet door het persoonlijk en longitudinaal te maken. Niet "jouw bloeddruk is 138/88 — dat is licht verhoogd voor jouw leeftijd." Maar: "jouw bloeddruk is de afgelopen drie weken gestegen van 132 naar 141 — dat is een trend die aandacht verdient."

**Wat Vitalix specifiek doet voor deze groep:**
- Bloeddruktrend over tijd, niet één meting — de trend is informatiever dan de absolute waarde
- HRV als vroege cardiovasculaire stressmarker — daalt aantoonbaar weken voor klinische symptomen
- hsCRP + homocysteïne als ontstekings- en methylatiemarkers — beiden geassocieerd met cardiovasculair risico en beïnvloedbaar via leefstijl
- Testosteron + cortisol voor hormonale context — laag testosteron bij mannen >50 beïnvloedt cardiovasculair risico, energie en herstel
- Interventie-feedback: voeding, slaap, supplementen — meet objectief wat werkt

**Pilotgebruiker 1B:** Peter (59) — onregelmatige hartslag, schildklierhistorie, geen DNA-informatie vaderszijde.

---

## 1C. Doelgroep — Mensen zonder medische familiegeschiedenis

Geadopteerden, mensen met onbekende biologische vader, donorkinderen, emigranten zonder contact. Voor hen is familiegeschiedenis niet een aanvulling op gezondheidsdata — het ontbreekt volledig. De standaard anamnese van de huisarts ("loopt hart- en vaatziekte in de familie?") heeft geen antwoord.

Voor deze groep is longitudinale persoonlijke data niet luxe maar noodzaak. Zij bouwen hun eigen referentie op omdat er geen andere is.

**Productimplicaties:**
- Intake: familiegeschiedenisveld met expliciete optie "gedeeltelijk/volledig onbekend" — geen verplicht veld
- Dashboard: geen familierisicokleur of -vergelijking, extra nadruk op persoonlijke trendlijn
- Messaging: "Bouw je eigen referentie op" — niet "vergelijk met je familie"
- 23andMe-integratie is voor deze groep geen nice-to-have maar een kernfeature: genetische risicomarkers als gedeeltelijke vervanging van familiegeschiedenis
- MTHFR (methylatie), COMT (catecholamine-afbraak), APOE (cardiovasculair/Alzheimer-risico) — SNPs die relevant zijn zonder familiecontext

**Pilotgebruiker 1C:** Peter (59, geen DNA-informatie vaderszijde).

---

## 1D. Kernprincipes

**Just the facts** — alleen wat meetbaar en aantoonbaar is. Geen diagnoses, geen speculatie. Als een inzicht niet onderbouwd kan worden met de beschikbare data van die gebruiker, wordt het niet gegenereerd. De AI mag correlaties benoemen, nooit causaal redeneren buiten de data.

**Het hele systeem** — HRV daalt, hsCRP stijgt, slaap verslechtert: drie signalen van hetzelfde proces. Geen enkel apparaat ziet dit. De huisarts ziet het bloedresultaat maar niet de wearable-data. Vitalix verbindt de punten — en vraagt altijd meerdere markers als bevestiging voor een inzicht. Één afwijkende waarde is een observatie. Drie gelijktijdige afwijkingen zijn een patroon.

**Persoonlijke baseline boven populatienorm** — de populatienorm is context, nooit het primaire oordeel. Zie sectie 11 voor de volledige uitwerking.

**Hoop als ontwerpmechanisme** — Vitalix toont nooit alleen een probleem. Elke afwijking wordt vergezeld van wat haalbaar is voor deze specifieke persoon, gebaseerd op hun eigen historische data. Niet "je HRV is laag." Maar: "je HRV was 8 weken geleden 47ms — dat is voor jou haalbaar."

**Wat Vitalix niet is:**
- **Geen medisch apparaat** → geen diagnoses, geen behandeladviezen, geen medicatiewijzigingen. Bij klinische drempelwaarden: altijd doorverwijzen naar de arts.
- **Geen supplement-winkel** → Vitalix heeft geen commercieel belang bij welk product dan ook. Supplementen worden alleen besproken in de context van meetbare markerveranderingen.
- **Geen vervanging van de arts** → aanvulling op. De waarde van Vitalix zit in de voorbereiding: naar de arts gaan met 6 maanden longitudinale data in plaats van één meting van 5 minuten geleden.
- **Geen motivatie-app** → geen streaks, geen badges, geen punten. De enige beloning is inzicht.

---

## 2. Hardware Stack & Gateway-model

De wearable is de **gateway** naar de rest van de stack. Je kiest een wearable → dat opent de HRV/slaap/herstellaag → labs, DNA en microbioom zijn altijd hetzelfde ongeacht de gateway.

Onboarding begint met: "Welke wearable heb je?" — dat bepaalt de OAuth-flow, niet de features.

| Gateway | Prijs | Wat het meet | Gebruiker | Sprint |
|---------|-------|--------------|----------|--------|
| **Polar Loop 2** | ~€100 | HRV, slaap, herstel, activiteit | Peter | Sprint 0 (MVP) |
| **Whoop** | €0 + abo | HRV, slaap, recovery score, strain | Maddy | Sprint 0 (MVP) |
| Oura Ring | ~€350 | HRV, slaap, temp, readiness | — | Sprint 1 |
| Garmin | variabel | HRV, slaap, activiteit | — | Sprint 2 |

| Apparaat | Prijs | Wat het meet |
|----------|-------|--------------|
| Withings BPM Vision | €179 | Bloeddruk, hartslag, AFib |
| Braun ThermoScan 7 IRT6520 | ~€45 | Temperatuur (handmatig) |
| **Totaal MVP hardware** | **~€324** | |

| Test | Prijs | Frequentie |
|------|-------|-----------|
| mijnlabtest.nl bloedpanel | variabel | 5× per jaar |
| 23andMe Health+Ancestry | €189 | Eenmalig |
| Medivere Darm Microbioom Zelftest Plus | variabel | 1–2× per jaar |

**Sprint 2:** CGM (FreeStyle Libre / LibreView API)

---

## 3. UX Model

### Centraal principe

**Open → zie wat er is → voer iets in als dat relevant is → sluit.**

Maximaal 90 seconden per sessie. De app werkt op de achtergrond.

---

### Scherm 1: Dashboard

Metric cards tonen: laatste waarde + sparkline (7 dagen) + % vs. baseline + trend-pijl.

Status bovenaan: groen (alles OK) / oranje (één afwijking) / rood (meerdere afwijkingen tegelijk).

Onderaan: **Wist je dat** — dagelijks feit contextgebonden aan de data van die dag.
Formule: observatie → concrete consequentie → waarom dit voor jou telt. Nooit een feit zonder landing.

---

### Metric detail (tik op card)

Drie visualisatielagen:
1. **Medische vloer/plafond** — wat zegt de literatuur voor jouw leeftijd/geslacht
2. **Leeftijdsgecorrigeerd percentiel** — waar sta je relatief
3. **Persoonlijke trajectlijn** — beweeg je de goede kant op

**Hoop als ontwerpmechanisme:**
- Onder baseline → "haalbaar voor jou" + concreet gedrag
- Boven baseline → "jouw plafond" + wat dat betekent
- Altijd de proximate stap, nooit het verre doel

---

### Scherm 2: Dagelijkse invoer

Drie velden, alles optioneel:
1. **Energie-slider** 1–5 (uitgeput → scherp) — concreet, niet emotioneel
2. **Context-knoppen** (multi-select): Alcohol / Laat naar bed / Hard getraind / Stressvolle dag / Voel me niet lekker / Niks
3. **Temperatuur** (numeriek) + optionele notitie

Geen "hoe voel je je". Geen emoji-schaal. Gedragsobservaties, niet gevoelens.

**Adaptieve follow-up:** alleen als data een anomalie toont die nog geen context heeft.
Voorbeeld: HRV 18% onder baseline + gebruiker selecteert "Niks" →
*"Je HRV is lager dan normaal maar je geeft geen aanleiding aan. Had je gisteren meer cafeïne dan normaal?"*

---

### Scherm 3: Vraag stellen

Vrije tekst → Claude krijgt alle recente data + persoonlijk profiel als context.
Antwoorden worden opgeslagen als `insights` met decision extraction.
Geschiedenis van eerdere vragen zichtbaar.

---

### Scherm 4: Profiel (via ⚙)

- Diagnoses / operaties / medicatie / supplementen
- Familiegeschiedenisstatus (beschikbaar / gedeeltelijk / volledig onbekend)
- Reviewer tier (gebruiker / expert)

---

### Navigatie

```
[🏠 Dashboard]  [+ Invoer]  [💬 Vraag]
```

---

### Gedragsverandering — principes

- **Identiteit boven prestatie:** "Je meet nu 23 dagen — dit is wanneer patronen zichtbaar worden."
- **Spiegel, niet coach:** de app toont, stelt vragen — geeft geen opdrachten
- **Partner-zichtbaarheid:** beide gebruikers zien elkaars readiness — stille accountability
- **Groeien door te verschijnen:** niet door te presteren

---

## 4. Tech Stack

| Component | Keuze |
|-----------|-------|
| Backend | FastAPI |
| Frontend | React 18 + Vite + TypeScript |
| Styling | TailwindCSS v4 |
| Database | PostgreSQL |
| Background jobs | ARQ + Redis |
| Deployment | Hetzner + Coolify |
| AI | Anthropic Claude API (met prompt caching) |

**Data-soevereiniteit:** alle data op eigen Hetzner-server. Geen SaaS-database. Encryptie at rest en GDPR-flows komen bij externe gebruikers — niet nodig voor Sprint 0.

---

## 5. Bible Architectuur

### Laag 1 — Identiteit (altijd geladen, gecached)
**Bestand:** `vitalix_identity.md`

- Rol en grenzen (geen diagnoses, geen medicatieadvies)
- Veiligheids-gates: bloeddruk >160/100 → altijd arts-melding; AFib → meld en verwijs; nooit diagnosticeren
- Analyseprincipes: persoonlijke baseline boven populatienorm, multi-marker bevestiging vereist
- Chain of Thought structuur + Decision Extraction instructie
- Prompt caching: `cache_control: {"type": "ephemeral"}`

### Laag 2 — Hardware / domein-kennis (conditioneel)
**Bestanden:** `hardware/*.md` — geladen op basis van actieve apparaten van de gebruiker.

Elk bestand bevat: wat het apparaat meet, hoe de data geïnterpreteerd moet worden, bekende beperkingen, en specifieke drempelwaarden voor dat apparaat.

| Bestand | Inhoud |
|---------|--------|
| `polar.md` | ANS-charge interpretatie, Nightly Recharge methodologie, verschil rmssd vs ans_charge, normale variatie per leeftijdsgroep |
| `whoop.md` | Recovery score algoritme, strain vs. recovery balans, hoe Whoop HRV berekent (5-minutenvenster eerste slaapuren) |
| `withings_bpm.md` | AFib-detectie methodologie, verschil systolisch/diastolisch trend, wanneer doorverwijzen |
| `mijnlabtest.md` | Welke markers beschikbaar zijn, eenheden, normale verwerkingstijd, hoe meerdere metingen over tijd te interpreteren |
| `23andme.md` | Welke SNPs relevant zijn (MTHFR C677T/A1298C, COMT Val158Met, APOE), wat ze betekenen en — even belangrijk — wat ze niet betekenen |
| `medivere_microbioom.md` | Diversiteitsscores, specifieke bacteriestammen die oestrogeenmetabolisme beïnvloeden (estroboloom), calprotectine als ontstekingsmarker |

Niet-gekoppelde apparaten worden niet geladen. Een gebruiker zonder 23andMe krijgt geen genetische interpretatie.

### Laag 3 — Referentiedata (altijd geladen, gecached)
**Bestand:** `vitalix_reference_data.json`

Bevat de populatienormen die als secundaire referentielaag dienen (zie sectie 11). Gesegmenteerd op leeftijd, geslacht en relevante gezondheidsstatus.

Inhoud:
- HRV-normaalwaarden per leeftijdsdecennium en geslacht (gebaseerd op gepubliceerde literatuur)
- Bloeddrukdrempelwaarden (ESC-richtlijnen 2023)
- Labmarker referentiewaarden per leeftijdscategorie en geslacht
- Bekende correlaties tussen markers (hsCRP ↑ + HRV ↓ = ontstekingssignaal; cortisol-ritme afwijking + slaapefficiëntie ↓ = HPA-as stress)
- Interventie-responsdata uit literatuur (wat is een realistische verbetering bij x supplement na y weken)

Deze data wordt periodiek bijgewerkt door de Dirigent (Peter). Bij 1.000+ gebruikers wordt dit aangevuld met Vitalix-eigen cohortdata.

### Prompt-structuur
```
Block 1 (gecached): vitalix_identity.md + vitalix_reference_data.json
Block 2 (dynamisch): gebruikersprofiel + geleerde voorkeuren + actieve hardware-blokken + recente metingen
```

---

## 6. Insight Systeem & Feedback Loop

### Insight types

| Type | Voorbeeld | Feedbackhorizon |
|------|-----------|----------------|
| `dagadvies` | "Rust vandaag — HRV 18% onder baseline" | +16–24u |
| `correlatie` | "HRV daalt consistent na late avonden" | +10 dagen |
| `trend` | "Bloeddruk verbetert structureel" | +6 weken |
| `anomalie` | "Bloeddruk 142/91 — opvallend hoog voor jou" | volgende meting |

### Decision Extraction

Elke insight sluit af met een verborgen JSON-blok:
```json
[{
  "category": "readiness",
  "choice": "Rust adviseren",
  "alternatives_considered": ["Lichte training OK"],
  "reasoning": "Multi-marker: HRV laag + rusthartslag verhoogd + slaap 5u40"
}]
```
Gestript en opgeslagen in `insights.decisions` (JSONB).

### Review module (4 stappen)

1. **Verdict** (verplicht, 15 sec): Klopte precies / Grotendeels / Eén ding anders / Klopte niet
2. **Welke beslissing** (optioneel): klikbare decision cards
3. **Waarom** (optioneel): alternatief + redenering — het meest waardevolle
4. **Tip** (optioneel): vrij tekstveld

### Drie feedbacktypen

| Type | Prioriteit | Actief wanneer |
|------|-----------|---------------|
| `preference` | Laag | ≥3 onafhankelijke inputs |
| `factual_correction` | Hoog | Meteen — alert admin |
| `context_dependent` | Medium | ≥3 vergelijkbare inputs |

### Reviewer tiers

| Tier | Wie |
|------|-----|
| `user` | Peter / partner |
| `expert` | Personal trainer |
| `medical` | Huisarts (toekomst) |

### Intelligence loop

```
Insight + Decisions → Review → Learned Preferences → Prompt Block 2 → betere volgende Insight
```

Chain of Thought stap 0: "GELEERDE VOORKEUREN: pas keuzes aan, verwijs er expliciet naar."

### Wanneer wordt een inzicht gegenereerd?

Inzichten worden **trigger-based** gegenereerd — niet op schema. Dit houdt de AI-kosten laag en voorkomt ruis.

| Trigger | Drempel | Inzicht-type |
|---------|---------|-------------|
| Marker > 1.5× std boven/onder baseline | Eén meting | `anomalie` |
| Marker > 1× std voor 3+ achtereenvolgende dagen | Patroon | `trend` |
| Twee of meer markers tegelijk afwijkend | Multi-marker | `correlatie` |
| Dagelijkse invoer bevat context zonder wearable-verklaring | Adaptief | `dagadvies` |
| Interventie-checkpoint (4/8/12 weken) | Tijd-gebaseerd | `trend` |

Bij geen afwijkingen: geen inzicht. De app is stil als alles binnen normaal valt — dat is ook informatie.

### Dirigent / Gebruiker model

Dit onderscheid is cruciaal voor de kwaliteit van het systeem op lange termijn.

**De Dirigent** (Peter, of later een beheerder) is de enige die de bibles aanpast. Hij beslist welke informatie in `vitalix_identity.md` staat, welke hardware-bestanden worden onderhouden, en welke referentiedata geldig is. Dit is bewuste kwaliteitscontrole — als elke gebruiker de bible kon aanpassen, degradeert de kwaliteit snel.

**De Gebruiker** beïnvloedt het systeem via feedback, niet via directe configuratie. Een gebruiker die "klopte niet" aanklikt bij een inzicht levert waardevolle data op — maar past de bible niet zelf aan. De Dirigent beoordeelt of die feedback een structurele aanpassing rechtvaardigt.

**Waarom dit belangrijk is bij schaal:** bij 10.000 gebruikers zijn er altijd mensen die het systeem willen "verbeteren" op basis van hun eigen gezondheidsovertuigingen. Die individuele input kan waardevol zijn als feedback, maar niet als directe bijdrage aan de gedeelde kennislaag. De Dirigent filtert dat.

---

## 7. Data Model

### users
```
id, email, password_hash, display_name, date_of_birth, sex
withings_access_token, withings_refresh_token
polar_access_token, polar_user_id
family_history: ENUM(available, partial, unknown)
reviewer_tier: ENUM(user, expert, medical)
created_at
```

### hrv_readings (Polar)
```
id, user_id, date
rmssd (ms), ans_charge (0-100)
deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes
sleep_efficiency, sleep_latency_minutes, sleep_score
source: "polar"
```

### blood_pressure_measurements (Withings)
```
id, user_id, measured_at
systolic (mmHg), diastolic (mmHg), heart_rate (bpm)
source: "withings" | "manual"
```

### lab_markers (handmatig)
```
id, user_id, measured_at
test_type: blood | saliva | urine | stool
marker_name, value, unit
source: "manual" | "pdf_ocr"
```

**Key markers:** hrv_rmssd, ans_charge, blood_pressure_systolic/diastolic, sleep_score, temperature, testosterone, cortisol, tsh, hba1c, glucose_fasting, hscrp, vitamin_d, ferritin, microbiome_diversity, calprotectin, snp_cardiovascular_risk

### daily_inputs
```
id, user_id, input_date
energy_level (1-5)
context_flags (JSON): ["alcohol", "late_bed", "hard_training", "stressful", "sick"]
note (text, optioneel)
```

### baselines
```
id, user_id, marker_name
baseline_value, std_deviation
data_points, is_stable, stability_threshold
calculated_at
```

### interventions
```
id, user_id, name, intervention_type
started_at, baseline_snapshot (JSON)
status: active | completed | abandoned
```

### insights
```
id, user_id, insight_type
content (text), thinking (text)
decisions (JSONB)
feedback_due_at, reviewed (boolean)
created_at
```

### insight_reviews
```
id, insight_id, user_id, reviewer_tier
verdict: exact | mostly | partial | wrong
created_at
```

### decision_reviews
```
id, review_id, decision_index
original_choice, alternative, reasoning
correction_type: preference | factual_correction | context_dependent
```

### learned_preferences
```
id, user_id, category, context (500), preference
source_type, source_review_id
frequency (int), active (bool)
```

---

## 8. Routes

| Route | Methode | Functie |
|-------|---------|---------|
| `/` | GET | Dashboard (Jinja2) |
| `/input` | GET/POST | Dagelijkse invoer |
| `/ask` | GET/POST | Vraag stellen |
| `/profile` | GET/POST | Profiel |
| `/polar/auth` | GET | Polar OAuth start |
| `/polar/callback` | GET | Polar OAuth callback |
| `/polar/status/{user_id}` | GET | Koppelstatus |
| `/withings/auth` | GET | Withings OAuth start |
| `/withings/callback` | GET | Withings OAuth callback |
| `/health/dashboard/{user_id}` | GET | Dashboard data (JSON) |
| `/health/users/{user_id}/lab` | POST/GET | Lab invoer |
| `/health/users/{user_id}/interventions` | POST/GET | Interventies |
| `/health/users/{user_id}/alerts` | GET | Alerts |

---

## 9. Sprint Plan

### Sprint 0 — MVP (nu)
- [x] FastAPI structuur + PostgreSQL schema
- [x] Polar AccessLink client (OAuth + HRV/slaap/activiteit)
- [x] Withings OAuth + data sync
- [x] Baseline calculator
- [x] Dashboard JSON endpoint
- [x] Lab invoer + interventies
- [x] Polar router (OAuth auth + callback)
- [x] DailyInput model
- [x] React + Vite + TailwindCSS frontend scaffold
- [x] Dashboard UI (MetricCards, HRVChart, BloodPressureChart, AlertBanner)
- [x] EnergyInput component (5-punt schaal + context flags)
- [x] Dagelijkse invoer UI
- [x] ARQ sync jobs (Withings + Polar + Whoop)
- [x] .env.example + config
- [x] scripts/seed.py (Peter + Maya + Maddy)
- [x] Magic link authenticatie (auth.py)
- [x] Whoop integratie (OAuth + HRV/slaap sync)
- [ ] Eerste deployment op Hetzner

### Sprint 1 — Intelligence
- [ ] Claude API + prompt caching
- [ ] vitalix_identity.md + vitalix_reference_data.json
- [ ] Insight generatie met decision extraction
- [ ] Vraag stellen → insight opslaan
- [ ] Review module (4 stappen)
- [ ] Learned preferences → prompt injectie
- [ ] Adaptieve follow-up bij anomalie
- [ ] Wist-je-dat feit (contextgebonden)
- [ ] Hoop-visualisatie (baseline + haalbaar + plafond)
- [ ] Oura gateway (Sprint 1 alternatief)

### Sprint 2 — Verdieping
- [ ] CGM (FreeStyle Libre)
- [ ] PDF-upload labresultaten (OCR)
- [ ] Partner-zichtbaarheid
- [ ] Expert reviewer (personal trainer)
- [ ] Interventie-rapport (delta T=0 vs T=84 dagen)
- [ ] Garmin gateway

---

## 10. Wat dit NIET is

Deze grenzen zijn geen juridische disclaimers — het zijn ontwerpkeuzes die bepalen wat Vitalix wel en niet bouwt.

**Geen ratingsysteem.** Er zijn geen scores, geen ranglijsten, geen "gezondheidsleeftijd" of "biologische leeftijd" getallen. Die zijn altijd simplificaties die meer misleiden dan informeren. Vitalix toont trends en afwijkingen — geen eindoordeel.

**Geen diagnose-machine.** Vitalix herkent patronen en benoemt afwijkingen. Het stelt nooit een diagnose. "Jouw hsCRP is consistent verhoogd en je HRV daalt — dit kan wijzen op een ontstekingsproces" is een observatie. "Je hebt een ontstekingsziekte" is een diagnose. Dat verschil wordt in elke AI-output gehandhaafd.

**Geen vervanging van de arts.** De waarde zit in voorbereiding en longitudinaliteit. Een gebruiker die naar de huisarts gaat met 6 maanden HRV-data, bloeddruktrends en labwaarden heeft een betere afspraak dan iemand die aangeeft dat ze "zich al een tijdje moe voelt." Vitalix maakt de arts effectiever, niet overbodig.

**Geen publieke app in Sprint 0.** Vitalix begint als privétool voor maximaal drie mensen op een eigen server. Geen registratie, geen onboarding flow, geen publieke URL. Dit is bewust: de eerste versie moet kloppen voor mensen die je kent, voor je hem uitrolt naar mensen die je niet kent.

**Geen motivatie-app.** Geen dagelijkse push-notificaties, geen streaks, geen "je hebt 7 dagen op rij gemeten!" badges. De enige reden om de app te openen is als er iets te zien is. Stilte is ook een boodschap.

**Geen black box.** Elk inzicht vermeldt welke markers het hebben getriggerd en wat de redenering is. De gebruiker hoeft het niet te accepteren — hij kan het betwisten via de review module. Transparantie is geen feature, het is een architectuurprincipe.

---

*PRD versie 2.0 — 2026-04-01*
*Samengesteld op basis van gesprekken Peter van Rhoon + Claude*

---

## 11. Positionering & Vertrouwensprincipes

### De kern van de propositie

Vitalix doet geen diagnostische claims. Het systeem herkent afwijkingen van de **persoonlijke baseline** en biedt contextuele interpretatie. De gebruiker wordt altijd aangesproken als intelligent volwassene.

**Nooit:** "Dit is wat er mis is."
**Altijd:** "Dit patroon wijkt af van jouw normaal — het is de moeite waard om dit te bespreken met je arts als het aanhoudt."

Dit is niet alleen een juridische keuze. Het is eerlijker, en voor de doelgroep geloofwaardiger dan claims die zij toch niet kunnen controleren.

---

### De twee referentielagen

Vitalix gebruikt altijd twee lagen — in die volgorde van prioriteit:

| Laag | Wat het zegt | Primair |
|------|-------------|---------|
| **Persoonlijke baseline** | "Jouw HRV de afgelopen 30 dagen is gemiddeld 42ms. Vandaag: 31ms — 26% onder jouw normaal." | ✅ Ja |
| **Populatienorm** | "Voor mannen 55–65 is 25–55ms het normale bereik. Jij zit binnen dat bereik." | Nee — context |

Populatienorm is altijd secundair. Het antwoordt op: "Ben ik überhaupt gezond?" Persoonlijke baseline antwoordt op: "Verandert er iets in mij?"

De huisarts vergelijkt je met de populatie. Vitalix vergelijkt je met jezelf. Dat is het verschil.

**In de UI:** elke metric card toont beide lagen. Persoonlijke baseline groot en centraal. Populatienorm als kleinere contextregel eronder: *"Normaalwaarde voor jouw leeftijd: 25–55ms."*

---

### Wat wearables niet kunnen — en Vitalix wel

Wearables (Whoop, Polar, Oura) leren ook. Maar hun leren is:
- **Opgesloten** — je ziet de score, niet de redenering
- **Eendimensionaal** — alleen hun eigen data, geen labs, geen cyclus, geen interventiehistorie
- **Niet-transparant** — je kunt niet navragen waarom je recovery 62% is

Vitalix maakt het leren **zichtbaar en uitbreidbaar:**
- Je ziet welke markers een inzicht sturen
- Je kunt context toevoegen die de score verklaart
- Je kunt een interventie markeren op dag 0 en meten op dag 84

---

### Het verschil met wearable-ecosystemen — concreet

Whoop zegt: *"Get a complete picture of your health."*
Dat is hun propositie. Ze breiden uit richting ECG, bloeddruk, AFib — steeds meer data in één apparaat.

Maar het blijft **hun** plaatje. Hun algoritme bepaalt je recovery score. Je ziet het getal, niet de redenering. Je kunt niet vragen: *"Waarom is mijn recovery vandaag 58%? Is dat door mijn slaap, mijn cortisol, of mijn bloeddruk van gisteravond?"* En als je dat al vraagt aan de Whoop-app, weet die niets van je TSH, niets van je homocysteïne, niets van het probiotica-kuur die je drie weken geleden begon.

**Vitalix doet iets fundamenteel anders:**

Wearable-data is de *input*, niet het *eindproduct*. De Whoop (of Polar, of Oura) levert de HRV, slaap en hersteldata. Vitalix combineert dat met:
- Bloedwaarden (TSH, hsCRP, testosteron, vitamine D, ferritine)
- Cortisolprofiel
- Microbioomdata
- Dagelijkse context (alcohol, stress, ziekte)
- Medicijnen en supplementen
- Familiegeschiedenis
- Actieve interventies

En vergelijkt alles met **jouw eigen baseline** — niet met een populatiegemiddelde.

Dan kun je vragen stellen. Niet aan een algoritme dat een getal uitspuugt, maar aan een systeem dat jouw volledige gezondheidspicture kent en zijn redenering laat zien.

**Het onderscheid in één zin:**
> Wearables vergelijken je met miljoenen andere mensen. Vitalix vergelijkt je met jezelf — en met de versie van jou die het beste functioneert.

---

### Communicatieprincipe: de wearable is de ingang, niet het doel

In alle externe communicatie over Vitalix geldt: de wearable wordt nooit gepresenteerd als het product. Het is de sensor. Het product is het patroonherkenning + de persoonlijke context + de mogelijkheid om vragen te stellen aan een systeem dat alles weet.

Dit voorkomt dat Vitalix wordt gezien als "een app bij je Whoop" — het is andersom. Vitalix gebruikt de Whoop (of Polar, of Oura) als databron. De intelligentie zit in Vitalix.

---

### De inzicht-formule (vast, voor elke output)

> *"Jouw [marker] ligt [X%] [boven/onder] jouw persoonlijke baseline van de afgelopen [periode]. Dit kan samenhangen met [context]. Populatienorm voor [profiel]: [range]. Als dit patroon aanhoudt is het de moeite waard dit te bespreken met je arts."*

Nooit een inzicht zonder:
1. Vergelijking met persoonlijke baseline (verplicht)
2. Populatienorm als context (verplicht)
3. Mogelijke verklaring (als context beschikbaar)
4. Volgende stap (altijd concreet en dichtbij)

---

### Website-copy (homepage)

> "Wij vergelijken je niet met een gemiddelde. Wij vergelijken je met jezelf — gisteren, vorige maand, voor en na een interventie. Als iets afwijkt van jouw normaal, laten we dat zien. Wat het betekent, bepaal jij — samen met je arts."


---

## 12. Schaalmodel & Netwerkeffect

### Het kernargument schaalt mee

Het onderscheidende argument van Vitalix — persoonlijke baseline primair, populatienorm secundair — wordt bij schaal **sterker**, niet zwakker. De architectuur is daar vanaf Sprint 0 op ingericht.

---

### Baseline-berekening schaalt gratis

Baselines zijn per gebruiker een statistische berekening (rolling mean + standaarddeviatie). PostgreSQL verwerkt dit in milliseconden voor 10.000 gebruikers. Geen infrastructuurwijziging nodig. De code staat er al.

---

### Eigen populatienormen als proprietary asset

Nu: referentiewaarden uit medische literatuur.
Bij 10.000 gebruikers: Vitalix-populatiedata — gesegmenteerd op leeftijd, geslacht, gezondhedsprofiel, wearable, interventiehistorie.

> *"Vrouwen 45–55 op endocriene therapie met jouw profiel hebben in Vitalix gemiddeld een HRV van 34ms."*

Dat staat nergens in de literatuur. Dat is een proprietary dataset die geen wearable kan bouwen — omdat zij de labdata niet hebben.

---

### AI-kosten zijn geen businessprobleem

Inzichten worden trigger-based gegenereerd — alleen wanneer een marker afwijkt van de persoonlijke baseline. Niet voor alle gebruikers elke dag.

| Aanname | Waarde |
|---------|--------|
| Dagelijkse triggers (20% van gebruikers) | 2.000 calls |
| Kosten per call (Claude Haiku + prompt caching) | ~€0,0005 |
| Dagelijkse AI-kosten bij 10.000 gebruikers | €1 |
| Jaarlijkse AI-kosten | €365 |

Bij een abonnement van €30/maand × 10.000 gebruikers = €3,6M ARR tegenover €365 AI-kosten. Geen businessprobleem.

---

### Het netwerkeffect — wat geen wearable kan bieden

Bij schaal ontstaat cohortintelligentie. Mensen met vergelijkbare profielen, dezelfde interventies, vergelijkbare labwaarden — hun gecombineerde data produceert inzichten die in geen enkele klinische studie bestaan.

> *"Mensen met jouw profiel — vrouw, 45–55, verhoogd homocysteïne, laag ferritine, perimenopauze — die 5-MTHF methylfolaat startten zagen gemiddeld na 8 weken een daling van 22% in homocysteïne. Jij bent nu in week 6."*

Whoop heeft dit niet. Polar heeft dit niet. De literatuur heeft dit niet op dit detailniveau. Dit is Vitalix-data — opgebouwd uit gebruikers die hun interventies consequent bijhouden.

Dit is een echte network effect: meer gebruikers → betere cohorten → rijkere interpretaties → hogere retentie → meer gebruikers.

---

### Wat bij schaal extra moet worden gebouwd

Deze drie dingen zijn bewust uitgesteld — ze zijn niet nodig voor Sprint 0 met twee pilotgebruikers op een eigen server. Maar ze zijn geen afterthought: ze moeten gebouwd zijn vóórdat je de eerste externe gebruiker toelaat.

---

#### 1. Medische veiligheidsprotocollen

Bij twee gebruikers die je persoonlijk kent is het risico beheersbaar. Bij 10.000 anonieme gebruikers tref je statistisch gezien mensen in acute situaties — een hypertensieve crisis, een HRV-patroon dat wijst op ernstige overtraining of ziekte, een labwaarde die directe medische aandacht vereist.

**Wat dit concreet betekent:**

De veiligheids-gates die nu al in `vitalix_identity.md` staan (bloeddruk >160/100 → altijd arts-melding; AFib → meld en verwijs) worden bij schaal codified in de alert-engine — niet alleen in de AI-prompt. Het systeem handelt zelfstandig, zonder dat de AI er tussenin hoeft.

Daarnaast: een medisch adviseur (huisarts of specialist) die de drempelwaarden mede-ondertekent. Niet als decoratie op de website, maar als iemand die de escalatielogica heeft gereviewed en daarmee juridisch mede-verantwoordelijk is. Dat verlaagt het risico voor Vitalix en verhoogt de geloofwaardigheid bij gebruikers én investeerders.

**Wanneer:** vóór de eerste externe gebruiker. Niet erna.

---

#### 2. GDPR-infrastructuur

Nu staat alle data van Peter en Maya op een Hetzner-server die Peter zelf beheert. Dat is juridisch simpel — hij is tegelijk verwerkingsverantwoordelijke en betrokkene.

Zodra Maddy instapt — en zeker zodra er onbekende gebruikers bijkomen — verandert de juridische realiteit volledig.

**Wat er dan moet zijn:**

- **Verwerkersovereenkomsten** met Polar, Whoop en Withings. Die bedrijven verwerken gezondheidsdata namens jou. Dat vereist een DPA (Data Processing Agreement). Polar en Withings hebben standaard DPA's — die moet je activeren.
- **Expliciete consent bij onboarding** — artikel 9 AVG maakt gezondheidsdata bijzondere persoonsgegevens. Verwerking vereist uitdrukkelijke toestemming, specifiek per doel.
- **Recht op inzage en verwijdering** — een gebruiker moet op elk moment al zijn data kunnen downloaden en laten verwijderen. Dat is nu niet gebouwd.
- **Bewaartermijnen** — hoe lang bewaar je HRV-data als iemand zijn account opzegt? Dat moet vastgelegd zijn in een privacybeleid.
- **Datalekprocedure** — bij een datalek moet je binnen 72 uur melden bij de Autoriteit Persoonsgegevens.

**Wanneer:** vóór externe gebruikers. De technische bouwblokken (delete endpoint, export endpoint) komen in Sprint 2. Het juridische document (privacybeleid + verwerkersregister) kan eerder.

---

#### 3. Segmentatie in de Bible

De huidige `vitalix_identity.md` is één bestand met één set analyseprincipes. Dat werkt voor Peter en Maya. Bij schaal wordt de diversiteit van gezondheidsprofielen zo groot dat één bible bot wordt.

**Het probleem:**

Een vrouw van 48 post-oncologie op aromatase-remmers heeft een volledig ander interpretatiekader nodig dan een man van 60 met cardiovasculair risico. Dezelfde HRV-daling betekent iets anders. Dezelfde cortisol-waarde ook. Een generieke bible maakt fouten — niet per se gevaarlijke, maar onderpresterende.

**De oplossing — al ingezet met het gateway-model:**

De hardware-laag in de Bible-architectuur (Laag 2) is al conditioneel: `polar.md`, `whoop.md`, `withings_bpm.md` worden geladen op basis van de actieve apparaten van de gebruiker. Hetzelfde principe geldt voor gezondheidsprofielen.

```
profiel_post_oncologie_er_positief.md
profiel_perimenopauze.md  
profiel_cardiovasculair_man.md
profiel_onbekende_familiegeschiedenis.md
```

Elk profiel voegt een extra interpretatielaag toe aan Block 2 van de prompt. De identiteitslaag (veiligheids-gates, basisprincipes) blijft universeel in Block 1.

**Wanneer:** Sprint 3. De architectuur staat er al — het is invulwerk op het moment dat je de tweede doelgroep serieus bedient. Maddy's profiel (`post_oncologie_er_positief.md`) is de eerste kandidaat.

---

---

### De pitch

**In één zin:**
> *"Wearables vergelijken je met miljoenen andere mensen. Vitalix vergelijkt je met jezelf — en met de mensen die het meest op jou lijken."*

**Voor investeerders:**
> Vitalix bouwt het enige longitudinale gezondheidsplatform dat wearable-data, bloedwaarden en interventie-uitkomsten verbindt op persoonlijk niveau. Het netwerkeffect zit niet in gebruikersaantallen maar in de diepte van de data per gebruiker — en de cohortintelligentie die daaruit ontstaat.

---

*PRD versie 2.1 — 2026-04-02*
*Sectie 11 en 12 toegevoegd: Positionering & Vertrouwensprincipes, Schaalmodel & Netwerkeffect*

---

## 13. Market Research & Competitive Landscape

*Onderzoek uitgevoerd april 2026. Bronnen: developer documentatie, company websites, GitHub, PubMed, app stores.*

### Het gat in de markt

De markt biedt momenteel twee typen tools:

1. **Raw data dashboards** — aggregeren wearable- en labdata maar bieden geen interpretatie. Voorbeelden: Apple Health, Heads Up Health.
2. **Generieke AI health coaches** — beantwoorden gezondheidsvragen maar hebben geen toegang tot persoonlijke data van de gebruiker. Voorbeelden: ChatGPT, diverse wellness chatbots.

**Vitalix zit precies in het gat tussen deze twee categorieën.** Geen enkele tool combineert momenteel multi-source persoonlijke gezondheidsdata met een AI-laag die specifiek over die data redeneert.

---

### Concurrentieanalyse

#### Heads Up Health *(dichtstbijzijnde concurrent)*
- Amerikaans platform dat wearables, labs en doktersdata aggregeert
- Geen AI-interpretatielaag
- Gepositioneerd als data-kluis, niet als insights-engine
- Geen opgeslagen Q&A, geen anomalie-detectie op persoonlijke baseline
- **Waarom ze dit niet snel bouwen:** hun doelgroep is breed (patiënten + artsen), een AI-laag brengt liability-risico's die ze met hun positionering niet willen aangaan. Ze bouwen voor de massa — Vitalix is scherp en specifiek.

#### Whoop MCP Servers (5+ op GitHub, 2024–2025)
- Open source projecten waarmee Claude Whoop-data conversationeel kan bevragen
- Technisch vergelijkbaar met Vitalix's Ask-functie
- **Alleen Whoop-data** — geen lab, geen multi-wearable ondersteuning
- Geen interface, geen history, geen mappen — ruwe developer tools
- Voorbeelden: nissand/whoop-mcp-server-claude, yuridivonis/whoop-mcp-server

#### ald0405/whoop-data (GitHub)
- Python project: AI-agents voor conversationeel health coaching vanuit Whoop-data
- Bevat een eenvoudig dashboard
- **Alleen Whoop, geen labs, geen eindgebruikersinterface**

#### Terra API / Thryve / Validic *(B2B middleware)*
- Aggregeren meerdere wearables via één unified API
- Verkopen aan developers en enterprises, niet aan individuen
- Geen consumer interface, geen AI, geen labdata
- Dit zijn infrastructuurlagen — Vitalix zou ze theoretisch kunnen gebruiken als datasource

#### Apple Health / Google Fit
- Consumer aggregators ingebouwd in het OS
- Geen labdata, geen AI, geen persoonlijke baselines
- Apple Health heeft **geen web API** — data is opgesloten op de iPhone, alleen bereikbaar via een native iOS app

#### Fitbit Web API *(deprecated)*
- **Wordt afgesloten september 2026** na overname door Google
- Migreert naar Google Health API (restrictiever)
- Geen zinvolle integratie target meer

#### Garmin Connect
- Sterke hardware, slechte API
- Niet actief geïnvesteerd door Garmin (hardware-first bedrijf)
- Geen betekenisvolle developer community

---

### Wearable API Landschap

| Device | API kwaliteit | Data beschikbaar | Noten |
|--------|--------------|-----------------|-------|
| **Whoop** | ✅ Uitstekend | HRV, recovery, sleep, strain, resting HR | OAuth2, actief developer ecosysteem, subscription businessmodel |
| **Polar** | ✅ Goed | HRV, slaapfases, ANS-herstel, slaapscore | OAuth2, werkt maar niet actief geïnvesteerd |
| **Withings** | ✅ Goed | Bloeddruk, resting HR, gewicht | OAuth2, betrouwbaar |
| **Garmin** | ⚠️ Slecht | Activiteit, HR | Niet onderhouden |
| **Fitbit** | ⚠️ Deprecated | HR, slaap | Sluit sept 2026 |
| **Apple Watch** | ❌ Geen web API | — | HealthKit only, vereist native iOS app |

**Waarom Whoop als enige serieus investeert in de API:** Whoop's businessmodel is subscription-gebaseerd (niet hardware). Een sterk developer ecosysteem verhoogt platformwaarde en verlaagt churn. Ze denken als een softwarebedrijf. Polar en Garmin verkopen hardware — de API is een bijproduct, geen prioriteit.

---

### Wie gebruikt de Whoop API (validatie van het ecosysteem)

De kracht van Whoop's developer ecosysteem valideert de markt:

- **Terra API** — unified wearable data pipeline, bedient app developers
- **Thryve (Duitsland)** — normaliseert Whoop + 500 devices voor coaching en corporate wellness apps
- **Validic** — enterprise digital health platform, integreert Whoop voor klinisch gebruik
- **Strava / TrainingPeaks** — Whoop strain en recovery synct naar trainingslogboeken
- **Pliability** — recovery-driven mobiliteitsaanbevelingen op basis van Whoop score
- **5+ Claude MCP servers** — natural language queries over Whoop data (GitHub, 2024–2025)
- **Academisch onderzoek** — Monash University (gefinancierd door Wu Tsai Human Performance Alliance), University of Arizona — gebruiken Whoop in gepubliceerde studies

---

### Labdata Landschap (Nederland)

| Service | Format | Machine-readable? |
|---------|--------|-------------------|
| mijnlabtest.nl | PDF only (portal, 1 maand) | Nee — OCR nodig |
| Medivere | PDF / online viewer | Nee — OCR nodig |
| labtest.nl | PDF only (portal, 1 maand) | Nee — OCR nodig |
| **bloedwaardentest.nl** | PDF + **CSV download** | **Ja** |
| **Huisarts labs via MedMij/FHIR** | **FHIR R4 JSON/XML** | **Ja — gestructureerd** |

**Sprint 2 aanpak:** PDF upload + OCR via Claude voor mijnlabtest/Medivere/labtest.nl, plus directe CSV import voor bloedwaardentest.nl.

**Sprint 3+:** MedMij/FHIR integratie voor huisarts-labs. Dekt ~97% van Nederlandse huisartsen, gebruikt HL7 FHIR R4. Vereist formeel certificeringstraject.

---

### Strategische conclusie

Vitalix bezet een verdedigbare positie die geen enkele huidige tool vult:

> *"Het enige persoonlijke gezondheidsplatform dat multi-source wearable- en labdata combineert met een AI-laag die redeneert vanuit de individuele baseline van de gebruiker."*

De marktopportuniteit wordt gevalideerd door:
- Actief Whoop developer ecosysteem (enterprise bedrijven bouwen op dezelfde API)
- MedMij/FHIR infrastructuur al aanwezig in Nederland voor gestructureerde gezondheidsdata
- Groeiende consumenteninteresse in quantified self / longevity tracking
- Geen directe concurrent die alle drie de lagen combineert: multi-source data + labs + AI-redenering

---

*Sectie 13 toegevoegd: Market Research & Competitive Landscape — april 2026*
