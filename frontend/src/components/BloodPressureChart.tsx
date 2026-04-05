import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { BloodPressureReading } from '../api/types'

interface BloodPressureChartProps {
  data: BloodPressureReading[]
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

  const sys = payload.find((p) => p.dataKey === 'systolic')
  const dia = payload.find((p) => p.dataKey === 'diastolic')
  const hr = payload.find((p) => p.dataKey === 'heart_rate')

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
      {sys && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: '#7A7570' }}>SYS:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1A18' }}>{sys.value} mmHg</span>
        </div>
      )}
      {dia && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: '#7A7570' }}>DIA:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1A18' }}>{dia.value} mmHg</span>
        </div>
      )}
      {hr && hr.value != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#7A7570' }}>Hartslag:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1A18' }}>{hr.value} bpm</span>
        </div>
      )}
    </div>
  )
}

export default function BloodPressureChart({ data }: BloodPressureChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: d.measured_at.split('T')[0],
  }))

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 2, background: '#0F5F72', borderRadius: 1 }} />
          <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>Systolisch</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 2, background: 'rgba(15,95,114,0.6)', borderRadius: 1 }} />
          <span style={{ fontSize: 12, color: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}>Diastolisch</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="bpAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F5F72" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#0F5F72" stopOpacity={0.08} />
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
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fontSize: 11, fill: '#7A7570', fontFamily: 'Inter, system-ui, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for normal values */}
          <ReferenceLine
            y={120}
            stroke="#C8C8C8"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{ value: '120', position: 'insideRight', fontSize: 10, fill: '#C8C8C8' }}
          />
          <ReferenceLine
            y={80}
            stroke="#C8C8C8"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{ value: '80', position: 'insideRight', fontSize: 10, fill: '#C8C8C8' }}
          />

          {/* Shaded area between systolic and diastolic */}
          <Area
            type="monotone"
            dataKey="systolic"
            stroke="none"
            fill="url(#bpAreaGradient)"
            activeDot={false}
            connectNulls
          />

          {/* Systolic line */}
          <Line
            type="monotone"
            dataKey="systolic"
            stroke="#0F5F72"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#0F5F72', strokeWidth: 0 }}
            connectNulls
          />

          {/* Diastolic line */}
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke="rgba(15,95,114,0.6)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'rgba(15,95,114,0.6)', strokeWidth: 0 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
