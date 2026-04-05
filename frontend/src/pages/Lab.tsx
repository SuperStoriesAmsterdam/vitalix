import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { fetchLabMarkers, createLabMarker } from '../api/endpoints'

interface LabProps {
  userId: number
}

const SECTION: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: 24,
  marginBottom: 16,
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#7A7570',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: 'Inter, system-ui, sans-serif',
}

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #E8E8E8',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#1C1A18',
  background: '#FAFAFA',
  outline: 'none',
  boxSizing: 'border-box',
}

// Veelgebruikte markers met hun standaardeenheid
const COMMON_MARKERS = [
  { name: 'hscrp', label: 'hsCRP', unit: 'mg/L', type: 'blood' },
  { name: 'tsh', label: 'TSH', unit: 'mIU/L', type: 'blood' },
  { name: 'testosterone', label: 'Testosteron', unit: 'nmol/L', type: 'blood' },
  { name: 'cortisol_morning', label: 'Cortisol (ochtend)', unit: 'nmol/L', type: 'saliva' },
  { name: 'vitamin_d', label: 'Vitamine D', unit: 'nmol/L', type: 'blood' },
  { name: 'ferritin', label: 'Ferritine', unit: 'µg/L', type: 'blood' },
  { name: 'homocysteine', label: 'Homocysteïne', unit: 'µmol/L', type: 'blood' },
  { name: 'hba1c', label: 'HbA1c', unit: 'mmol/mol', type: 'blood' },
  { name: 'fasting_glucose', label: 'Nuchtere glucose', unit: 'mmol/L', type: 'blood' },
]

const TYPE_LABELS: Record<string, string> = {
  blood: 'Bloed',
  saliva: 'Speeksel',
  urine: 'Urine',
  stool: 'Ontlasting',
}

export default function Lab({ userId }: LabProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [markerName, setMarkerName] = useState('')
  const [customMarker, setCustomMarker] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [testType, setTestType] = useState('blood')
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16))
  const [saved, setSaved] = useState(false)

  const { data: markers = [], isLoading } = useQuery({
    queryKey: ['lab-markers', userId],
    queryFn: () => fetchLabMarkers(userId),
  })

  const addMutation = useMutation({
    mutationFn: () => {
      const name = markerName === 'custom' ? customMarker.trim() : markerName
      return createLabMarker(userId, {
        measured_at: new Date(measuredAt).toISOString(),
        test_type: testType as any,
        marker_name: name,
        value: parseFloat(value),
        unit: unit.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-markers', userId] })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setShowForm(false)
        setMarkerName('')
        setCustomMarker('')
        setValue('')
        setUnit('')
        setTestType('blood')
      }, 1500)
    },
  })

  const handleMarkerSelect = (name: string) => {
    setMarkerName(name)
    const preset = COMMON_MARKERS.find(m => m.name === name)
    if (preset) {
      setUnit(preset.unit)
      setTestType(preset.type)
    }
  }

  // Groepeer markers per naam
  const grouped = markers.reduce((acc, m) => {
    if (!acc[m.marker_name]) acc[m.marker_name] = []
    acc[m.marker_name].push(m)
    return acc
  }, {} as Record<string, typeof markers>)

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.4px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Lab
          </h1>
          <p style={{ fontSize: 14, color: '#7A7570', marginTop: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Bloedwaarden, speeksel en andere labresultaten.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: '#0F5F72',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 9,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          + Waarde invoeren
        </button>
      </div>

      {/* Invoerformulier */}
      {showForm && (
        <div style={{ ...SECTION, border: '1.5px solid #0F5F72' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Nieuwe labwaarde
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Marker</label>
            <select
              style={{ ...INPUT, appearance: 'none' as any }}
              value={markerName}
              onChange={e => handleMarkerSelect(e.target.value)}
            >
              <option value="">Kies een marker...</option>
              {COMMON_MARKERS.map(m => (
                <option key={m.name} value={m.name}>{m.label}</option>
              ))}
              <option value="custom">Andere marker...</option>
            </select>
          </div>

          {markerName === 'custom' && (
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Markernaam</label>
              <input
                style={INPUT}
                value={customMarker}
                onChange={e => setCustomMarker(e.target.value)}
                placeholder="bijv. ldl_cholesterol"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Waarde</label>
              <input
                style={INPUT}
                type="number"
                step="any"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Eenheid</label>
              <input
                style={INPUT}
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="bijv. mg/L"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Type test</label>
              <select
                style={{ ...INPUT, appearance: 'none' as any }}
                value={testType}
                onChange={e => setTestType(e.target.value)}
              >
                <option value="blood">Bloed</option>
                <option value="saliva">Speeksel</option>
                <option value="urine">Urine</option>
                <option value="stool">Ontlasting</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Datum &amp; tijd</label>
              <input
                style={INPUT}
                type="datetime-local"
                value={measuredAt}
                onChange={e => setMeasuredAt(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => addMutation.mutate()}
              disabled={!markerName || !value || !unit || addMutation.isPending}
              style={{
                background: saved ? '#2E7D32' : '#0F5F72',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                opacity: (!markerName || !value || !unit) ? 0.5 : 1,
              }}
            >
              {saved ? 'Opgeslagen ✓' : addMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent',
                color: '#7A7570',
                border: '1px solid #E8E8E8',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Bestaande markers */}
      {isLoading ? (
        <div style={{ ...SECTION, height: 120 }} />
      ) : markers.length === 0 ? (
        <div style={{ ...SECTION, textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 14, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Nog geen labwaarden ingevoerd. Klik op "Waarde invoeren" om te beginnen.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([name, readings]) => {
          const preset = COMMON_MARKERS.find(m => m.name === name)
          const label = preset?.label ?? name.replace(/_/g, ' ')
          const latest = readings[0]
          return (
            <div key={name} style={SECTION}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {label}
                  </h3>
                  <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {TYPE_LABELS[latest.test_type] ?? latest.test_type}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {latest.value} <span style={{ fontSize: 13, fontWeight: 400, color: '#7A7570' }}>{latest.unit}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {format(parseISO(latest.measured_at), 'd MMM yyyy', { locale: nl })}
                  </div>
                </div>
              </div>

              {readings.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {readings.slice(1).map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#F6F6F6', borderRadius: 6 }}>
                      <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {format(parseISO(r.measured_at), 'd MMM yyyy', { locale: nl })}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {r.value} {r.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
