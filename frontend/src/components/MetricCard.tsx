interface MetricCardProps {
  title: string
  value: string | number | null
  unit: string
  trend: 'up' | 'down' | 'stable' | null
  baseline: string | number | null
  isStable: boolean
  severity: 'normal' | 'warning' | 'critical'
  measurementCount?: number
}

const TrendArrow = ({ trend }: { trend: 'up' | 'down' | 'stable' | null }) => {
  if (!trend) return null

  if (trend === 'up') {
    return (
      <span style={{ color: '#0F5F72', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        Stijgend
      </span>
    )
  }

  if (trend === 'down') {
    return (
      <span style={{ color: '#DC2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        Dalend
      </span>
    )
  }

  return (
    <span style={{ color: '#7A7570', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Stabiel
    </span>
  )
}

export default function MetricCard({
  title,
  value,
  unit,
  trend,
  baseline,
  isStable,
  severity,
  measurementCount = 0,
}: MetricCardProps) {
  const leftBorderColor =
    severity === 'critical'
      ? '#DC2626'
      : severity === 'warning'
      ? '#F97316'
      : 'transparent'

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '24px 24px 20px',
        borderLeft: `4px solid ${leftBorderColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Title */}
      <span style={{ fontSize: 12, fontWeight: 600, color: '#7A7570', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </span>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: '#1C1A18', lineHeight: 1, letterSpacing: '-1px' }}>
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {value !== null && value !== undefined && (
          <span style={{ fontSize: 16, fontWeight: 400, color: '#7A7570' }}>{unit}</span>
        )}
      </div>

      {/* Trend */}
      <TrendArrow trend={trend} />

      {/* Baseline */}
      <div style={{ marginTop: 4 }}>
        {isStable ? (
          <span style={{ fontSize: 12, color: '#7A7570' }}>
            Jouw baseline: <strong style={{ color: '#1C1A18' }}>{baseline ?? '—'} {unit}</strong>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#7A7570' }}>
            Baseline wordt opgebouwd ({measurementCount} metingen)
          </span>
        )}
      </div>
    </div>
  )
}
