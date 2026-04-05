/**
 * Vitalix API endpoints
 * Alle API-calls op één plek — makkelijk te vinden en te onderhouden.
 */
import api from './client'
import type {
  DashboardResponse, HRVReading, BloodPressureReading,
  LabMarker, Alert, Intervention, DailyInputCreate, Baseline
} from './types'

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
