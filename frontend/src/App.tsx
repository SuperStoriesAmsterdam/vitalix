import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Trends from './pages/Trends'
import Lab from './pages/Lab'
import Alertes from './pages/Alertes'
import Ask from './pages/Ask'
import Guide from './pages/Guide'
import Manual from './pages/Manual'
import Login from './pages/Login'
import { getMe } from './api/endpoints'
import type { User } from './api/types'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100svh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#F6F6F6', fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2.5px solid #E8E8E8',
          borderTopColor: '#0F5F72',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Layout activePage={page} onNavigate={setPage} userName={user.name}>
        {page === 'dashboard' && <Dashboard userId={user.id} />}
        {page === 'trends' && <Trends userId={user.id} />}
        {page === 'lab' && <Lab userId={user.id} />}
        {page === 'alerts' && <Alertes userId={user.id} />}
        {page === 'ask' && <Ask userId={user.id} />}
        {page === 'guide' && <Guide />}
        {page === 'manual' && <Manual />}
        {page === 'instellingen' && <Profile userId={user.id} />}
      </Layout>
    </QueryClientProvider>
  )
}
