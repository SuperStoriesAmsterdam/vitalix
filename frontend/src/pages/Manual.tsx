/**
 * Vitalix — Manual
 * Plain-language explanation of what Vitalix is and how to use it.
 */

const FONT = 'Inter, system-ui, sans-serif'

const MUTED: React.CSSProperties = {
  fontSize: 13, color: '#7A7570', fontFamily: FONT, lineHeight: 1.6,
}

const BODY: React.CSSProperties = {
  fontSize: 14, color: '#4A4A4A', fontFamily: FONT,
  lineHeight: 1.7, margin: 0,
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '24px 28px',
  marginBottom: 12,
}

const DIVIDER: React.CSSProperties = {
  border: 'none', borderTop: '1px solid #F0F0F0', margin: '16px 0',
}

const STEP_NUM: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%',
  background: '#0F5F72', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, fontFamily: FONT, flexShrink: 0,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 13, fontWeight: 700, color: '#7A7570', fontFamily: FONT,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Step({ num, title, text }: { num: number; title: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={STEP_NUM}>{num}</div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: FONT, margin: '4px 0 4px' }}>
          {title}
        </p>
        <p style={{ ...BODY, fontSize: 13 }}>{text}</p>
      </div>
    </div>
  )
}

function PageCard({
  icon, label, description,
}: {
  icon: string; label: string; description: string
}) {
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'flex-start',
      padding: '14px 0',
      borderBottom: '1px solid #F0F0F0',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#F0F8FA',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: FONT, margin: '0 0 2px' }}>
          {label}
        </p>
        <p style={{ ...MUTED, fontSize: 13 }}>{description}</p>
      </div>
    </div>
  )
}

