import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  askClaude,
  fetchInsights,
  fetchFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  updateInsightTitle,
  moveInsight,
} from '../api/endpoints'
import type { Insight, InsightFolder } from '../api/types'

interface AskProps {
  userId: number
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const DotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
)

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const Spinner = ({ size = 16, color = '#fff' }: { size?: number; color?: string }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid ${color}33`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  }} />
)

// ── Inline editable title ──────────────────────────────────────────────────────

function InlineTitle({
  value,
  onSave,
  style,
}: {
  value: string
  onSave: (newVal: string) => void
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        style={{
          border: '1.5px solid #0F5F72',
          borderRadius: 5,
          padding: '2px 6px',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: 'inherit',
          background: '#fff',
          width: '100%',
          outline: 'none',
          ...style,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Klik om titel te bewerken"
      style={{ cursor: 'text', ...style }}
    >
      {value}
    </span>
  )
}

// ── Insight card in the list ───────────────────────────────────────────────────

function InsightListCard({
  insight,
  folders,
  onTitleSave,
  onMove,
}: {
  insight: Insight
  folders: InsightFolder[]
  onTitleSave: (id: number, title: string) => void
  onMove: (id: number, folderId: number | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const date = format(parseISO(insight.created_at), 'd MMM yyyy · HH:mm', { locale: nl })
  const title = insight.title ?? insight.question?.slice(0, 60) ?? 'Zonder titel'
  const preview = insight.content.slice(0, 100).replace(/\n/g, ' ') + (insight.content.length > 100 ? '...' : '')

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      border: expanded ? '1.5px solid #0F5F72' : '1.5px solid transparent',
      transition: 'border-color 0.15s',
    }}>
      {/* Card header — always visible */}
      <div
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1C1A18',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexGrow: 1,
            }}
            onClick={e => e.stopPropagation()}
          >
            <InlineTitle
              value={title}
              onSave={(val) => onTitleSave(insight.id, val)}
              style={{ fontSize: 14, fontWeight: 600 }}
            />
          </span>
          <div style={{ color: '#B0ABA6', flexShrink: 0 }}>
            <ChevronIcon expanded={expanded} />
          </div>
        </div>
        {!expanded && (
          <p style={{
            margin: 0, fontSize: 13, color: '#7A7570',
            fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.45,
          }}>
            {preview}
          </p>
        )}
        <p style={{ margin: 0, fontSize: 12, color: '#B0ABA6', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {date}
        </p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F0F0F0' }}>
          {insight.question && (
            <div style={{ padding: '14px 18px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: '#E6F4F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0F5F72', flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5 }}>
                {insight.question}
              </p>
            </div>
          )}

          <div style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#0F5F72',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0, fontSize: 10, fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              V
            </div>
            <p style={{
              margin: 0, fontSize: 14, color: '#3A3835',
              fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.65,
              whiteSpace: 'pre-wrap', flexGrow: 1,
            }}>
              {insight.content}
            </p>
          </div>

          {/* Move to folder */}
          <div style={{
            padding: '10px 18px 14px',
            borderTop: '1px solid #F0F0F0',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Verplaats naar:
            </span>
            <select
              value={insight.folder_id ?? ''}
              onChange={e => {
                const val = e.target.value
                onMove(insight.id, val === '' ? null : Number(val))
              }}
              style={{
                fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
                border: '1px solid #E8E8E8', borderRadius: 6,
                padding: '4px 8px', background: '#fff', color: '#1C1A18', cursor: 'pointer',
              }}
            >
              <option value="">Geen map</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── New question modal/panel ───────────────────────────────────────────────────

function NewQuestionPanel({
  folders,
  defaultFolderId,
  userId,
  onClose,
  onSuccess,
}: {
  folders: InsightFolder[]
  defaultFolderId: number | null
  userId: number
  onClose: () => void
  onSuccess: (insight: Insight) => void
}) {
  const [question, setQuestion] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(defaultFolderId ?? undefined)

  const mutation = useMutation({
    mutationFn: (q: string) => askClaude(userId, q, selectedFolderId),
    onSuccess: (data) => {
      onSuccess(data)
      onClose()
    },
  })

  const handleSubmit = () => {
    const trimmed = question.trim()
    if (!trimmed || mutation.isPending) return
    mutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: 600, padding: '28px 28px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1C1A18' }}>
            Nieuwe vraag
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#7A7570', fontSize: 20, lineHeight: 1, padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        <textarea
          autoFocus
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bijv. 'Mijn HRV is de laatste week gedaald, wat kan dit betekenen?'"
          rows={5}
          disabled={mutation.isPending}
          style={{
            width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 8,
            padding: '12px 14px', fontSize: 14, color: '#1C1A18',
            fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.6,
            resize: 'vertical', boxSizing: 'border-box',
            background: mutation.isPending ? '#F9F9F9' : '#fff',
            transition: 'border-color 0.15s',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#7A7570' }}>Map:</span>
            <select
              value={selectedFolderId ?? ''}
              onChange={e => setSelectedFolderId(e.target.value === '' ? undefined : Number(e.target.value))}
              style={{
                fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
                border: '1px solid #E8E8E8', borderRadius: 6,
                padding: '5px 10px', background: '#fff', color: '#1C1A18', cursor: 'pointer',
              }}
            >
              <option value="">Geen map</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#B0ABA6' }}>Cmd+Enter</span>
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || mutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                cursor: !question.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
                background: !question.trim() || mutation.isPending ? '#B0ABA6' : '#0F5F72',
                color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.15s',
              }}
            >
              {mutation.isPending ? (
                <><Spinner /><span>Claude denkt na...</span></>
              ) : (
                <><SendIcon /><span>Versturen</span></>
              )}
            </button>
          </div>
        </div>

        {mutation.isError && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: '#FFF3F0', border: '1px solid #FFD4C8',
            fontSize: 13, color: '#C0392B', fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            {(mutation.error as Error)?.message || 'Er ging iets mis. Probeer het opnieuw.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Folder context menu ────────────────────────────────────────────────────────

function FolderMenu({
  onRename,
  onDelete,
  onClose,
  anchorRef,
}: {
  onRename: () => void
  onDelete: () => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute', right: 0, top: '100%', zIndex: 50,
        background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
        border: '1px solid #E8E8E8', minWidth: 140, overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <button
        onClick={() => { onRename(); onClose() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 14px', border: 'none', background: 'none',
          fontSize: 13, color: '#1C1A18', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F6F6F6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <PencilIcon /> Hernoem
      </button>
      <button
        onClick={() => { onDelete(); onClose() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 14px', border: 'none', background: 'none',
          fontSize: 13, color: '#C0392B', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FFF3F0')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
        Verwijder
      </button>
    </div>
  )
}

// ── Sidebar folder row ─────────────────────────────────────────────────────────

function FolderRow({
  folder,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: InsightFolder
  isActive: boolean
  onSelect: () => void
  onRename: (id: number, newName: string) => void
  onDelete: (id: number) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const dotsRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setDraft(folder.name) }, [folder.name])

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed)
    setRenaming(false)
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px',
        borderRadius: 7,
        cursor: 'pointer',
        background: isActive ? '#0F5F72' : 'transparent',
        color: isActive ? '#fff' : '#3A3835',
        position: 'relative',
        transition: 'background 0.12s',
        userSelect: 'none',
      }}
      onClick={onSelect}
    >
      <span style={{ color: isActive ? '#fff' : '#0F5F72', flexShrink: 0 }}>
        <FolderIcon />
      </span>

      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename() }
            if (e.key === 'Escape') { setDraft(folder.name); setRenaming(false) }
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, border: '1.5px solid #0F5F72', borderRadius: 4,
            padding: '1px 5px', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
            color: '#1C1A18', background: '#fff', outline: 'none',
          }}
        />
      ) : (
        <span style={{
          flex: 1, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {folder.name}
        </span>
      )}

      <span style={{
        fontSize: 11, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
        background: isActive ? 'rgba(255,255,255,0.25)' : '#E8E8E8',
        color: isActive ? '#fff' : '#7A7570',
        borderRadius: 10, padding: '1px 6px', flexShrink: 0,
      }}>
        {folder.insight_count}
      </span>

      <button
        ref={dotsRef}
        onClick={e => { e.stopPropagation(); setShowMenu(prev => !prev) }}
        style={{
          border: 'none', background: 'none', cursor: 'pointer', padding: 2,
          color: isActive ? 'rgba(255,255,255,0.7)' : '#B0ABA6',
          display: 'flex', alignItems: 'center', flexShrink: 0,
          borderRadius: 4,
        }}
      >
        <DotsIcon />
      </button>

      {showMenu && (
        <FolderMenu
          onRename={() => setRenaming(true)}
          onDelete={() => onDelete(folder.id)}
          onClose={() => setShowMenu(false)}
          anchorRef={dotsRef}
        />
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Ask({ userId }: AskProps) {
  // Filter state: null = alle vragen, 0 = geen map, N = folder id
  // Default = 0 (geen map) zodat vragen in een map verdwijnen uit de hoofdweergave
  const [activeFilter, setActiveFilter] = useState<number | null>(0)
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (addingFolder) newFolderInputRef.current?.focus()
  }, [addingFolder])

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', userId],
    queryFn: () => fetchFolders(userId),
  })

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['insights', userId, activeFilter],
    queryFn: () => fetchInsights(userId, activeFilter === null ? undefined : activeFilter),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(userId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', userId] })
      setAddingFolder(false)
      setNewFolderName('')
    },
  })

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameFolder(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders', userId] }),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => deleteFolder(id),
    onSuccess: (_data, id) => {
      if (activeFilter === id) setActiveFilter(null)
      queryClient.invalidateQueries({ queryKey: ['folders', userId] })
      queryClient.invalidateQueries({ queryKey: ['insights', userId] })
    },
  })

  const titleMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateInsightTitle(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', userId] }),
  })

  const moveMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) => moveInsight(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', userId] })
      queryClient.invalidateQueries({ queryKey: ['folders', userId] })
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const handleNewFolderSubmit = () => {
    const name = newFolderName.trim()
    if (!name) { setAddingFolder(false); return }
    createFolderMutation.mutate(name)
  }

  const activeLabel = activeFilter === null
    ? 'Alle vragen'
    : activeFilter === 0
      ? 'Geen map'
      : (folders.find(f => f.id === activeFilter)?.name ?? 'Map')

  const defaultFolderForNew = (activeFilter !== null && activeFilter !== 0) ? activeFilter : null

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#F6F6F6' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D8D8D8; border-radius: 3px; }
      `}</style>

      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0, background: '#FFFFFF',
        borderRight: '1px solid #E8E8E8',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', padding: '20px 10px 20px',
      }}>
        <p style={{ margin: '0 0 8px 4px', fontSize: 11, fontWeight: 600, color: '#B0ABA6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Filteren
        </p>

        {/* Alle vragen */}
        <button
          onClick={() => setActiveFilter(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 7, border: 'none',
            background: activeFilter === null ? '#0F5F72' : 'transparent',
            color: activeFilter === null ? '#fff' : '#3A3835',
            fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Alle vragen
        </button>

        {/* Geen map */}
        <button
          onClick={() => setActiveFilter(0)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 7, border: 'none',
            background: activeFilter === 0 ? '#0F5F72' : 'transparent',
            color: activeFilter === 0 ? '#fff' : '#3A3835',
            fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
          </svg>
          Geen map
        </button>

        {/* Divider */}
        {folders.length > 0 && (
          <div style={{ height: 1, background: '#E8E8E8', margin: '10px 4px' }} />
        )}

        {/* Folder list */}
        {folders.map(folder => (
          <FolderRow
            key={folder.id}
            folder={folder}
            isActive={activeFilter === folder.id}
            onSelect={() => setActiveFilter(folder.id)}
            onRename={(id, name) => renameFolderMutation.mutate({ id, name })}
            onDelete={(id) => deleteFolderMutation.mutate(id)}
          />
        ))}

        {/* New folder input */}
        {addingFolder && (
          <div style={{ padding: '4px 4px', marginTop: 4 }}>
            <input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onBlur={handleNewFolderSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleNewFolderSubmit() }
                if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') }
              }}
              placeholder="Naam van de map..."
              style={{
                width: '100%', border: '1.5px solid #0F5F72', borderRadius: 7,
                padding: '7px 10px', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
                color: '#1C1A18', background: '#fff', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* + Nieuwe map button */}
        <button
          onClick={() => setAddingFolder(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 7, border: 'none',
            background: 'transparent', color: '#7A7570',
            fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            marginTop: 6, transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0F5F72')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7A7570')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nieuwe map
        </button>
      </div>

      {/* ── Right main area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px 16px',
          borderBottom: '1px solid #E8E8E8',
          background: '#F6F6F6',
          flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.3px' }}>
            {activeLabel}
          </h1>
          <button
            onClick={() => setShowNewQuestion(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: '#0F5F72', color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0d4f60')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0F5F72')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nieuwe vraag
          </button>
        </div>

        {/* Insight list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>
          {insightsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, height: 80,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          )}

          {!insightsLoading && insights.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 12, paddingTop: 80,
              color: '#B0ABA6', fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D8D8D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ margin: 0, fontSize: 14 }}>
                {activeFilter === null
                  ? 'Nog geen vragen gesteld. Klik op "+ Nieuwe vraag" om te beginnen.'
                  : activeFilter === 0
                    ? 'Geen vragen zonder map.'
                    : 'Nog geen vragen in deze map.'}
              </p>
              <button
                onClick={() => setShowNewQuestion(true)}
                style={{
                  marginTop: 4, padding: '8px 18px', borderRadius: 8,
                  border: '1.5px solid #0F5F72', background: 'transparent',
                  color: '#0F5F72', fontSize: 13, fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer',
                }}
              >
                + Nieuwe vraag
              </button>
            </div>
          )}

          {!insightsLoading && insights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map(insight => (
                <InsightListCard
                  key={insight.id}
                  insight={insight}
                  folders={folders}
                  onTitleSave={(id, title) => titleMutation.mutate({ id, title })}
                  onMove={(id, folderId) => moveMutation.mutate({ id, folderId })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── New question modal ───────────────────────────────────────────────── */}
      {showNewQuestion && (
        <NewQuestionPanel
          folders={folders}
          defaultFolderId={defaultFolderForNew}
          userId={userId}
          onClose={() => setShowNewQuestion(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['insights', userId] })
            queryClient.invalidateQueries({ queryKey: ['folders', userId] })
          }}
        />
      )}
    </div>
  )
}
