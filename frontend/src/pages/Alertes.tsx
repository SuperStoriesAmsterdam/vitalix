import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { fetchAlerts, markAlertRead } from '../api/endpoints'

interface AlertesProps {
  userId: number
}

const SEVERITY_CONFIG = {
  red: { border: '#DC2626', background: '#FEF2F2', dot: '#DC2626', label: 'Urgent' },
  orange: { border: '#F97316', background: '#FFF7ED', dot: '#F97316', label: 'Let op' },
  info: { border: '#0F5F72', background: '#F0F9FB', dot: '#0F5F72', label: 'Info' },
}

export default function Alertes({ userId }: AlertesProps) {
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: () => fetchAlerts(userId),
  })

  const markReadMutation = useMutation({
    mutationFn: (alertId: number) => markAlertRead(userId, alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', userId] }),
  })

  const unread = alerts.filter(a => !a.is_read)
  const read = alerts.filter(a => a.is_read)

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.4px', fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 6 }}>
        Alertes
      </h1>
      <p style={{ fontSize: 14, color: '#7A7570', marginBottom: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
        Signalen op basis van afwijkingen in jouw persoonlijke baseline.
      </p>

      {isLoading ? (
        <div style={{ background: '#FFFFFF', borderRadius: 12, height: 120, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} />
      ) : alerts.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Geen alertes. Zodra een marker significant afwijkt van jouw baseline, verschijnt die hier.
          </p>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#7A7570', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Ongelezen — {unread.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {unread.map(alert => {
                  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
                  return (
                    <div
                      key={alert.id}
                      style={{
                        background: cfg.background,
                        borderRadius: 10,
                        borderLeft: `3px solid ${cfg.border}`,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: 5 }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: cfg.border, fontFamily: 'Inter, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {cfg.label}
                            </span>
                            <span style={{ fontSize: 11, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                              {format(parseISO(alert.created_at), 'd MMM yyyy', { locale: nl })}
                            </span>
                          </div>
                          <p style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.6, fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => markReadMutation.mutate(alert.id)}
                        style={{
                          flexShrink: 0,
                          padding: '5px 14px',
                          borderRadius: 6,
                          border: `1px solid ${cfg.border}`,
                          background: 'transparent',
                          color: cfg.border,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}
                      >
                        Gelezen
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {read.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#7A7570', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Archief — {read.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {read.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 10,
                      border: '1px solid #E8E8E8',
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8E8E8', flexShrink: 0, marginTop: 6 }} />
                    <div>
                      <span style={{ fontSize: 11, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {format(parseISO(alert.created_at), 'd MMM yyyy', { locale: nl })}
                      </span>
                      <p style={{ fontSize: 13, color: '#7A7570', lineHeight: 1.6, fontFamily: 'Inter, system-ui, sans-serif', margin: '2px 0 0' }}>
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
