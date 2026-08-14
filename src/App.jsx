import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Newspaper, Store, MessageCircle, UserCircle, WifiOff } from 'lucide-react'
import { supabase } from './supabase'
import SplashScreen from './SplashScreen'
import AuthScreen from './AuthScreen'
import Onboarding from './Onboarding'
import React, { Suspense, lazy } from 'react'

const Feed = lazy(() => import('./Feed'))
const News = lazy(() => import('./News'))
const Walkthrough = lazy(() => import('./Walkthrough'))
const Polymart = lazy(() => import('./Polymart'))
const Profile = lazy(() => import('./Profile'))
const Chats = lazy(() => import('./Chats'))

const TABS = [
  { id: 'feed', icon: Home, label: 'Home' },
  { id: 'news', icon: Newspaper, label: 'News' },
  { id: 'polymart', icon: Store, label: 'Polymart' },
  { id: 'chats', icon: MessageCircle, label: 'Chats' },
]

// Must match the threshold Feed.jsx uses to decide when its Skills button
// docks next to the avatar — kept as one constant so the two stay in sync.
const FEED_COLLAPSE_THRESHOLD = 30

function ComingSoonDots() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)' }}>
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
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

// Shown while re-checking session after the person returns to the tab
// following an email-confirmation tap — distinct from the generic
// ComingSoonDots so it's clear something specific ("logging you in") is
// happening, not just a normal app boot.
function LoggingInScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      background: 'var(--page-bg)',
    }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#7C3AED',
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>
        Logging in…
      </p>
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

