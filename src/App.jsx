import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import SplashScreen from './SplashScreen'
import Onboarding from './Onboarding'
import Feed from './Feed'
import News from './News'
import Polymart from './Polymart'
import Profile from './Profile'
import Chats from './Chats'
import ViewProfile from './ViewProfile'
import Walkthrough from './Walkthrough'
import Icon from './Icon'

const TABS = [
  { id: 'feed', icon: 'home', label: 'Feed' },
  { id: 'news', icon: 'newspaper', label: 'News' },
  { id: 'polymart', icon: 'store', label: 'Polymart' },
  { id: 'profile', icon: 'user', label: 'Profile' },
]

const FULLSCREEN_PAGES = new Set(['chats', 'viewProfile'])

function App() {
  const [splash, setSplash] = useState(true)
  const [session, setSession] = useState(null)
  const [onboarded, setOnboarded] = useState(false)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('feed')
  const [pendingChat, setPendingChat] = useState(null)
  const [viewProfileId, setViewProfileId] = useState(null)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  useEffect(() => {
    if (session && onboarded) {
      const seen = localStorage.getItem(`polynet-walkthrough-${session.user.id}`)
      setShowWalkthrough(!seen)
    }
  }, [session, onboarded])

  function finishWalkthrough() {
    if (session) localStorage.setItem(`polynet-walkthrough-${session.user.id}`, '1')
    setShowWalkthrough(false)
  }

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
    if (error) setMessage(error.message)
    else setMessage('Check your email to confirm your account!')
    setLoading(false)
  }

  function openChats() {
    setPage('chats')
  }

  function openChatWithSeller(payload) {
    setPendingChat(payload)
    setPage('chats')
  }

  function viewProfile(userId, isOwn) {
    if (isOwn) {
      setPage('profile')
      return
    }
    setViewProfileId(userId)
    setPage('viewProfile')
  }

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />
  if (session && !onboarded) return <Onboarding session={session} onComplete={() => setOnboarded(true)} />
  if (session && onboarded && showWalkthrough) return <Walkthrough onFinish={finishWalkthrough} />

  if (session && onboarded) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', paddingBottom: FULLSCREEN_PAGES.has(page) ? 0 : '88px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <style>{`
          @keyframes dotPulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes heartPop {
            0% { transform: scale(0.8); }
            50% { transform: scale(1.25); }
            100% { transform: scale(1); }
          }
          @keyframes skeletonPulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
        `}</style>

        {page === 'feed' && <Feed session={session} onOpenChats={openChats} onViewProfile={viewProfile} />}
        {page === 'news' && <News session={session} />}
        {page === 'polymart' && <Polymart session={session} onOpenChats={openChats} onMessageSeller={openChatWithSeller} />}
        {page === 'profile' && <Profile session={session} />}
        {page === 'chats' && (
          <Chats
            session={session}
            pendingChat={pendingChat}
            onClearPending={() => setPendingChat(null)}
            onBack={() => setPage('feed')}
          />
        )}
        {page === 'viewProfile' && viewProfileId && (
          <ViewProfile userId={viewProfileId} onBack={() => setPage('feed')} />
        )}

        {!FULLSCREEN_PAGES.has(page) && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '520px',
            background: 'var(--nav-bg)',
            borderTop: '1px solid var(--app-border)',
            display: 'flex',
            padding: '10px 0 14px',
            zIndex: 120,
            backdropFilter: 'blur(18px)',
            boxSizing: 'border-box',
          }}>
            {TABS.map(tab => {
              const active = page === tab.id
              return (
                <div
                  key={tab.id}
                  onClick={() => setPage(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? 'var(--app-accent)' : 'var(--text-muted)',
                    transform: active ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.15s, color 0.15s',
                  }}>
                    <Icon name={tab.icon} size={22} strokeWidth={active ? 2.1 : 1.7} />
                  </div>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: active ? 'var(--app-accent)' : 'transparent',
                  }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--page-bg)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        padding: '36px 28px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '380px',
        border: '1px solid var(--app-border)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ margin: 0, color: 'var(--text-strong)', fontSize: '28px', fontWeight: 700 }}>PolyNet</h1>
          <p style={{ marginTop: '6px', color: 'var(--app-accent)', fontSize: '12px', letterSpacing: '2px', fontWeight: 700, fontFamily: "'Roboto', sans-serif" }}>LINK UP</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Student email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '14px 14px', marginBottom: '12px', borderRadius: '14px', border: '1px solid var(--app-border)', background: 'var(--input-bg)', color: 'var(--text-strong)', boxSizing: 'border-box', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '14px 14px', marginBottom: '20px', borderRadius: '14px', border: '1px solid var(--app-border)', background: 'var(--input-bg)', color: 'var(--text-strong)', boxSizing: 'border-box', outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" onClick={handleSignUp} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--app-accent)', background: 'transparent', color: 'var(--app-accent)', fontWeight: 700, cursor: 'pointer' }}>
            Create Account
          </button>
        </form>

        {message && <p style={{ marginTop: '16px', textAlign: 'center', color: 'var(--app-accent)', fontSize: '13px' }}>{message}</p>}
      </div>
    </div>
  )
}

export default App
