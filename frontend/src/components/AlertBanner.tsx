import type { Alert } from '../api/types'

interface AlertBannerProps {
  alerts: Alert[]
  onMarkRead: (alertId: number) => void
}

const severityConfig = {
  red: {
    border: '#DC2626',
    background: '#FEF2F2',
    dot: '#DC2626',
  },
  orange: {
    border: '#F97316',
    background: '#FFF7ED',
    dot: '#F97316',
  },
  info: {
    border: '#0F5F72',
    background: '#F0F9FB',
    dot: '#0F5F72',
  },
}

const severityOrder = { red: 0, orange: 1, info: 2 }

export default function AlertBanner({ alerts, onMarkRead }: AlertBannerProps) {
  const unread = alerts
    .filter((a) => !a.is_read)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  if (unread.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {unread.map((alert) => {
        const config = severityConfig[alert.severity]
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: `3px solid ${config.border}`,
              background: config.background,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: config.dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: '#1C1A18',
                  lineHeight: 1.5,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {alert.message}
              </span>
            </div>
            <button
              onClick={() => onMarkRead(alert.id)}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                borderRadius: 6,
                border: `1px solid ${config.border}`,
                background: 'transparent',
                color: config.border,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'Inter, system-ui, sans-serif',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Gelezen
            </button>
          </div>
        )
      })}
    </div>
  )
}
