import { useState } from 'react'
import { supabase } from './supabase'

function SignUp({ onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    setMessage('')

    if (password !== confirmPassword) {
      return setMessage("Passwords don't match")
    }
    if (password.length < 6) {
      return setMessage('Password must be at least 6 characters')
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Account created! Check your email to confirm.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: '#F8F7FF',
        padding: '40px 32px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '360px',
        border: '1.5px solid #E8E4FF',
        boxShadow: '0 8px 40px rgba(124,58,237,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            color: '#1A1A2E', margin: '0 0 4px', fontSize: '26px',
            fontWeight: 900, letterSpacing: '-0.5px',
          }}>Create Account</h1>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
            Join the PolyNet community
          </p>
        </div>

        <form onSubmit={handleSignUp}>
          <input
            type="email"
            placeholder="Student email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: '20px' }}
          />
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: 'none', background: '#7C3AED', color: '#fff',
            fontWeight: 700, fontSize: '16px', marginBottom: '14px',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {message && (
          <p style={{
            color: message.includes('created') ? '#16A34A' : '#EF4444',
            textAlign: 'center', marginBottom: '16px', fontSize: '13px', fontWeight: 600,
          }}>
            {message}
          </p>
        )}

        <div style={{ textAlign: 'center', fontSize: '13.5px', color: '#64748B' }}>
          Already have an account?{' '}
          <span onClick={onSwitchToLogin} style={{ color: '#7C3AED', fontWeight: 700, cursor: 'pointer' }}>
            Sign In
          </span>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '14px', marginBottom: '12px',
  borderRadius: '14px', border: '1.5px solid #E8E4FF',
  background: '#fff', color: '#1A1A2E', fontSize: '15px',
  boxSizing: 'border-box', outline: 'none',
}

export default SignUp