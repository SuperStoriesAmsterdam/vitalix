import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { askClaude, fetchInsights } from '../api/endpoints'
import type { Insight } from '../api/types'

interface AskProps {
  userId: number
}

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const Spinner = () => (
  <div
    style={{
      width: 16,
      height: 16,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}
  />
)

function InsightCard({ insight }: { insight: Insight }) {
  const date = format(parseISO(insight.created_at), 'd MMM yyyy · HH:mm', { locale: nl })

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {insight.question && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#E6F4F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F5F72',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: '#1C1A18',
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {insight.question}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#0F5F72',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            marginTop: 2,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          V
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#3A3835',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {insight.content}
        </p>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {date}
      </p>
    </div>
  )
}

export default function Ask({ userId }: AskProps) {
  const [question, setQuestion] = useState('')
  const [latestInsight, setLatestInsight] = useState<Insight | null>(null)
  const queryClient = useQueryClient()

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['insights', userId],
    queryFn: () => fetchInsights(userId),
  })

  const mutation = useMutation({
    mutationFn: (q: string) => askClaude(userId, q),
    onSuccess: (data) => {
      setLatestInsight(data)
      setQuestion('')
      queryClient.invalidateQueries({ queryKey: ['insights', userId] })
    },
  })

  const handleSubmit = () => {
    const trimmed = question.trim()
    if (!trimmed || mutation.isPending) return
    setLatestInsight(null)
    mutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Filter the latest insight out of history to avoid duplication
  const historyWithoutLatest = latestInsight
    ? history.filter((h) => h.id !== latestInsight.id)
    : history

  return (
    <div
      style={{
        padding: '40px 40px 60px',
        maxWidth: 720,
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea:focus {
          outline: none;
          border-color: #0F5F72 !important;
          box-shadow: 0 0 0 3px rgba(15, 95, 114, 0.12) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ color: '#0F5F72' }}>
            <ChatIcon />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.3px' }}>
            Vraag stellen
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#7A7570', lineHeight: 1.5 }}>
          Stel een vraag over je gezondheidsdata. Vitalix analyseert al je meetwaarden en geeft een persoonlijk antwoord.
        </p>
      </div>

      {/* Input card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bijv. 'Mijn HRV is de laatste week gedaald, wat kan dit betekenen?' of 'Hoe is mijn slaapkwaliteit vergeleken met mijn baseline?'"
          rows={4}
          disabled={mutation.isPending}
          style={{
            width: '100%',
            border: '1.5px solid #E8E8E8',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 14,
            color: '#1C1A18',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.6,
            resize: 'vertical',
            background: mutation.isPending ? '#F9F9F9' : '#FFFFFF',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#B0ABA6' }}>
            {question.length > 0 ? `${question.length} tekens · ` : ''}Cmd+Enter om te versturen
          </p>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || mutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: !question.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
              background: !question.trim() || mutation.isPending ? '#B0ABA6' : '#0F5F72',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'background 0.15s',
            }}
          >
            {mutation.isPending ? (
              <>
                <Spinner />
                Claude denkt na...
              </>
            ) : (
              <>
                <SendIcon />
                Versturen
              </>
            )}
          </button>
        </div>

        {mutation.isError && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#FFF3F0',
              border: '1px solid #FFD4C8',
              fontSize: 13,
              color: '#C0392B',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {(mutation.error as Error)?.message || 'Er ging iets mis. Probeer het opnieuw.'}
          </div>
        )}
      </div>

      {/* Latest answer */}
      {latestInsight && (
        <div style={{ marginBottom: 32 }}>
          <InsightCard insight={latestInsight} />
        </div>
      )}

      {/* History */}
      {!historyLoading && historyWithoutLatest.length > 0 && (
        <div>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#7A7570',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Eerdere vragen
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historyWithoutLatest.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {!historyLoading && history.length === 0 && !latestInsight && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#B0ABA6',
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Nog geen vragen gesteld. Stel je eerste vraag hierboven.
        </div>
      )}
    </div>
  )
}