// Shown when a profile fetch genuinely fails (no connection), instead of
// silently falling back to the Onboarding screen. Retry re-runs the same
// check without a full page reload.
function NetworkErrorScreen({ onRetry, retrying }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)',
      padding: '24px', textAlign: 'center',
    }}>
      <div style={{
        width: '68px', height: '68px', borderRadius: '50%',
        background: 'var(--app-accent-soft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
      }}>
        <WifiOff size={30} color="var(--app-accent)" />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: 'var(--text-strong)' }}>
        No Connection
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.5 }}>
        We couldn't reach PolyNet. Check your internet connection and try again.
      </p>
      <button
        onClick={onRetry}
        disabled={retrying}
        style={{
          padding: '13px 32px', borderRadius: '14px', border: 'none',
          background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '14.5px',
          cursor: retrying ? 'default' : 'pointer', boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        {retrying ? (
          <>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
            Retrying...
          </>
        ) : (
          'Retry'
        )}
      </button>
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

const AWAITING_CONFIRMATION_KEY = 'polynet_awaiting_confirmation'

function App() {
  const [splash, setSplash] = useState(true)
  const [session, setSession] = useState(null)
  // null = not yet known (still checking or errored), true/false = confirmed
  const [onboarded, setOnboarded] = useState(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  // Persisted (DB-backed) — whether this account has ever completed the
  // walkthrough. Defaults to true so a session that hasn't resolved yet
  // never briefly flashes the walkthrough before checkUserProfile corrects
  // it; checkUserProfile sets the real value once it knows.
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(true)
  const [checking, setChecking] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [page, setPage] = useState('feed')
  const [showProfile, setShowProfile] = useState(false)
  const [myAvatar, setMyAvatar] = useState(null)

  const [pendingChat, setPendingChat] = useState(null)
  const [chatThreadOpen, setChatThreadOpen] = useState(false)
  const [listingDetailOpen, setListingDetailOpen] = useState(false)

  const [hasUnreadChats, setHasUnreadChats] = useState(false)
  const [hasUnreadNews, setHasUnreadNews] = useState(false)

  // Tracks scroll position of the currently-active page's scroll container.
  // Only Feed actually uses this (for its collapsing header), but it's
  // tracked here since the scrollable element itself lives in App.jsx, and
  // the avatar's "shift left" animation (driven by the same value) also
  // lives here.
  const [feedScrollY, setFeedScrollY] = useState(0)

  // True if a signup just happened and we're waiting on the person to tap
  // the confirmation link in their email. Persisted to sessionStorage so it
  // survives them switching away to their email app and back to this tab.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(() => {
    try {
      return sessionStorage.getItem(AWAITING_CONFIRMATION_KEY) === '1'
    } catch {
      return false
    }
  })
  // True only while actively re-checking for a session after the tab
  // becomes visible again post-confirmation — drives the "Logging in…" screen.
  const [confirmingOnReturn, setConfirmingOnReturn] = useState(false)

  const checkUserProfile = async (userSession) => {
    if (!userSession) {
      setChecking(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, department, year_of_study, avatar_url, is_admin, admin_title, has_seen_walkthrough')
        .eq('id', userSession.user.id)
        .maybeSingle()

      if (error) throw error

      setNetworkError(false)
      const isAdmin = !!data?.is_admin
      setIsAdminUser(isAdmin)
      // Admins don't collect full_name during onboarding — only title +
      // department are required for them. Students still need all three.
      const complete = data && (
        isAdmin
          ? !!(data.department && data.admin_title)
          : !!(data.full_name && data.department && data.year_of_study)
      )
      setOnboarded(!!complete)
      setHasSeenWalkthrough(!!data?.has_seen_walkthrough)
      if (data?.avatar_url) setMyAvatar(data.avatar_url)
    } catch (err) {
      // A genuine failure (no connection, DNS, etc.) — do NOT assume
      // "not onboarded". Surface a real network error screen instead.
      console.error('Error fetching profile:', err)
      setNetworkError(true)
    } finally {
      setChecking(false)
    }
  }

  // Single resolution path for the initial session — driven entirely by
  // onAuthStateChange (which always fires once immediately with whatever
  // session already exists, on subscribe). No separate manual getSession()
  // call, so there's no race between two competing resolutions.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        // A session just appeared (fresh login, or the initial mount fire).
        // Re-gate rendering behind the loading screen until we actually know
        // the real onboarding status — otherwise a stale `onboarded` value
        // left over from a previous session can flash the wrong screen.
        setChecking(true)
        checkUserProfile(newSession)
      } else {
        // Reset to "unknown" rather than false — false previously caused
        // Onboarding to flash on the NEXT login, because `session &&
        // onboarded === false` matched before checkUserProfile had a chance
        // to run and correct it.
        setOnboarded(null)
        setIsAdminUser(false)
        setHasSeenWalkthrough(true)
        setChecking(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Reset scroll tracking whenever the active page changes — the scrollable
  // container itself remounts on page change (key={page} below), so its
  // scrollTop naturally resets too; this just keeps state in sync so the
  // header doesn't render collapsed for a flash after switching tabs.
  useEffect(() => {
    setFeedScrollY(0)
  }, [page])

  async function handleRetry() {
    setRetrying(true)
    setNetworkError(false)
    setChecking(true) // show the loading dots for the whole retry, not the error screen's own spinner
    const hadSessionBefore = !!session

    try {
      const { data: { session: freshSession }, error } = await supabase.auth.getSession()
      if (error) throw error

      if (!freshSession && hadSessionBefore) {
        // We had a session before this error — a null result now almost
        // certainly means we're still offline, not a genuine sign-out.
        console.warn('Retry: no session returned but one existed before — treating as still offline.')
        setNetworkError(true)
        setChecking(false)
        setRetrying(false)
        return
      }

      setSession(freshSession)
      await checkUserProfile(freshSession) // sets checking back to false once resolved
    } catch (err) {
      console.error('Retry failed:', err)
      setNetworkError(true)
      setChecking(false)
    }
    setRetrying(false)
  }

  // Called by AuthScreen right after a successful signUp() — persists the
  // "waiting on email confirmation" flag so it survives the person
  // switching to their email app and back to this tab.
  function handleAwaitingConfirmation() {
    try {
      sessionStorage.setItem(AWAITING_CONFIRMATION_KEY, '1')
    } catch {}
    setAwaitingConfirmation(true)
  }

  // Polls briefly for a session once the tab becomes visible again while
  // we're expecting an email confirmation. If confirmation already fully
  // processed, the very first check usually finds it — reading as an
  // effectively silent, near-instant proceed. If it's still processing,
  // "Logging in…" stays up while this keeps retrying, up to ~12s, before
  // quietly giving up and leaving the person on the auth screen.
  async function recheckSessionOnReturn() {
    setConfirmingOnReturn(true)
    const maxAttempts = 8
    const intervalMs = 1500

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        if (freshSession) {
          setSession(freshSession)
          await checkUserProfile(freshSession)
          try {
            sessionStorage.removeItem(AWAITING_CONFIRMATION_KEY)
          } catch {}
          setAwaitingConfirmation(false)
          setConfirmingOnReturn(false)
          return
        }
      } catch (err) {
        console.error('Error rechecking session on return:', err)
      }
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    // Gave up — confirmation still hasn't landed. Drop back to the auth
    // screen quietly; the flag stays set so this runs again next time they
    // return to the tab.
    setConfirmingOnReturn(false)
  }

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && awaitingConfirmation) {
        recheckSessionOnReturn()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [awaitingConfirmation])

  // Persists "seen walkthrough" to the DB before letting the person into the
  // app proper — so a refresh mid-flow never causes it to re-show or get
  // silently skipped, and it survives across devices/sessions for the same
  // account. Walkthrough.jsx itself stays purely presentational and doesn't
  // need to know about Supabase at all.
  async function handleWalkthroughFinish() {
    const { error } = await supabase
      .from('profiles')
      .update({ has_seen_walkthrough: true })
      .eq('id', session.user.id)
    if (error) {
      // Don't trap the person here over a non-critical write failing — log
      // it and let them through anyway; worst case they see this once more
      // on their next login.
      console.error('Error marking walkthrough as seen:', error.message)
    }
    setHasSeenWalkthrough(true)
  }

  useEffect(() => {
    if (!session) return

    async function checkUnreadChats() {
      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, last_message_at, last_sender_id, buyer_last_read_at, seller_last_read_at')
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      if (error) {
        console.error('Error checking unread chats:', error.message)
        return
      }
      const myId = session.user.id
      const anyUnread = (data || []).some(c => {
        if (c.buyer_id === c.seller_id) return false
        if (!c.last_message_at || !c.last_sender_id || c.last_sender_id === myId) return false
        const myLastRead = myId === c.buyer_id ? c.buyer_last_read_at : c.seller_last_read_at
        if (!myLastRead) return true
        return new Date(c.last_message_at) > new Date(myLastRead)
      })
      setHasUnreadChats(anyUnread)
    }

    async function checkUnreadNews() {
      const [latestRes, readRes] = await Promise.all([
        supabase.from('news_articles')
          .select('created_at')
          .neq('author_id', session.user.id) // ignore your own posts — those aren't "unread" for you
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('news_reads').select('last_read_at').eq('user_id', session.user.id).maybeSingle(),
      ])

      if (latestRes.error) {
        console.error('Error checking unread news (latest article):', latestRes.error.message)
        return
      }
      if (readRes.error) {
        console.error('Error checking unread news (read state):', readRes.error.message)
        return
      }

      const latestOther = latestRes.data
      if (!latestOther) {
        setHasUnreadNews(false)
        return
      }
      const lastRead = readRes.data?.last_read_at
      setHasUnreadNews(!lastRead || new Date(latestOther.created_at) > new Date(lastRead))
    }

    checkUnreadChats()
    checkUnreadNews()
    const interval = setInterval(() => {
      checkUnreadChats()
      checkUnreadNews()
    }, 10000)
    return () => clearInterval(interval)
  }, [session, page])

  function handleTabClick(targetId) {
    if (navigator.vibrate) navigator.vibrate(8)
    setPage(targetId)
  }

  function handleDragEnd(event, info) {
    const threshold = 90
    const currentIndex = TABS.findIndex(t => t.id === page)

    if (info.offset.x < -threshold && currentIndex < TABS.length - 1) {
      setPage(TABS[currentIndex + 1].id)
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setPage(TABS[currentIndex - 1].id)
    }
  }

  function handleStartChat(chatDetails) {
    setPendingChat(chatDetails)
    setPage('chats')
  }

  function handleContentScroll(e) {
    setFeedScrollY(e.currentTarget.scrollTop)
  }

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />
  if (checking) return <ComingSoonDots />
  if (confirmingOnReturn) return <LoggingInScreen />
  if (networkError) return <NetworkErrorScreen onRetry={handleRetry} retrying={retrying} />

  if (session && onboarded === false) {
    // Onboarding writes directly to the DB itself — once it calls onComplete,
    // we know the profile row is genuinely complete, so it's safe to flip
    // this locally rather than re-fetching.
    return <Onboarding session={session} onComplete={() => setOnboarded(true)} />
  }

  if (session && onboarded === true && !hasSeenWalkthrough) {
    return <Walkthrough onFinish={handleWalkthroughFinish} />
  }

  if (!session) {
    return <AuthScreen onSignUpSuccess={handleAwaitingConfirmation} />
  }

  if (session && onboarded === true && hasSeenWalkthrough) {
    const hideChrome = chatThreadOpen || listingDetailOpen
    const feedIsCollapsed = page === 'feed' && feedScrollY > FEED_COLLAPSE_THRESHOLD

    return (
      <div style={{
        background: 'var(--page-bg)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <style>{`
          @keyframes dotPulse {
            0%, 100% { opacity: 0.2; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>

        <Suspense fallback={<div style={{minHeight: '100vh'}} /> }>
          {!hideChrome && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
            display: 'flex', justifyContent: 'flex-end', padding: '14px 16px',
            pointerEvents: 'none',
          }}>
            <motion.div
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowProfile(true)}
              animate={{ x: feedIsCollapsed ? -50 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{
                width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden',
                background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', pointerEvents: 'auto',
                border: '2px solid var(--card-bg)', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              }}
            >
              {myAvatar ? (
                <img src={myAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserCircle size={22} color="var(--app-accent)" />
              )}
            </motion.div>
          </div>
        )}

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingBottom: chatThreadOpen ? 0 : '58px' }}>
          <motion.div
            key={page}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            onDragEnd={handleDragEnd}
            onScroll={handleContentScroll}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            style={{
              width: '100%', height: '100%', overflowY: 'auto', touchAction: 'pan-y',
            }}
          >
            {page === 'feed' && <Feed session={session} onOpenChats={() => setPage('chats')} onStartChat={handleStartChat} scrollY={feedScrollY} />}
            {page === 'news' && <News session={session} isAdmin={isAdminUser} />}
            {page === 'polymart' && (
              <Polymart
                session={session}
                onMessageSeller={handleStartChat}
                onListingOpenChange={setListingDetailOpen}
              />
            )}
            {page === 'chats' && (
              <Chats
                session={session}
                pendingChat={pendingChat}
                onClearPending={() => setPendingChat(null)}
                onThreadOpenChange={setChatThreadOpen}
              />
            )}
          </motion.div>
        </div>
        </Suspense>

        {/* Bottom tab bar — reduced height (just enough for icon + label),
            and the old sliding purple indicator line above the active tab
            has been removed entirely. */}
        {!hideChrome && (
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            background: 'var(--card-bg)',
            borderTop: '1px solid var(--app-border)',
            display: 'flex',
            padding: '8px 0 10px',
            zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          }}>
            {TABS.map(tab => {
              const isActive = page === tab.id
              const IconComponent = tab.icon
              const showDot = (tab.id === 'chats' && hasUnreadChats) || (tab.id === 'news' && hasUnreadNews)
              return (
                <motion.div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  whileTap={{ scale: 0.85 }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '3px', cursor: 'pointer', position: 'relative',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <IconComponent
                      size={22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      color={isActive ? 'var(--text-strong)' : 'var(--text-muted)'}
                      style={{ transform: isActive ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.2s, color 0.2s' }}
                    />
                    {showDot && (
                      <div style={{
                        position: 'absolute', top: '-2px', right: '-4px',
                        width: '9px', height: '9px', borderRadius: '50%',
                        background: '#7C3AED', border: '2px solid var(--card-bg)',
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                    color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
                  }}>
                    {tab.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        <AnimatePresence>
          {showProfile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfile(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
              />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                style={{
                  position: 'fixed', top: 0, bottom: 0, right: 0, width: '100%',
                  background: 'var(--page-bg)', zIndex: 201, overflowY: 'auto',
                }}
              >
                <Profile session={session} onBack={() => setShowProfile(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}

export default App