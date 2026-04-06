/**
 * Vitalix — Gids
 * Uitleg over hardware, testtypes en meetfrequentie.
 */

const FONT = 'Inter, system-ui, sans-serif'

const H1: React.CSSProperties = {
  fontSize: 24, fontWeight: 700, color: '#1C1A18',
  letterSpacing: '-0.4px', fontFamily: FONT, marginBottom: 6,
}

const H2: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, color: '#1C1A18',
  fontFamily: FONT, marginBottom: 4, marginTop: 0,
}

const H3: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#1C1A18',
  fontFamily: FONT, marginBottom: 2, marginTop: 0,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const BODY: React.CSSProperties = {
  fontSize: 14, color: '#4A4A4A', fontFamily: FONT,
  lineHeight: 1.7, margin: 0,
}

const MUTED: React.CSSProperties = {
  fontSize: 13, color: '#7A7570', fontFamily: FONT, lineHeight: 1.6,
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '24px 28px',
  marginBottom: 12,
}

const TAG: React.CSSProperties = {
  display: 'inline-block', fontSize: 11, fontWeight: 600,
  padding: '2px 9px', borderRadius: 20, fontFamily: FONT,
}

const DIVIDER: React.CSSProperties = {
  border: 'none', borderTop: '1px solid #F0F0F0', margin: '16px 0',
}

function FreqBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      ...TAG,
      background: color + '18',
      color: color,
      marginLeft: 10,
    }}>
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#7A7570', fontFamily: FONT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Guide() {
  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 740 }}>

      <h1 style={H1}>Gids</h1>
      <p style={{ ...MUTED, marginBottom: 40 }}>
        Welke hardware je gebruikt, welke tests wanneer zinvol zijn, en waarom.
      </p>

      {/* ── HARDWARE ── */}
      <Section title="Hardware">

        {/* Polar Loop */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={H2}>Polar Loop (2025)</h2>
              <p style={MUTED}>Polsband — draag je 24/7, ook 's nachts</p>
            </div>
            <span style={{ ...TAG, background: '#E6F4F7', color: '#0F5F72' }}>Continu</span>
          </div>
          <p style={BODY}>
            De basis van Vitalix. De Loop meet tijdens de slaap je hartslagvariabiliteit (HRV) en
            autonoom zenuwstelsel-herstel. Dat is de meest betrouwbare meting van de dag — geen
            inspanning, geen stress, alleen je lichaam in rust.
          </p>
          <hr style={DIVIDER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="HRV (rmssd)" value="Nachtelijke hartslagvariabiliteit in milliseconden. Hoger = beter herstel." />
            <Row label="ANS-herstel" value="Polar's eigen score (0–100) voor autonoom zenuwstelsel-herstel. Vergelijkbaar met Whoop Recovery." />
            <Row label="Slaapfases" value="Diepe slaap, REM, lichte slaap in minuten per nacht." />
            <Row label="Slaapscore" value="Samenvattende score (0–100) op basis van duur, fases en regelmaat." />
          </div>
        </div>

        {/* Withings BPM */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={H2}>Withings BPM Vision</h2>
              <p style={MUTED}>Bloeddrukmeter — meet 2–3× per week</p>
            </div>
            <span style={{ ...TAG, background: '#FFF3E0', color: '#E65100' }}>2–3× per week</span>
          </div>
          <p style={BODY}>
            Bloeddruk is één van de weinige cardiovasculaire markers die je zelf betrouwbaar thuis
            kunt meten. Eenmalige metingen zeggen weinig — het patroon over weken zegt alles.
            Meet altijd op hetzelfde moment: 's ochtends voor koffie, zittend, na 5 minuten rust.
          </p>
          <hr style={DIVIDER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Systolisch / diastolisch" value="Streef naar onder de 130/85 mmHg als persoonlijk doel, niet als absolute norm." />
            <Row label="Hartslag in rust" value="In combinatie met HRV een goede indicator van cardiovasculaire conditie." />
          </div>
        </div>

      </Section>

      {/* ── BLOEDONDERZOEK ── */}
      <Section title="Bloedonderzoek">

        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ ...H2, marginBottom: 0 }}>Bloedpanel (mijnlabtest.nl)</h2>
            <FreqBadge label="2–4× per jaar" color="#0F5F72" />
          </div>
          <p style={{ ...BODY, marginBottom: 16 }}>
            Doe een volledig panel aan het begin (nulmeting), en herhaal na 3–4 maanden of na een
            interventie. Zo zie je of iets daadwerkelijk verandert.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MarkerBlock
              name="hsCRP"
              waarom="Hoog-sensitief CRP is de beste bloedmarker voor laaggradig ontstekingsniveau in het lichaam. Verhoogd hsCRP verhoogt cardiovasculair risico onafhankelijk van cholesterol."
              wanneer="Nulmeting + herhalen na 3 maanden bij interventie (dieet, supplementen, slaap)."
              streef="Onder 1,0 mg/L. Boven 3,0 mg/L is verhoogd."
            />
            <MarkerBlock
              name="TSH"
              waarom="Schildklierfunctie. TSH regelt energie, gewicht, stemming en hartritme. Subclinische hypothyreoïdie (TSH iets te hoog, T4 normaal) wordt vaak gemist maar heeft meetbaar effect op HRV en slaap."
              wanneer="1× per jaar als baseline. Vaker bij symptomen (vermoeidheid, gewichtsverandering, koudegevoeligheid)."
              streef="Persoonlijk optimum verschilt — veel mensen voelen zich beter onder de 2,0 mIU/L, ook al is de officiële norm ruimer."
            />
            <MarkerBlock
              name="Vitamine D"
              waarom="Tekort komt voor bij 50–70% van de Nederlanders in de winter. Vitamine D beïnvloedt immuunfunctie, spierkracht, stemming en slaapkwaliteit."
              wanneer="1× per jaar (najaar). Bij suppletie na 3 maanden herhalen."
              streef="75–150 nmol/L. Onder 50 nmol/L is deficiëntie."
            />
            <MarkerBlock
              name="Ferritine"
              waarom="IJzerreserves. Laag ferritine veroorzaakt vermoeidheid en slechte slaap — ook als hemoglobine nog normaal is. Wordt bij vrouwen vaak te laat herkend."
              wanneer="1× per jaar of bij aanhoudende vermoeidheid."
              streef="Boven 50 µg/L voor optimale functie. Officiële ondergrens ligt lager maar is te conservatief."
            />
            <MarkerBlock
              name="Homocysteïne"
              waarom="Methylatiemarker. Verhoogd homocysteïne verhoogt cardiovasculair risico en is gerelateerd aan B12/foliumzuurtekort. Beïnvloedbaar via methylfolaat (5-MTHF) bij MTHFR-mutatie."
              wanneer="Nulmeting. Herhalen na 3 maanden bij suppletie."
              streef="Onder 10 µmol/L. Boven 15 µmol/L is duidelijk verhoogd."
            />
            <MarkerBlock
              name="Testosteron (totaal)"
              waarom="Bij mannen na de 40 daalt testosteron gemiddeld 1–2% per jaar. Lage waarden gaan samen met verminderd herstel, slechtere slaap en lagere HRV."
              wanneer="1× per jaar. Meet 's ochtends (8–10u) — testosteron is dan het hoogst."
              streef="Persoonlijk optimum. De officiële 'normaalrange' is breed — hoe je je voelt telt mee."
            />
            <MarkerBlock
              name="HbA1c"
              waarom="Gemiddelde bloedsuiker over de afgelopen 3 maanden. Vroege indicator van insulineresistentie, jaren vóór diabetes zichtbaar wordt."
              wanneer="1× per jaar."
              streef="Onder 39 mmol/mol (5,7%). Daarboven begint pre-diabetes territory."
            />
          </div>
        </div>

      </Section>

      {/* ── SPEEKSEL ── */}
      <Section title="Speekselonderzoek">
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ ...H2, marginBottom: 0 }}>Cortisolprofiel</h2>
            <FreqBadge label="2–4× per jaar" color="#7B61FF" />
          </div>
          <p style={{ ...BODY, marginBottom: 16 }}>
            Cortisol meet je via speeksel — 4 buisjes op één dag: direct na het opstaan, 30 minuten
            later (de cortisol awakening response), 's middags en 's avonds. Dit geeft een dagritmekromme.
            Dat ritme — hoog in de ochtend, laag in de avond — is essentieel voor slaap, energie en
            herstel. Een afgeplat of omgekeerd ritme is een vroeg signaal van bijnieroverbelasting.
          </p>
          <hr style={DIVIDER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Wanneer zinvol" value="Bij aanhoudende vermoeidheid, slaapproblemen, of als HRV chronisch laag is zonder duidelijke oorzaak." />
            <Row label="Hoe vaak" value="Nulmeting + herhalen na interventie (slaap, supplementen, stressreductie). Niet nodig als routine-check." />
            <Row label="Aanbieder" value="Dutch Health Store, Medivere, of via huisarts." />
          </div>
        </div>
      </Section>

      {/* ── MICROBIOOM ── */}
      <Section title="Ontlastingsonderzoek">
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ ...H2, marginBottom: 0 }}>Microbioom (Medivere)</h2>
            <FreqBadge label="1–2× per jaar" color="#2E7D32" />
          </div>
          <p style={{ ...BODY, marginBottom: 16 }}>
            De darm beïnvloedt veel meer dan spijsvertering — immuunsysteem, hormoonmetabolisme
            (estroboloom), ontstekingsniveau en zelfs stemming via de darm-hersen-as. De Medivere
            Darm Microbioom Zelftest Plus geeft inzicht in diversiteit, ontstekingsmarkers en
            specifieke bacteriestammen.
          </p>
          <hr style={DIVIDER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Diversiteitsscore" value="Hogere diversiteit = gezonder darmmicrobioom. Daalt bij antibiotica, stress, eenzijdig dieet." />
            <Row label="Calprotectine" value="Ontstekingsmarker in de darm. Verhoogd bij darmontsteking of lekkende darm." />
            <Row label="Estroboloom" value="Bacteriën die oestrogeen metaboliseren. Relevant bij hormonale klachten en bij gebruik van aromatase-remmers." />
            <Row label="Wanneer" value="Nulmeting. Herhalen na 6 maanden probiotica-interventie of dieetverandering." />
          </div>
        </div>
      </Section>

      {/* ── MEETFILOSOFIE ── */}
      <Section title="Hoe Vitalix met deze data omgaat">
        <div style={CARD}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PhiloBlock
              title="Jouw baseline, niet de populatienorm"
              text="Referentiewaarden op labformulieren zijn gebaseerd op de gemiddelde bevolking — inclusief mensen die ziek zijn. Vitalix vergelijkt jou met jezelf over tijd. Een TSH van 3,2 kan voor jou hoog zijn als je altijd op 1,8 zat."
            />
            <PhiloBlock
              title="Meerdere markers tegelijk"
              text="Één afwijkende waarde is een observatie. Drie gelijktijdig afwijkende markers zijn een patroon. Vitalix detecteert die combinaties — iets wat een losse bloeduitslag niet doet."
            />
            <PhiloBlock
              title="Meet alleen wat je kunt beïnvloeden"
              text="Elke meting leidt tot een mogelijke interventie. Meten zonder actie is ruis. Vitalix koppelt afwijkingen altijd aan een concrete vervolgstap."
            />
          </div>
        </div>
      </Section>

    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18', fontFamily: FONT, minWidth: 160, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#7A7570', fontFamily: FONT, lineHeight: 1.6 }}>
        {value}
      </span>
    </div>
  )
}

function MarkerBlock({ name, waarom, wanneer, streef }: { name: string; waarom: string; wanneer: string; streef: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#F8F8F8', borderRadius: 10 }}>
      <h3 style={H3}>{name}</h3>
      <p style={{ ...BODY, fontSize: 13, marginBottom: 8 }}>{waarom}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: '#7A7570', fontFamily: FONT }}><strong style={{ color: '#4A4A4A' }}>Wanneer:</strong> {wanneer}</span>
        <span style={{ fontSize: 12, color: '#7A7570', fontFamily: FONT }}><strong style={{ color: '#4A4A4A' }}>Streefwaarde:</strong> {streef}</span>
      </div>
    </div>
  )
}

function PhiloBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: FONT, marginBottom: 4 }}>{title}</p>
      <p style={{ ...BODY, fontSize: 13 }}>{text}</p>
    </div>
  )
}
