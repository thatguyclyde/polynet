import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import SplashScreen from './SplashScreen'
import LoadingScreen from './LoadingScreen'
import Onboarding from './Onboarding'
import Feed from './Feed'
import News from './News'
import Polymart from './Polymart'
import Profile from './Profile'

const TABS = [
  { id: 'feed',    icon: '/icons/feed.jpg',    label: 'Feed' },
  { id: 'news',   icon: '/icons/news.jpg',    label: 'News' },
  { id: 'polymart',   icon: '/icons/polymart.jpg',     label: 'Polymart' },
  { id: 'profile', icon: '/icons/profile.jpg', label: 'Profile' },
]

function ComingSoonDots() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#7C3AED',
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function App() {
  const [splash, setSplash]       = useState(true)
  const [session, setSession]     = useState(null)
  const [onboarded, setOnboarded] = useState(false)
  const [checking, setChecking]   = useState(true)
  const [page, setPage]           = useState('feed')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, department, year_of_study')
          .eq('id', session.user.id)
          .single()
        if (data?.full_name && data?.department && data?.year_of_study) {
          setOnboarded(true)
        }
      }
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setOnboarded(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setMessage(error.message) }
    else { setMessage('Check your email to confirm your account!') }
    setLoading(false)
  }

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />

  if (session && !onboarded) {
    return <Onboarding session={session} onComplete={() => setOnboarded(true)} />
  }

  if (session && onboarded) {
    return (
      <div style={{
        background: '#ffffff',
        minHeight: '100vh',
        paddingBottom: '70px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <style>{`
          @keyframes dotPulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>

        {page === 'feed' && <Feed session={session} />}
        {page === 'news' && <News session={session} />}
        {page === 'polymart' && <Polymart session={session} />}
        {page === 'profile' && (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#7C3AED',
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                padding: '13px 28px',
                borderRadius: '12px',
                border: '1.5px solid #EF4444',
                background: 'transparent',
                color: '#EF4444',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Log Out
            </button>
          </div>
        )}

        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#ffffff',
          borderTop: '1px solid #F0EEFF',
          display: 'flex',
          padding: '10px 0 18px',
          zIndex: 100,
          boxShadow: '0 -4px 20px rgba(124,58,237,0.06)',
        }}>
          {TABS.map(tab => (
            <div key={tab.id} onClick={() => setPage(tab.id)} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              opacity: page === tab.id ? 1 : 0.4,
            }}>
              <img
                src={tab.icon}
                alt={tab.label}
                style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '6px' }}
              />
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                color: page === tab.id ? '#7C3AED' : '#CBD5E1',
              }}>
                {tab.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
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
            color: '#1A1A2E',
            margin: '0 0 4px',
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '-0.5px',
          }}>PolyNet</h1>
          <p style={{
            color: '#7C3AED',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '3px',
            margin: 0,
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}>Link Up</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Student email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '14px', marginBottom: '12px',
              borderRadius: '14px', border: '1.5px solid #E8E4FF',
              background: '#fff', color: '#1A1A2E', fontSize: '15px',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '14px', marginBottom: '20px',
              borderRadius: '14px', border: '1.5px solid #E8E4FF',
              background: '#fff', color: '#1A1A2E', fontSize: '15px',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: 'none', background: '#7C3AED', color: '#fff',
            fontWeight: 700, fontSize: '16px', marginBottom: '12px',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" onClick={handleSignUp} disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: '14px',
            border: '1.5px solid #7C3AED', background: 'transparent',
            color: '#7C3AED', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
          }}>
            Create Account
          </button>
        </form>

        {message && (
          <p style={{ color: '#7C3AED', textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default App