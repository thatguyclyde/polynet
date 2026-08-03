import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'

function GradientLogo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <h1 style={{
        margin: '0 0 8px',
        fontSize: '30px',
        fontWeight: 900,
        letterSpacing: '-0.6px',
        background: 'linear-gradient(120deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        display: 'inline-block',
      }}>
        PolyNet
      </h1>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 13px',
        borderRadius: '999px',
        background: 'var(--app-accent-soft)',
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--app-accent)' }} />
        <span style={{
          fontSize: '10.5px', fontWeight: 800, letterSpacing: '2px',
          color: 'var(--app-accent)', textTransform: 'uppercase',
        }}>
          Link Up
        </span>
      </div>
    </div>
  )
}

function ConfirmEmailModal({ onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,10,20,0.45)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          padding: '32px 26px 26px',
          width: '100%', maxWidth: '340px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--app-border)',
        }}
      >
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
          Nice! 🎉
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Open your new email and tap <strong style={{ color: 'var(--text-strong)' }}>"Confirm Signup"</strong> to secure your account.
        </p>
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
            background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  )
}

function AuthScreen({ onSignUpSuccess }) {
  const [view, setView] = useState('login') // 'login' | 'signup'

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')

  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirmPassword, setSuConfirmPassword] = useState('')
  const [suLoading, setSuLoading] = useState(false)
  const [suMessage, setSuMessage] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) setLoginMessage(error.message)
    setLoginLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setSuMessage('')

    if (suPassword !== suConfirmPassword) {
      return setSuMessage("Passwords don't match")
    }
    if (suPassword.length < 6) {
      return setSuMessage('Password must be at least 6 characters')
    }

    setSuLoading(true)
    const { error } = await supabase.auth.signUp({ email: suEmail, password: suPassword })

    if (error) {
      setSuMessage(error.message)
    } else {
      setShowConfirmModal(true)
      onSignUpSuccess?.()
    }
    setSuLoading(false)
  }

  function dismissConfirmModal() {
    setShowConfirmModal(false)
    setView('login')
    setSuEmail('')
    setSuPassword('')
    setSuConfirmPassword('')
    setSuMessage('')
  }

  const cardFaceStyle = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--page-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      perspective: '1600px',
      padding: '24px',
      position: 'relative',
    }}>
      <motion.div
        animate={{ rotateY: view === 'signup' ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          height: '560px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* FRONT — Sign In */}
        <div style={{ ...cardFaceStyle, transform: 'rotateY(0deg)' }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '40px 32px',
            borderRadius: '24px',
            width: '100%',
            border: '1.5px solid var(--app-border)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.08)',
          }}>
            <GradientLogo />

            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Student email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ ...inputStyle, marginBottom: '20px' }}
              />
              <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loginLoading} style={primaryButtonStyle}>
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setView('signup')}
                disabled={loginLoading}
                style={secondaryButtonStyle}
              >
                Create Account
              </motion.button>
            </form>

            {loginMessage && (
              <p style={{ color: 'var(--app-accent)', textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
                {loginMessage}
              </p>
            )}
          </div>
        </div>

        {/* BACK — Sign Up */}
        <div style={{ ...cardFaceStyle, transform: 'rotateY(180deg)' }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '40px 32px',
            borderRadius: '24px',
            width: '100%',
            border: '1.5px solid var(--app-border)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.08)',
          }}>
            <GradientLogo />

            <form onSubmit={handleSignUp}>
              <input
                type="email"
                placeholder="Student email"
                value={suEmail}
                onChange={e => setSuEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={suPassword}
                onChange={e => setSuPassword(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={suConfirmPassword}
                onChange={e => setSuConfirmPassword(e.target.value)}
                style={{ ...inputStyle, marginBottom: '20px' }}
              />
              <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={suLoading} style={primaryButtonStyle}>
                {suLoading ? 'Creating account...' : 'Create Account'}
              </motion.button>
            </form>

            {suMessage && (
              <p style={{ color: '#EF4444', textAlign: 'center', margin: '14px 0 0', fontSize: '13px', fontWeight: 600 }}>
                {suMessage}
              </p>
            )}

            <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '18px' }}>
              Already have an account?{' '}
              <span onClick={() => setView('login')} style={{ color: 'var(--app-accent)', fontWeight: 700, cursor: 'pointer' }}>
                Sign In
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirmModal && <ConfirmEmailModal onDismiss={dismissConfirmModal} />}
      </AnimatePresence>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '14px', marginBottom: '12px',
  borderRadius: '14px', border: '1.5px solid var(--app-border)',
  background: 'var(--input-bg)', color: 'var(--text-strong)', fontSize: '15px',
  boxSizing: 'border-box', outline: 'none',
}

const primaryButtonStyle = {
  width: '100%', padding: '15px', borderRadius: '14px',
  border: 'none', background: 'var(--app-accent)', color: '#fff',
  fontWeight: 700, fontSize: '16px', marginBottom: '12px',
  cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
}

const secondaryButtonStyle = {
  width: '100%', padding: '15px', borderRadius: '14px',
  border: '1.5px solid var(--app-accent)', background: 'transparent',
  color: 'var(--app-accent)', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
}

export default AuthScreen