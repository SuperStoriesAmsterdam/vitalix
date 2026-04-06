/**
 * Vitalix API endpoints
 * Alle API-calls op één plek — makkelijk te vinden en te onderhouden.
 */
import api from './client'
import type {
  DashboardResponse, HRVReading, BloodPressureReading,
  LabMarker, Alert, Intervention, DailyInputCreate, Baseline,
  User, HealthProfile, Insight, InsightFolder
} from './types'

// ── Authenticatie ─────────────────────────────────────────────────────────────

export const getMe = () =>
  api.get<User>('/api/me').then(r => r.data)

export const requestMagicLink = (email: string) =>
  api.post('/auth/login', { email }).then(r => r.data)

export const logout = () =>
  api.get('/auth/logout').then(r => r.data)

// ── Gebruiker ──────────────────────────────────────────────────────────────────

export const fetchUser = (userId: number) =>
  api.get<User>(`/api/users/${userId}`).then(r => r.data)

export const updateUser = (userId: number, data: { name?: string; date_of_birth?: string; sex?: string }) =>
  api.patch<User>(`/api/users/${userId}`, data).then(r => r.data)

export const updateProfile = (userId: number, data: HealthProfile) =>
  api.patch<User>(`/api/users/${userId}/profile`, data).then(r => r.data)

// ── Dashboard ──────────────────────────────────────────────────────────────────

export const fetchDashboard = (userId: number) =>
  api.get<DashboardResponse>(`/api/users/${userId}/dashboard`).then(r => r.data)

// ── HRV & Slaap ───────────────────────────────────────────────────────────────

export const fetchHRV = (userId: number, days = 30) =>
  api.get<HRVReading[]>(`/api/users/${userId}/hrv`, { params: { days } }).then(r => r.data)

// ── Bloeddruk ─────────────────────────────────────────────────────────────────

export const fetchBloodPressure = (userId: number, days = 30) =>
  api.get<BloodPressureReading[]>(`/api/users/${userId}/blood-pressure`, { params: { days } }).then(r => r.data)

// ── Lab ───────────────────────────────────────────────────────────────────────

export const fetchLabMarkers = (userId: number) =>
  api.get<LabMarker[]>(`/api/users/${userId}/lab-markers`).then(r => r.data)

export const createLabMarker = (userId: number, data: Omit<LabMarker, 'id' | 'source'>) =>
  api.post<LabMarker>(`/api/users/${userId}/lab-markers`, data).then(r => r.data)

// ── Baselines ─────────────────────────────────────────────────────────────────

export const fetchBaselines = (userId: number) =>
  api.get<Baseline[]>(`/api/users/${userId}/baselines`).then(r => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────────

export const fetchAlerts = (userId: number) =>
  api.get<Alert[]>(`/api/users/${userId}/alerts`).then(r => r.data)

export const markAlertRead = (userId: number, alertId: number) =>
  api.patch(`/api/users/${userId}/alerts/${alertId}/read`).then(r => r.data)

// ── Interventies ──────────────────────────────────────────────────────────────

export const fetchInterventions = (userId: number) =>
  api.get<Intervention[]>(`/api/users/${userId}/interventions`).then(r => r.data)

// ── Dagelijkse invoer ─────────────────────────────────────────────────────────

export const createDailyInput = (userId: number, data: DailyInputCreate) =>
  api.post(`/api/users/${userId}/daily-input`, data).then(r => r.data)

// ── Insights (Claude Q&A) ─────────────────────────────────────────────────────

export const askClaude = (userId: number, question: string, folderId?: number) =>
  api.post<Insight>('/insights/ask', { user_id: userId, question, folder_id: folderId ?? null }).then(r => r.data)

export const fetchInsights = (userId: number, folderId?: number | null) => {
  const params: Record<string, any> = {}
  if (folderId !== undefined && folderId !== null) params.folder_id = folderId
  return api.get<Insight[]>(`/insights/user/${userId}`, { params }).then(r => r.data)
}

export const updateInsightTitle = (insightId: number, title: string) =>
  api.patch<Insight>(`/insights/${insightId}/title`, { title }).then(r => r.data)

export const moveInsight = (insightId: number, folderId: number | null) =>
  api.patch<Insight>(`/insights/${insightId}/move`, { folder_id: folderId }).then(r => r.data)

export const fetchFolders = (userId: number) =>
  api.get<InsightFolder[]>(`/insights/folders/${userId}`).then(r => r.data)

export const createFolder = (userId: number, name: string) =>
  api.post<InsightFolder>('/insights/folders', { user_id: userId, name }).then(r => r.data)

export const renameFolder = (folderId: number, name: string) =>
  api.patch<InsightFolder>(`/insights/folders/${folderId}/rename`, { name }).then(r => r.data)

export const deleteFolder = (folderId: number) =>
  api.delete(`/insights/folders/${folderId}`).then(r => r.data)
