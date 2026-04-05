import { useState } from 'react'

interface EnergyInputProps {
  onSubmit: (data: { energy_level: number; context_flags: string[]; note: string }) => void
  isLoading?: boolean
}

const ENERGY_LABELS: Record<number, string> = {
  1: '1 — Uitgeput',
  2: '2',
  3: '3',
  4: '4',
  5: '5 — Scherp',
}

const CONTEXT_FLAGS = [
  'Alcohol',
  'Laat naar bed',
  'Ziek',
  'Stress',
  'Slecht geslapen',
  'Sporten',
]

export default function EnergyInput({ onSubmit, isLoading = false }: EnergyInputProps) {
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null)
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])
  const [note, setNote] = useState('')

  const toggleFlag = (flag: string) => {
    setSelectedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    )
  }

  const handleSubmit = () => {
    if (selectedEnergy === null) return
    onSubmit({
      energy_level: selectedEnergy,
      context_flags: selectedFlags,
      note,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Energy scale */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1A18', marginBottom: 10 }}>
          Energieniveau
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([1, 2, 3, 4, 5] as const).map((level) => {
            const isSelected = selectedEnergy === level
            return (
              <button
                key={level}
                onClick={() => setSelectedEnergy(level)}
                style={{
                  flex: 1,
                  minWidth: 80,
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: `1.5px solid ${isSelected ? '#0F5F72' : '#E8E8E8'}`,
                  background: isSelected ? '#0F5F72' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#1C1A18',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {ENERGY_LABELS[level]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Context flags */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1A18', marginBottom: 10 }}>
          Context <span style={{ fontWeight: 400, color: '#7A7570' }}>(optioneel)</span>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CONTEXT_FLAGS.map((flag) => {
            const isSelected = selectedFlags.includes(flag)
            return (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${isSelected ? '#0F5F72' : '#E8E8E8'}`,
                  background: isSelected ? '#E6F4F7' : '#FFFFFF',
                  color: isSelected ? '#0F5F72' : '#7A7570',
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 400,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
              >
                {flag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Note */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1A18', marginBottom: 8 }}>
          Notitie <span style={{ fontWeight: 400, color: '#7A7570' }}>(optioneel)</span>
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Bijv. gisteren vroeg gespord, sliep dieper dan normaal..."
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1.5px solid #E8E8E8',
            background: '#FFFFFF',
            color: '#1C1A18',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#0F5F72' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#E8E8E8' }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={selectedEnergy === null || isLoading}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 28px',
          borderRadius: 8,
          border: 'none',
          background: selectedEnergy === null ? '#C8C8C8' : '#0F5F72',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: selectedEnergy === null || isLoading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Bezig...' : 'Opslaan'}
      </button>
    </div>
  )
}
