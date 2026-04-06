import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { fetchLabMarkers, createLabMarker } from '../api/endpoints'
import type { LabMarker } from '../api/types'

interface LabProps {
  userId: number
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

const TEST_TYPES = [
  { key: 'blood', label: 'Bloed' },
  { key: 'saliva', label: 'Speeksel' },
  { key: 'urine', label: 'Urine' },
  { key: 'stool', label: 'Ontlasting' },
]

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

function markerLabel(name: string) {
  return COMMON_MARKERS.find(m => m.name === name)?.label ?? name.replace(/_/g, ' ')
}

// Groepeer markers per testtype, dan per markernaam, gesorteerd op datum nieuwste eerst
function groupByType(markers: LabMarker[]) {
  const byType: Record<string, Record<string, LabMarker[]>> = {}
  for (const m of markers) {
    if (!byType[m.test_type]) byType[m.test_type] = {}
    if (!byType[m.test_type][m.marker_name]) byType[m.test_type][m.marker_name] = []
    byType[m.test_type][m.marker_name].push(m)
  }
  // Sorteer elke markerlijst op datum, nieuwste eerst
  for (const type of Object.keys(byType)) {
    for (const name of Object.keys(byType[type])) {
      byType[type][name].sort((a, b) =>
        new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
      )
    }
  }
  return byType
}

export default function Lab({ userId }: LabProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('blood')
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
        setActiveTab(testType)
      }, 1200)
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

  const grouped = groupByType(markers)

  const tabMarkersForType = (type: string) => grouped[type] ?? {}
  const countForType = (type: string) =>
    Object.values(grouped[type] ?? {}).reduce((s, arr) => s + arr.length, 0)

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.4px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Lab
          </h1>
          <p style={{ fontSize: 14, color: '#7A7570', marginTop: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Labresultaten per testtype, gesorteerd op datum.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: '#0F5F72', color: '#FFFFFF', border: 'none',
            borderRadius: 9, padding: '10px 20px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          + Waarde invoeren
        </button>
      </div>

      {/* Invoerformulier */}
      {showForm && (
        <div style={{
          background: '#FFFFFF', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: 24, marginBottom: 16, border: '1.5px solid #0F5F72',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Nieuwe labwaarde
          </h2>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Type test</label>
              <select style={{ ...INPUT, appearance: 'none' as any }} value={testType} onChange={e => { setTestType(e.target.value); setMarkerName('') }}>
                {TEST_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={LABEL}>Marker</label>
              <select style={{ ...INPUT, appearance: 'none' as any }} value={markerName} onChange={e => handleMarkerSelect(e.target.value)}>
                <option value="">Kies een marker...</option>
                {COMMON_MARKERS.filter(m => m.type === testType).map(m => (
                  <option key={m.name} value={m.name}>{m.label}</option>
                ))}
                <option value="custom">Andere marker...</option>
              </select>
            </div>
          </div>

          {markerName === 'custom' && (
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Markernaam</label>
              <input style={INPUT} value={customMarker} onChange={e => setCustomMarker(e.target.value)} placeholder="bijv. ldl_cholesterol" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Waarde</label>
              <input style={INPUT} type="number" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder="0.0" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Eenheid</label>
              <input style={INPUT} value={unit} onChange={e => setUnit(e.target.value)} placeholder="bijv. mg/L" />
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={LABEL}>Datum &amp; tijd</label>
              <input style={INPUT} type="datetime-local" value={measuredAt} onChange={e => setMeasuredAt(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => addMutation.mutate()}
              disabled={!markerName || !value || !unit || addMutation.isPending}
              style={{
                background: saved ? '#2E7D32' : '#0F5F72', color: '#FFFFFF',
                border: 'none', borderRadius: 8, padding: '10px 20px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                opacity: (!markerName || !value || !unit) ? 0.5 : 1,
              }}
            >
              {saved ? 'Opgeslagen ✓' : addMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent', color: '#7A7570',
                border: '1px solid #E8E8E8', borderRadius: 8,
                padding: '10px 20px', fontSize: 14,
                cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Tabs per testtype */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#F6F6F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TEST_TYPES.map(t => {
          const count = countForType(t.key)
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 7, border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#1C1A18' : '#7A7570',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: isActive ? '#E6F4F7' : '#E8E8E8',
                  color: isActive ? '#0F5F72' : '#7A7570',
                  borderRadius: 10, padding: '1px 7px',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Inhoud van actieve tab */}
      {isLoading ? (
        <div style={{ background: '#FFFFFF', borderRadius: 12, height: 120, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} />
      ) : Object.keys(tabMarkersForType(activeTab)).length === 0 ? (
        <div style={{
          background: '#FFFFFF', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Nog geen {TEST_TYPES.find(t => t.key === activeTab)?.label.toLowerCase()}waarden ingevoerd.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(tabMarkersForType(activeTab)).map(([name, readings]) => {
            const latest = readings[0]
            const older = readings.slice(1)
            return (
              <div key={name} style={{
                background: '#FFFFFF', borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden',
              }}>
                {/* Header rij: markernaam + laatste waarde */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {markerLabel(name)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {latest.value}
                    </span>
                    <span style={{ fontSize: 13, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {latest.unit}
                    </span>
                    <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif', marginLeft: 8 }}>
                      {format(parseISO(latest.measured_at), 'd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                </div>

                {/* Historische metingen */}
                {older.length > 0 && (
                  <div style={{ borderTop: '1px solid #F6F6F6' }}>
                    {older.map(r => (
                      <div key={r.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '9px 20px', background: '#FAFAFA',
                        borderBottom: '1px solid #F6F6F6',
                      }}>
                        <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {format(parseISO(r.measured_at), 'd MMM yyyy', { locale: nl })}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#4A4A4A', fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {r.value} {r.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
