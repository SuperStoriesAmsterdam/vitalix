import React, { useState } from 'react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

interface LayoutProps {
  children: React.ReactNode
  activePage?: string
  onNavigate?: (page: string) => void
  userName?: string
}

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
)

const TrendsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const LabIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-4 5h14l-4-5V3" />
  </svg>
)

const AlertsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const AskIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const ApiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'trends', label: 'Trends', icon: <TrendsIcon /> },
  { id: 'lab', label: 'Lab', icon: <LabIcon /> },
  { id: 'alerts', label: 'Alertes', icon: <AlertsIcon /> },
  { id: 'ask', label: 'Vraag stellen', icon: <AskIcon /> },
  { id: 'instellingen', label: 'Profiel', icon: <SettingsIcon /> },
]

export default function Layout({ children, activePage = 'dashboard', onNavigate, userName = 'Gebruiker' }: LayoutProps) {
  const [active, setActive] = useState(activePage)

  const navigate = (id: string) => {
    setActive(id)
    onNavigate?.(id)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100svh', background: '#F6F6F6' }}>
      {/* Sidebar — desktop only */}
      <aside
        style={{
          width: 220,
          background: '#FFFFFF',
          borderRight: '1px solid #E8E8E8',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 20px 32px' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.5px' }}>
            Vitalix
            <span style={{ color: '#FF6520' }}>.</span>
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? '#0F5F72' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#7A7570',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* API docs link */}
        <div style={{ padding: '0 12px 8px' }}>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              color: '#7A7570',
              textDecoration: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <ApiIcon />
            API docs
          </a>
        </div>

        {/* User info at bottom */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #E8E8E8',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#E6F4F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F5F72',
              flexShrink: 0,
            }}
          >
            <UserIcon />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </span>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{ flex: 1, marginLeft: 220, minHeight: '100svh', overflowY: 'auto' }}
      >
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '1px solid #E8E8E8',
          zIndex: 40,
          padding: '8px 0 env(safe-area-inset-bottom, 8px)',
          display: 'none',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: isActive ? '#0F5F72' : '#7A7570',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
