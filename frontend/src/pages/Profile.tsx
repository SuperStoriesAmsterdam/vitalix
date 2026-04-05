import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUser, updateUser, updateProfile } from '../api/endpoints'

interface ProfileProps {
  userId: number
}

const SECTION: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: 24,
  marginBottom: 16,
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#7A7570',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: 'Inter, system-ui, sans-serif',
}

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #E8E8E8',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#1C1A18',
  background: '#FAFAFA',
  outline: 'none',
  boxSizing: 'border-box',
}

const BTN_PRIMARY: React.CSSProperties = {
  background: '#0F5F72',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Inter, system-ui, sans-serif',
}

const BTN_SAVED: React.CSSProperties = {
  ...BTN_PRIMARY,
  background: '#2E7D32',
}

interface ListSectionProps {
  title: string
  description: string
  items: string[]
  placeholder: string
  newItem: string
  onNewItemChange: (v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}

function ListSection({
  title, description, items, placeholder,
  newItem, onNewItemChange, onAdd, onRemove,
}: ListSectionProps) {
  return (
    <div style={SECTION}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: '#7A7570', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
        {description}
      </p>

      {items.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#F6F6F6',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, color: '#1C1A18', fontFamily: 'Inter, system-ui, sans-serif' }}>{item}</span>
              <button
                onClick={() => onRemove(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A7570', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          style={{ ...INPUT, flex: 1 }}
          value={newItem}
          onChange={e => onNewItemChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
        />
        <button
          onClick={onAdd}
          style={{ ...BTN_PRIMARY, whiteSpace: 'nowrap' }}
        >
          Toevoegen
        </button>
      </div>
    </div>
  )
}

export default function Profile({ userId }: ProfileProps) {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  // Persoonlijk
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState('')
  const [savedPersonal, setSavedPersonal] = useState(false)

  // Gezondheidscontext
  const [familyHistory, setFamilyHistory] = useState<'available' | 'partial' | 'unknown'>('unknown')
  const [diagnoses, setDiagnoses] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [supplements, setSupplements] = useState<string[]>([])
  const [savedHealth, setSavedHealth] = useState(false)

  // Invoervelden
  const [newDiagnosis, setNewDiagnosis] = useState('')
  const [newMedication, setNewMedication] = useState('')
  const [newSupplement, setNewSupplement] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setDob(user.date_of_birth || '')
      setSex(user.sex || '')
      const hp = user.health_profile || {}
      setFamilyHistory((hp.family_history_status as 'available' | 'partial' | 'unknown') || 'unknown')
      setDiagnoses(hp.diagnoses || [])
      setMedications(hp.medications || [])
      setSupplements(hp.supplements || [])
    }
  }, [user])

  const userMutation = useMutation({
    mutationFn: (data: { name?: string; date_of_birth?: string; sex?: string }) =>
      updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setSavedPersonal(true)
      setTimeout(() => setSavedPersonal(false), 2500)
    },
  })

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile(userId, {
        family_history_status: familyHistory,
        diagnoses,
        medications,
        supplements,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setSavedHealth(true)
      setTimeout(() => setSavedHealth(false), 2500)
    },
  })

  if (isLoading) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif', color: '#7A7570' }}>
        Laden...
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 680 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1A18', marginBottom: 6, letterSpacing: '-0.4px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Profiel
      </h1>
      <p style={{ fontSize: 14, color: '#7A7570', marginBottom: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
        Jouw gezondheidscontext helpt Vitalix je data beter te interpreteren.
      </p>

      {/* Persoonlijke gegevens */}
      <div style={SECTION}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Persoonlijk
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Naam</label>
          <input style={INPUT} value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Geboortedatum</label>
            <input style={INPUT} type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Geslacht</label>
            <select
              style={{ ...INPUT, appearance: 'none' as any }}
              value={sex}
              onChange={e => setSex(e.target.value)}
            >
              <option value="">Niet ingevuld</option>
              <option value="male">Man</option>
              <option value="female">Vrouw</option>
            </select>
          </div>
        </div>

        <button
          style={savedPersonal ? BTN_SAVED : BTN_PRIMARY}
          onClick={() => userMutation.mutate({
            name: name || undefined,
            date_of_birth: dob || undefined,
            sex: sex || undefined,
          })}
          disabled={userMutation.isPending}
        >
          {savedPersonal ? 'Opgeslagen ✓' : userMutation.isPending ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>

      {/* Familiegeschiedenis */}
      <div style={SECTION}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1A18', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Familiegeschiedenis
        </h2>
        <p style={{ fontSize: 13, color: '#7A7570', marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
          Bekende aandoeningen bij ouders of eerstegraadsfamilieleden. Geen informatie beschikbaar? Kies "Onbekend" — Vitalix houdt hier rekening mee.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['available', 'partial', 'unknown'] as const).map((option) => {
            const labels = { available: 'Beschikbaar', partial: 'Gedeeltelijk', unknown: 'Onbekend' }
            const isSelected = familyHistory === option
            return (
              <button
                key={option}
                onClick={() => setFamilyHistory(option)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: `1.5px solid ${isSelected ? '#0F5F72' : '#E8E8E8'}`,
                  background: isSelected ? '#E6F4F7' : '#FAFAFA',
                  color: isSelected ? '#0F5F72' : '#7A7570',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {labels[option]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Diagnoses */}
      <ListSection
        title="Diagnoses"
        description="Vastgestelde aandoeningen. Vitalix gebruikt dit als context bij afwijkingen in je data."
        items={diagnoses}
        placeholder="bijv. Hypothyreoïdie"
        newItem={newDiagnosis}
        onNewItemChange={setNewDiagnosis}
        onAdd={() => {
          if (newDiagnosis.trim()) {
            setDiagnoses([...diagnoses, newDiagnosis.trim()])
            setNewDiagnosis('')
          }
        }}
        onRemove={i => setDiagnoses(diagnoses.filter((_, idx) => idx !== i))}
      />

      {/* Medicijnen */}
      <ListSection
        title="Medicijnen"
        description="Huidige medicatie inclusief dosering. Vitalix geeft geen medicatieadvies, maar houdt het als context bij."
        items={medications}
        placeholder="bijv. Levothyroxine 50mcg dagelijks"
        newItem={newMedication}
        onNewItemChange={setNewMedication}
        onAdd={() => {
          if (newMedication.trim()) {
            setMedications([...medications, newMedication.trim()])
            setNewMedication('')
          }
        }}
        onRemove={i => setMedications(medications.filter((_, idx) => idx !== i))}
      />

      {/* Supplementen */}
      <ListSection
        title="Supplementen"
        description="Vitamines, mineralen en andere supplementen die je dagelijks gebruikt."
        items={supplements}
        placeholder="bijv. Vitamine D 2000 IU"
        newItem={newSupplement}
        onNewItemChange={setNewSupplement}
        onAdd={() => {
          if (newSupplement.trim()) {
            setSupplements([...supplements, newSupplement.trim()])
            setNewSupplement('')
          }
        }}
        onRemove={i => setSupplements(supplements.filter((_, idx) => idx !== i))}
      />

      {/* Opslaan knop voor gezondheidscontext */}
      <button
        style={{ ...( savedHealth ? BTN_SAVED : BTN_PRIMARY), width: '100%', padding: '13px', fontSize: 15 }}
        onClick={() => profileMutation.mutate()}
        disabled={profileMutation.isPending}
      >
        {savedHealth ? 'Gezondheidscontext opgeslagen ✓' : profileMutation.isPending ? 'Opslaan...' : 'Gezondheidscontext opslaan'}
      </button>
    </div>
  )
}
