/**
 * Vitalix — Login pagina
 * Magic link authenticatie: gebruiker voert e-mail in, ontvangt een eenmalige loginlink.
 */
import { useState } from 'react'
import { requestMagicLink } from '../api/endpoints'

const FONT = 'Inter, system-ui, sans-serif'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      await requestMagicLink(email.trim())
      setSent(true)
    } catch {
      setError('Er ging iets mis. Controleer je e-mailadres en probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: '#F6F6F6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: FONT,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{
            fontSize: 28, fontWeight: 700, color: '#1C1A18', letterSpacing: '-0.5px',
          }}>
            Vitalix<span style={{ color: '#FF6520' }}>.</span>
          </span>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#7A7570' }}>
            Persoonlijk preventief gezondheidsplatform
          </p>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          padding: '32px 28px',
        }}>
          {!sent ? (
            <>
              <h1 style={{
                fontSize: 18, fontWeight: 700, color: '#1C1A18',
                margin: '0 0 6px', letterSpacing: '-0.3px',
              }}>
                Inloggen
              </h1>
              <p style={{ fontSize: 13, color: '#7A7570', margin: '0 0 24px', lineHeight: 1.5 }}>
                Voer je e-mailadres in. Je ontvangt een eenmalige inloglink.
              </p>

              <form onSubmit={handleSubmit}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#1C1A18', marginBottom: 6,
                }}>
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jouw@email.com"
                  autoFocus
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    border: '1.5px solid #E8E8E8',
                    borderRadius: 8,
                    padding: '11px 14px',
                    fontSize: 14,
                    fontFamily: FONT,
                    color: '#1C1A18',
                    background: loading ? '#F9F9F9' : '#fff',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0F5F72'}
                  onBlur={e => e.target.style.borderColor = '#E8E8E8'}
                />

                {error && (
                  <p style={{
                    margin: '10px 0 0', fontSize: 13, color: '#C0392B',
                    background: '#FFF3F0', border: '1px solid #FFD4C8',
                    borderRadius: 6, padding: '8px 12px',
                  }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  style={{
                    width: '100%',
                    marginTop: 16,
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: !email.trim() || loading ? '#B0ABA6' : '#0F5F72',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: !email.trim() || loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {loading ? 'Versturen...' : 'Stuur inloglink'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#E6F4F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 22,
              }}>
                ✉️
              </div>
              <h2 style={{
                fontSize: 17, fontWeight: 700, color: '#1C1A18',
                margin: '0 0 8px',
              }}>
                Check je inbox
              </h2>
              <p style={{ fontSize: 13, color: '#7A7570', margin: 0, lineHeight: 1.6 }}>
                We hebben een inloglink gestuurd naar<br />
                <strong style={{ color: '#1C1A18' }}>{email}</strong>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{
                  marginTop: 20, fontSize: 13, color: '#0F5F72',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: FONT, textDecoration: 'underline',
                }}
              >
                Ander e-mailadres gebruiken
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
