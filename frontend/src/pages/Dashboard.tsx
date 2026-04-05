import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import MetricCard from '../components/MetricCard'
import HRVChart from '../components/HRVChart'
import BloodPressureChart from '../components/BloodPressureChart'
import AlertBanner from '../components/AlertBanner'
import EnergyInput from '../components/EnergyInput'
import {
  fetchDashboard,
  fetchHRV,
  fetchBloodPressure,
  fetchAlerts,
  markAlertRead,
  createDailyInput,
} from '../api/endpoints'

interface DashboardProps {
  userId: number
}

const SkeletonCard = () => (
  <div
    style={{
      flex: 1,
      background: '#FFFFFF',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      padding: '24px',
      minHeight: 130,
    }}
  >
    <div
      style={{
        height: 10,
        width: '40%',
        borderRadius: 6,
        background: '#E8E8E8',
        marginBottom: 16,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
    <div
      style={{
        height: 40,
        width: '60%',
        borderRadius: 8,
        background: '#E8E8E8',
        marginBottom: 12,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
    <div
      style={{
        height: 10,
        width: '50%',
        borderRadius: 6,
        background: '#E8E8E8',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  </div>
)

const SkeletonChart = ({ height = 280 }: { height?: number }) => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      padding: 24,
      height,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}
  />
)

export default function Dashboard({ userId }: DashboardProps) {
  const [energyOpen, setEnergyOpen] = useState(true)
  const queryClient = useQueryClient()

  const today = format(new Date(), "EEEE d MMMM", { locale: nl })
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1)

  const {
    data: dashboard,
    isLoading: dashLoading,
    error: dashError,
  } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => fetchDashboard(userId),
  })

  const { data: hrvData = [], isLoading: hrvLoading } = useQuery({
    queryKey: ['hrv', userId, 30],
    queryFn: () => fetchHRV(userId, 30),
  })

  const { data: bpData = [], isLoading: bpLoading } = useQuery({
    queryKey: ['blood-pressure', userId, 30],
    queryFn: () => fetchBloodPressure(userId, 30),
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => fetchAlerts(userId),
  })

  const markReadMutation = useMutation({
    mutationFn: (alertId: number) => markAlertRead(userId, alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', userId] }),
  })

  const energyMutation = useMutation({
    mutationFn: (data: { energy_level: number; context_flags: string[]; note: string }) =>
      createDailyInput(userId, {
        energy_level: data.energy_level,
        context_flags: data.context_flags,
        note: data.note || undefined,
        input_date: format(new Date(), 'yyyy-MM-dd'),
      }),
    onSuccess: () => {
      setEnergyOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
    },
  })

  if (dashError) {
    return (
      <div style={{ padding: 32 }}>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #DC2626',
            borderRadius: 10,
            padding: '16px 20px',
            color: '#DC2626',
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Er is een fout opgetreden bij het laden van de gegevens. Probeer de pagina te vernieuwen.
        </div>
      </div>
    )
  }

  const bpSeverity =
    dashboard?.blood_pressure.trend === 'up' ? 'warning'
    : 'normal' as 'normal' | 'warning' | 'critical'

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1200 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <AlertBanner
            alerts={alerts}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1C1A18',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {dashLoading
            ? 'Goedemorgen'
            : `Goedemorgen, ${dashboard?.user_name ?? 'daar'}`}
        </h1>
        <p style={{ fontSize: 14, color: '#7A7570', marginTop: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {capitalizedToday}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {dashLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              title="Bloeddruk"
              value={
                dashboard?.blood_pressure.latest_value != null
                  ? `${dashboard.blood_pressure.latest_value}`
                  : null
              }
              unit={dashboard?.blood_pressure.latest_unit ?? 'mmHg'}
              trend={dashboard?.blood_pressure.trend ?? null}
              baseline={dashboard?.blood_pressure.baseline_value ?? null}
              isStable={dashboard?.blood_pressure.is_stable ?? false}
              severity={bpSeverity}
            />
            <MetricCard
              title="HRV"
              value={dashboard?.hrv.latest_value != null ? Math.round(dashboard.hrv.latest_value) : null}
              unit={dashboard?.hrv.latest_unit ?? 'ms'}
              trend={dashboard?.hrv.trend ?? null}
              baseline={
                dashboard?.hrv.baseline_value != null
                  ? Math.round(dashboard.hrv.baseline_value)
                  : null
              }
              isStable={dashboard?.hrv.is_stable ?? false}
              severity="normal"
            />
            <MetricCard
              title="Diepe slaap"
              value={
                dashboard?.deep_sleep.latest_value != null
                  ? Math.round(dashboard.deep_sleep.latest_value)
                  : null
              }
              unit={dashboard?.deep_sleep.latest_unit ?? 'min'}
              trend={dashboard?.deep_sleep.trend ?? null}
              baseline={
                dashboard?.deep_sleep.baseline_value != null
                  ? Math.round(dashboard.deep_sleep.baseline_value)
                  : null
              }
              isStable={dashboard?.deep_sleep.is_stable ?? false}
              severity="normal"
            />
          </>
        )}
      </div>

      {/* Energy input card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setEnergyOpen((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18' }}>
            Hoe voel je je vandaag?
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7A7570"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: energyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {energyOpen && (
          <div style={{ padding: '0 24px 24px', borderTop: '1px solid #E8E8E8' }}>
            <div style={{ height: 16 }} />
            <EnergyInput
              onSubmit={(data) => energyMutation.mutate(data)}
              isLoading={energyMutation.isPending}
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* HRV chart — 60% */}
        <div
          style={{
            flex: '3 1 400px',
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1C1A18',
              marginBottom: 4,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            HRV &amp; Herstel
          </h2>
          <p style={{ fontSize: 12, color: '#7A7570', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Afgelopen 30 dagen
          </p>
          {hrvLoading ? (
            <SkeletonChart height={240} />
          ) : (
            <HRVChart
              data={hrvData}
              days={30}
              rmssdBaseline={dashboard?.hrv.baseline_value ?? null}
            />
          )}
        </div>

        {/* Blood pressure chart — 40% */}
        <div
          style={{
            flex: '2 1 280px',
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1C1A18',
              marginBottom: 4,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Bloeddruk
          </h2>
          <p style={{ fontSize: 12, color: '#7A7570', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Afgelopen 30 dagen
          </p>
          {bpLoading ? (
            <SkeletonChart height={240} />
          ) : (
            <BloodPressureChart data={bpData} />
          )}
        </div>
      </div>
    </div>
  )
}
