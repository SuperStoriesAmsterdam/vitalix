import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Line,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { HRVReading } from '../api/types'

// Line is imported but only used for typing reference — suppress unused warning
void Line

interface HRVChartProps {
  data: HRVReading[]
  days: number
  rmssdBaseline?: number | null
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <p style={{ fontSize: 11, color: '#7A7570', marginBottom: 6 }}>
        {label ? format(parseISO(label), 'd MMMM yyyy', { locale: nl }) : ''}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#7A7570' }}>
            {entry.dataKey === 'rmssd' ? 'HRV (rmssd)' : 'Herstel (ANS)'}:
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1A18' }}>
            {entry.value} {entry.dataKey === 'rmssd' ? 'ms' : '%'}
          </span>
        </div>
      ))}
    </div>
  )
}

const renderLegend = () => (
  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 20, height: 2, background: '#0F5F72', borderRadius: 1 }} />
      <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>HRV (rmssd)</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 20, height: 2, background: '#FF6520', borderRadius: 1, borderTop: '2px dashed #FF6520', borderBottom: 'none' }} />
      <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>Herstel (ANS)</span>
    </div>
  </div>
)

export default function HRVChart({ data, days: _days, rmssdBaseline }: HRVChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    dateFormatted: format(parseISO(d.date), 'd MMM', { locale: nl }),
  }))

  return (
    <div style={{ width: '100%' }}>
      {renderLegend()}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="rmssdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F5F72" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#0F5F72" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tickFormatter={(val: string) => format(parseISO(val), 'd MMM', { locale: nl })}
            tick={{ fontSize: 11, fill: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}
            axisLine={{ stroke: '#E8E8E8' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={() => null} />

          {rmssdBaseline != null && (
            <ReferenceLine
              y={rmssdBaseline}
              stroke="#E8E8E8"
              strokeDasharray="0"
              strokeWidth={1}
            />
          )}

          <Area
            type="monotone"
            dataKey="rmssd"
            stroke="#0F5F72"
            strokeWidth={2}
            fill="url(#rmssdGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#0F5F72', strokeWidth: 0 }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="ans_charge"
            stroke="#FF6520"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            dot={false}
            activeDot={{ r: 4, fill: '#FF6520', strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
