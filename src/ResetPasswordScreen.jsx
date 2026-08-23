import { useState } from 'react'
import { supabase } from './supabase'

// Shown by App.jsx when it detects a PASSWORD_RECOVERY auth event — i.e.
// the person just landed back in the app after tapping the reset link in
// their email. Supabase's client already gave them a temporary session at
// that point (that's what the recovery link does), which is only good for
// setting a new password via updateUser() below — not for browsing the app.
function ResetPasswordScreen({ onComplete }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords don't match")
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--page-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        padding: '40px 32px',
        borderRadius: '24px',
        width: '100%', maxWidth: '360px',
        border: '1.5px solid var(--app-border)',
        boxShadow: '0 8px 40px rgba(124,58,237,0.08)',
        textAlign: success ? 'center' : 'left',
      }}>
        {success ? (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--app-accent-soft)', margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M4 6l8 7 8-7" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>
              Password updated ✓
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              You're all set — continue on into PolyNet.
            </p>
            <button
              onClick={onComplete}
              style={{
                width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
              }}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: 'var(--text-strong)' }}>
              Set a new password
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Choose a new password for your PolyNet account.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={inputStyle}
                autoFocus
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ ...inputStyle, marginBottom: error ? '8px' : '20px' }}
              />
              {error && (
                <p style={{ color: '#EF4444', fontSize: '12.5px', margin: '0 0 16px', fontWeight: 600 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                  background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '16px',
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '14px', marginBottom: '12px',
  borderRadius: '14px', border: '1.5px solid var(--app-border)',
  background: 'var(--input-bg)', color: 'var(--text-strong)', fontSize: '15px',
  boxSizing: 'border-box', outline: 'none',
}

export default ResetPasswordScreen
