/**
 * Vitalix API types
 * Spiegelen de Pydantic schemas uit app/schemas.py.
 */

export interface MarkerSummary {
  latest_value: number | null
  latest_unit: string | null
  latest_measured_at: string | null
  baseline_value: number | null
  is_stable: boolean
  trend: 'up' | 'down' | 'stable' | null
}

export interface DashboardResponse {
  user_id: number
  user_name: string
  blood_pressure: MarkerSummary
  hrv: MarkerSummary
  deep_sleep: MarkerSummary
  unread_alerts: number
  active_interventions: number
}

export interface HRVReading {
  id: number
  date: string
  rmssd: number | null
  ans_charge: number | null
  deep_sleep_minutes: number | null
  rem_sleep_minutes: number | null
  sleep_efficiency: number | null
  sleep_latency_minutes: number | null
  sleep_score: number | null
}

export interface BloodPressureReading {
  id: number
  measured_at: string
  systolic: number
  diastolic: number
  heart_rate: number | null
  source: string
}

export interface LabMarker {
  id: number
  measured_at: string
  test_type: string
  marker_name: string
  value: number
  unit: string
  source: string
}

export interface Baseline {
  marker_name: string
  baseline_value: number
  std_deviation: number | null
  data_points: number
  is_stable: boolean
  stability_threshold: number
  calculated_at: string
}

export interface Alert {
  id: number
  created_at: string
  alert_type: string
  severity: 'info' | 'orange' | 'red'
  message: string
  is_read: boolean
}

export interface Intervention {
  id: number
  name: string
  intervention_type: string
  started_at: string
  status: string
  notes: string | null
}

export interface DailyInputCreate {
  energy_level: number
  context_flags: string[]
  note?: string
  input_date: string
}
