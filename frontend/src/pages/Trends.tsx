import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchHRV, fetchBloodPressure, fetchBaselines } from '../api/endpoints'
import HRVChart from '../components/HRVChart'
import BloodPressureChart from '../components/BloodPressureChart'

interface TrendsProps {
  userId: number
}

const PERIODS = [
  { label: '7 dagen', days: 7 },
  { label: '30 dagen', days: 30 },
  { label: '90 dagen', days: 90 },
]

const SECTION: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: 24,
  marginBottom: 16,
}

export default function Trends({ userId }: TrendsProps) {
  const [days, setDays] = useState(30)

  const { data: hrvData = [], isLoading: hrvLoading } = useQuery({
    queryKey: ['hrv', userId, days],
    queryFn: () => fetchHRV(userId, days),
  })

  const { data: bpData = [], isLoading: bpLoading } = useQuery({
    queryKey: ['blood-pressure', userId, days],
    queryFn: () => fetchBloodPressure(userId, days),
  })

  const { data: baselines = [] } = useQuery({
    queryKey: ['baselines', userId],
    queryFn: () => fetchBaselines(userId),
  })

  const rmssdBaseline = baselines.find(b => b.marker_name === 'hrv_rmssd')?.baseline_value ?? null

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.4px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Trends
          </h1>
          <p style={{ fontSize: 14, color: '#7A7570', marginTop: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Jouw markers over tijd vergeleken met je persoonlijke baseline.
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, background: '#F6F6F6', borderRadius: 10, padding: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              style={{
                padding: '7px 16px',
                borderRadius: 7,
                border: 'none',
                background: days === p.days ? '#FFFFFF' : 'transparent',
                color: days === p.days ? '#1C1A18' : '#7A7570',
                fontSize: 13,
                fontWeight: days === p.days ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: days === p.days ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* HRV & Herstel */}
      <div style={SECTION}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
          HRV &amp; Herstel
        </h2>
        <p style={{ fontSize: 12, color: '#7A7570', marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Nachtelijke hartslagvariabiliteit (rmssd) en autonome herstelwaarde (ANS charge) van Polar.
        </p>
        {hrvLoading ? (
          <div style={{ height: 240, background: '#F6F6F6', borderRadius: 8 }} />
        ) : hrvData.length === 0 ? (
          <EmptyState message="Nog geen HRV-data beschikbaar. Sync je Polar om data te laden." />
        ) : (
          <HRVChart data={hrvData} days={days} rmssdBaseline={rmssdBaseline} />
        )}
      </div>

      {/* Bloeddruk */}
      <div style={SECTION}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Bloeddruk
        </h2>
        <p style={{ fontSize: 12, color: '#7A7570', marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Systolische en diastolische bloeddruk over tijd.
        </p>
        {bpLoading ? (
          <div style={{ height: 240, background: '#F6F6F6', borderRadius: 8 }} />
        ) : bpData.length === 0 ? (
          <EmptyState message="Nog geen bloeddrukmetingen beschikbaar." />
        ) : (
          <BloodPressureChart data={bpData} />
        )}
      </div>

      {/* Baselines overzicht */}
      {baselines.length > 0 && (
        <div style={SECTION}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1C1A18', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Persoonlijke baselines
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {baselines.map(b => (
              <div key={b.marker_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F6F6F6', borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {b.marker_name.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: '#7A7570', marginLeft: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {b.data_points} metingen
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {Math.round(b.baseline_value * 10) / 10}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: b.is_stable ? '#E6F4F7' : '#F6F6F6',
                    color: b.is_stable ? '#0F5F72' : '#7A7570',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}>
                    {b.is_stable ? 'Stabiel' : `${b.data_points}/${b.stability_threshold}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: '#7A7570', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {message}
    </div>
  )
}
