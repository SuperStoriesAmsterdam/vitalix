import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Trends from './pages/Trends'
import Lab from './pages/Lab'
import Alertes from './pages/Alertes'
import Ask from './pages/Ask'
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

const USER_ID = 1

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <QueryClientProvider client={queryClient}>
      <Layout activePage={page} onNavigate={setPage}>
        {page === 'dashboard' && <Dashboard userId={USER_ID} />}
        {page === 'trends' && <Trends userId={USER_ID} />}
        {page === 'lab' && <Lab userId={USER_ID} />}
        {page === 'alerts' && <Alertes userId={USER_ID} />}
        {page === 'ask' && <Ask userId={USER_ID} />}
        {page === 'instellingen' && <Profile userId={USER_ID} />}
      </Layout>
    </QueryClientProvider>
  )
}