export default function Manual() {
  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 740 }}>

      <h1 style={{
        fontSize: 24, fontWeight: 700, color: '#1C1A18',
        letterSpacing: '-0.4px', fontFamily: FONT, marginBottom: 6,
      }}>
        Manual
      </h1>
      <p style={{ ...MUTED, marginBottom: 40 }}>
        What Vitalix is, what it does, and how to get the most out of it.
      </p>

      {/* ── WHAT IS VITALIX ── */}
      <Section title="What is Vitalix">
        <div style={CARD}>
          <p style={BODY}>
            Vitalix is a personal health dashboard built around one idea: your body tells a story,
            and that story only makes sense when you read all the chapters together.
          </p>
          <hr style={DIVIDER} />
          <p style={{ ...BODY, marginBottom: 12 }}>
            Most health apps show you one thing — steps, sleep, or a blood result. Vitalix connects
            all your data sources into a single view: wearables, blood tests, and your own notes.
            Then it lets you ask questions in plain language and get answers that actually take your
            full picture into account.
          </p>
          <p style={BODY}>
            It does <strong>not</strong> diagnose anything. It helps you see patterns, track changes
            over time, and have better conversations with your doctor.
          </p>
        </div>
      </Section>

      {/* ── DATA SOURCES ── */}
      <Section title="Where your data comes from">
        <div style={CARD}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <PageCard
              icon="⌚"
              label="Polar Loop (wearable)"
              description="Worn 24/7, including during sleep. Automatically syncs HRV, sleep stages, sleep score, and autonomic nervous system recovery. This is your daily baseline."
            />
            <PageCard
              icon="⌚"
              label="Whoop (wearable)"
              description="Worn 24/7. Syncs recovery score, HRV, resting heart rate, sleep performance, and strain. Connects via your Whoop account."
            />
            <PageCard
              icon="🩺"
              label="Withings BPM Vision (blood pressure monitor)"
              description="Connects via your Withings account. Measures blood pressure and resting heart rate. Best used 2–3 times per week, same time each day."
            />
            <PageCard
              icon="🧪"
              label="Lab results"
              description="Blood, saliva, urine, and stool test results. Currently entered manually. PDF upload (automatic reading) is coming in the next release."
            />
          </div>
        </div>
      </Section>

      {/* ── PAGES ── */}
      <Section title="What each page does">
        <div style={CARD}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <PageCard
              icon="📊"
              label="Dashboard"
              description="Your health at a glance — today's HRV, blood pressure, sleep score, and resting heart rate. The most important numbers, nothing else."
            />
            <PageCard
              icon="📈"
              label="Trends"
              description="How your markers change over time. HRV over the past 30 days, blood pressure week by week. Patterns are more meaningful than single measurements."
            />
            <PageCard
              icon="🧬"
              label="Lab"
              description="All your lab results in one place, sorted by type (blood, saliva, urine, stool). Add a value with the + button. Vitalix tracks how each marker changes over time."
            />
            <PageCard
              icon="🔔"
              label="Alerts"
              description="Automatic notifications when a marker moves significantly from your personal baseline — not a population average, but your own normal. You set the sensitivity."
            />
            <PageCard
              icon="💬"
              label="Ask"
              description="Ask Claude anything about your health data in plain language. 'Why is my HRV low this week?', 'What might explain my high hsCRP?'. Answers are based on your actual data. Save questions into folders to organize topics."
            />
            <PageCard
              icon="📖"
              label="Guide"
              description="Explains which tests and hardware are worth doing, how often, and why. Reference material — not a checklist."
            />
            <PageCard
              icon="👤"
              label="Profile"
              description="Your personal details (age, sex, health context) and connected devices. Vitalix uses your profile to make Claude's answers more relevant."
            />
          </div>
        </div>
      </Section>

      {/* ── GETTING STARTED ── */}
      <Section title="Getting started">
        <div style={CARD}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Step
              num={1}
              title="Fill in your profile"
              text="Go to Profile and enter your age, biological sex, and any relevant health context (conditions, medications, goals). This makes Claude's answers specific to you, not generic."
            />
            <Step
              num={2}
              title="Connect your wearable"
              text="If you use Polar or Whoop, connect it via Profile. You'll be redirected to the device's login page. Once connected, data syncs automatically every day."
            />
            <Step
              num={3}
              title="Connect your blood pressure monitor"
              text="If you have a Withings BPM, connect it via Profile. Measurements sync automatically after each reading."
            />
            <Step
              num={4}
              title="Add your lab results"
              text="Go to Lab → + Add value. Select the marker type, enter the value and unit, and pick the date. You only need to do this when you get new results (2–4 times per year for most markers)."
            />
            <Step
              num={5}
              title="Ask your first question"
              text="Go to Ask and type a question about your health. Start broad: 'What does my data say about my recovery?' or 'What should I focus on this month?' Claude will use your actual data to answer."
            />
          </div>
        </div>
      </Section>

      {/* ── ASK IN DEPTH ── */}
      <Section title="Getting the most out of Ask">
        <div style={CARD}>
          <p style={{ ...BODY, marginBottom: 16 }}>
            The Ask page is where Vitalix becomes most useful. A few things to know:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TipBlock
              title="Be specific"
              text="'My HRV has been low for 2 weeks — what could explain that?' works much better than 'What's wrong with me?'. Specific questions get specific answers."
            />
            <TipBlock
              title="Use folders to organise topics"
              text="Create a folder for each health topic — 'Ankle recovery', 'Cholesterol', 'Sleep'. Move questions into folders so you can find them later. Click a question to expand it, then use the dropdown at the bottom to move it."
            />
            <TipBlock
              title="Ask follow-up questions"
              text="Each question is answered independently, but you can build on previous ones. 'Based on my last question about HRV — what supplements are most evidence-based for this?' works well."
            />
            <TipBlock
              title="Saved answers are permanent"
              text="Every question and answer is saved. You can scroll back through your history and see how your thinking or your data has changed."
            />
          </div>
        </div>
      </Section>

      {/* ── WHAT VITALIX IS NOT ── */}
      <Section title="What Vitalix is not">
        <div style={CARD}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TipBlock
              title="Not a medical device"
              text="Vitalix does not diagnose conditions, prescribe treatments, or replace a doctor. It helps you understand your data and ask better questions — your doctor makes the decisions."
            />
            <TipBlock
              title="Not real-time"
              text="Data syncs once per day from your wearables. It is not a live monitor. If something feels wrong right now, contact a healthcare professional."
            />
            <TipBlock
              title="Not a fitness tracker"
              text="Vitalix is not about steps or calories. It is about recovery, resilience, and long-term health patterns. The focus is on what your body is doing internally, not what you did at the gym."
            />
          </div>
        </div>
      </Section>

    </div>
  )
}

function TipBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#F8F8F8', borderRadius: 10 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: FONT, margin: '0 0 4px' }}>
        {title}
      </p>
      <p style={{ ...BODY, fontSize: 13 }}>{text}</p>
    </div>
  )
}
