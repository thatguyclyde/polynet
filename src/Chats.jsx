import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import PublicProfileCard from './PublicProfileCard'
import { useTheme } from './ThemeContext'

const CHAT_BORDER_PURPLE = 'rgba(124,58,237,0.35)'
const UNREAD_BLUE = '#1D9BF0'
const VERIFIED_BLUE = '#1D9BF0'
const BRAND_PURPLE = '#7C3AED'
const CONV_FIELDS = 'id, listing_id, buyer_id, seller_id, status, last_message_at, buyer_last_read_at, seller_last_read_at, last_sender_id'

// A long-press only counts if the finger stays roughly still — past this
// many px of drift, it's a scroll gesture, not a hold, and the pending
// timer gets cancelled.
const MOVE_THRESHOLD = 10

const CHAT_REPORT_REASONS = [
  'Harassment or bullying',
  'Explicit or sexual content',
  'Hate speech or discrimination',
  'Threats or violent language',
  'Unwanted contact',
  'Spam or scam',
  'Something else',
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function messageTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Small blue check badge — same visual language as the "Verified" badge in
// News.jsx, reused here to mark admin accounts wherever their name shows.
function VerifiedBadge({ size = 13 }) {
  return (
    <span
      title="Admin"
      style={{
        position: 'relative', width: size, height: size, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <Icon
        name="badgeCheck"
        size={size}
        color={VERIFIED_BLUE}
        fill={VERIFIED_BLUE}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <Icon
        name="check"
        size={size * 0.46}
        color="#fff"
        strokeWidth={3.5}
        style={{ position: 'relative' }}
      />
    </span>
  )
}

function InitialsAvatar({ name, url, size = 44, onClick }) {
  const initials = (name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: 'var(--app-accent-soft)', color: 'var(--app-accent)', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials
      )}
    </div>
  )
}
// Shimmer keyframe shared by both skeleton components below.
function SkeletonStyle() {
  return (
    <style>{`
      @keyframes skeletonShimmer {
        0% { background-position: -200px 0; }
        100% { background-position: 200px 0; }
      }
    `}</style>
  )
}

const shimmerBg = {
  background: 'linear-gradient(90deg, var(--app-border-soft) 25%, var(--app-border) 37%, var(--app-border-soft) 63%)',
  backgroundSize: '400px 100%',
  animation: 'skeletonShimmer 1.4s ease-in-out infinite',
}

// Inbox loading state — mimics the real row layout (avatar + two lines)
// so the list doesn't visibly "jump" once real conversations load in.
function InboxSkeleton() {
  return (
    <div style={{ padding: '4px 12px' }}>
      <SkeletonStyle />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, ...shimmerBg }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ width: '55%', height: '13px', borderRadius: '6px', marginBottom: '8px', ...shimmerBg }} />
            <div style={{ width: '80%', height: '11px', borderRadius: '6px', ...shimmerBg }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Message list loading state — a few alternating bubble placeholders,
// roughly matching how a real thread reads (mixed sender sides, varied
// widths) instead of a uniform block.
function MessagesSkeleton() {
  const bubbles = [
    { mine: false, width: '58%' },
    { mine: true, width: '42%' },
    { mine: false, width: '68%' },
    { mine: true, width: '35%' },
    { mine: false, width: '50%' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
      <SkeletonStyle />
      {bubbles.map((b, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: b.mine ? 'flex-end' : 'flex-start' }}>
          <div style={{
            width: b.width, maxWidth: '75%', height: '38px',
            borderRadius: b.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            ...shimmerBg,
          }} />
        </div>
      ))}
    </div>
  )
}

// Two-button confirmation — used for every "are you sure?" moment (delete
// chat, delete message, delete request, block user) instead of
// window.confirm().
function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 20px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 18px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', textAlign: 'center' }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: '13.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>{body}</p>
        <button
          onClick={onConfirm}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: danger ? '#EF4444' : BRAND_PURPLE, color: '#fff',
            fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', marginBottom: '10px',
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            border: '1px solid var(--app-border-soft)', background: 'transparent',
            color: 'var(--text-strong)', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}

// Reason picker — used for reporting a chat, replacing the old plain
// alert().
function ReportReasonsSheet({ onSelect, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 12px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 4px' }} />
        <h3 style={{ margin: '10px 12px 2px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Report chat</h3>
        <p style={{ margin: '0 12px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>What's the issue?</p>
        {CHAT_REPORT_REASONS.map(reason => (
          <div
            key={reason}
            onClick={() => onSelect(reason)}
            style={{ padding: '13px 12px', cursor: 'pointer', borderRadius: '12px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-strong)' }}
          >
            {reason}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// Single-button acknowledgement — used for both success confirmations
// (e.g. "Reported") and error fallbacks, replacing plain alert().
function InfoSheet({ title, body, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 20px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 18px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', textAlign: 'center' }}>{title}</h3>
        <p style={{ margin: '0 0 22px', fontSize: '13.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>{body}</p>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: BRAND_PURPLE, color: '#fff', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  )
}

async function findExistingDirectConversation(myId, otherId) {
  const [a, b] = await Promise.all([
    supabase.from('conversations').select(CONV_FIELDS)
      .eq('buyer_id', myId).eq('seller_id', otherId)
      .order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('conversations').select(CONV_FIELDS)
      .eq('buyer_id', otherId).eq('seller_id', myId)
      .order('last_message_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (a.error) { console.error('Error checking conversation:', a.error.message); return { error: true } }
  if (b.error) { console.error('Error checking conversation:', b.error.message); return { error: true } }

  const candidates = [a.data, b.data].filter(Boolean)
  if (candidates.length === 0) return { data: null }
  candidates.sort((x, y) => new Date(y.last_message_at || 0) - new Date(x.last_message_at || 0))
  return { data: candidates[0] }
}

async function isBlockedEitherWay(myId, otherId) {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .or(`and(blocker_id.eq.${myId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${myId})`)
    .limit(1)
  if (error) {
    console.error('Error checking block status:', error.message)
    return false
  }
  return (data || []).length > 0
}

async function insertListingReferenceIfNeeded(conversationId, myId, listingId, listingTitle, listingImage) {
  if (!listingId) return

  const { data: existingRef, error: checkErr } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('ref_listing_id', listingId)
    .limit(1)

  if (checkErr) {
    console.error('Error checking existing listing reference:', checkErr.message)
    return
  }
  if ((existingRef || []).length > 0) return

  const { error: insertErr } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_id: myId,
    content: '',
    ref_listing_id: listingId,
    ref_listing_title: listingTitle,
    ref_listing_image: listingImage,
  })
  if (insertErr) {
    console.error('Error inserting listing reference:', insertErr.message)
    return
  }

  await supabase.from('conversations').update({
    last_message: listingTitle ? `Asking about: ${listingTitle}` : 'Sent a product',
    last_message_at: new Date().toISOString(),
    last_sender_id: myId,
  }).eq('id', conversationId)
}

// Creates a conversation, and gracefully recovers if a race condition means
// one was created by a concurrent request a split second earlier — the
// unique DB index guarantees only one row per pair can ever exist, so on
// conflict we just re-fetch and use that instead of erroring out.
async function findOrCreateConversation(session, pendingChat) {
  const { listingId = null, sellerId, sellerName, sellerAvatar = null, listingImage = null, listingTitle = null } = pendingChat
  const myId = session.user.id
  const isSelfChat = sellerId === myId

  if (!isSelfChat) {
    const blocked = await isBlockedEitherWay(myId, sellerId)
    if (blocked) return { blocked: true }
  }

  const { data: existing, error: fetchErr } = await findExistingDirectConversation(myId, sellerId)
  if (fetchErr) return { error: true }

  let conversation = existing
  if (!conversation) {
    const { data: created, error: insertErr } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: myId,
        seller_id: sellerId,
        status: isSelfChat ? 'accepted' : 'pending',
      })
      .select(CONV_FIELDS)
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Someone else's request beat us to it by milliseconds — fetch the
        // row that actually exists now instead of failing.
        const { data: recovered, error: recoverErr } = await findExistingDirectConversation(myId, sellerId)
        if (recoverErr || !recovered) {
          console.error('Error recovering from duplicate conversation conflict:', recoverErr?.message)
          return { error: true }
        }
        conversation = recovered
      } else {
        console.error('Error creating conversation:', insertErr.message)
        return { error: true }
      }
    } else {
      conversation = created
    }
  }
  if (!conversation) return { error: true }

  if (listingId) {
    await insertListingReferenceIfNeeded(conversation.id, myId, listingId, listingTitle, listingImage)
  }

  return {
    id: conversation.id,
    otherName: isSelfChat ? 'You' : (sellerName || 'PolyNet Student'),
    otherAvatar: sellerAvatar,
    otherUserId: sellerId,
    status: conversation.status,
    buyerId: conversation.buyer_id,
    sellerId: conversation.seller_id,
  }
}

function isUnreadForMe(c, myId) {
  if (c.buyer_id === c.seller_id) return false
  if (!c.last_message_at || !c.last_sender_id) return false
  if (c.last_sender_id === myId) return false
  const myLastRead = myId === c.buyer_id ? c.buyer_last_read_at : c.seller_last_read_at
  if (!myLastRead) return true
  return new Date(c.last_message_at) > new Date(myLastRead)
}

// Deletes a conversation and verifies the row was actually removed — if RLS
// silently blocks it (zero rows affected, no thrown error), this surfaces
// that as a real failure instead of pretending it worked.
async function deleteConversationVerified(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .select('id')

  if (error) {
    console.error('Error deleting conversation:', error.message)
    return { ok: false }
  }
  if (!data || data.length === 0) {
    console.error('Delete affected 0 rows — likely blocked by RLS permissions.')
    return { ok: false }
  }
  return { ok: true }
}

function otherPartyOf(c, myId) {
  const isSelfChat = c.buyer_id === c.seller_id
  const isBuyer = c.buyer_id === myId
  const otherProfile = isSelfChat ? c.buyer : (isBuyer ? c.seller : c.buyer)
  return {
    otherUserId: isBuyer ? c.seller_id : c.buyer_id,
    otherName: isSelfChat ? 'You' : (otherProfile?.full_name || 'PolyNet Student'),
  }
}

function ChatActionSheet({ onClose, onDelete, onReport, onBlock, showBlock }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 12px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 14px' }} />

        <div onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <Icon name="trash-2" size={19} color="var(--danger)" />
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--danger)' }}>Delete chat</span>
        </div>

        <div onClick={onReport} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <Icon name="flag" size={19} color="var(--text-strong)" />
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>Report</span>
        </div>

        {showBlock && (
          <div onClick={onBlock} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', cursor: 'pointer', borderRadius: '12px' }}>
            <Icon name="ban" size={19} color="var(--danger)" />
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--danger)' }}>Block user</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Inbox({ session, onOpenThread, isDark, refreshSignal }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionSheetFor, setActionSheetFor] = useState(null)
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(null)
  const [confirmBlockChat, setConfirmBlockChat] = useState(null)
  const [reportChatTarget, setReportChatTarget] = useState(null)
  const [infoNotice, setInfoNotice] = useState(null) // { title, body }
  const [deleting, setDeleting] = useState(false)

  const pressTimer = useRef(null)
  const longPressTriggered = useRef(false)
  const touchStartPos = useRef({ x: 0, y: 0 })

  // Header height is measured (not hardcoded) so the list's top padding
  // always matches the *actual* rendered header exactly — no matter the
  // font, safe-area insets, or text wrapping on a given device. This is
  // what makes the scroll-to-top boundary land exactly on the first chat
  // row instead of stopping halfway behind the header.
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(76)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const headerBg = isDark ? '#000000' : '#FFFFFF'

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(() => fetchConversations(false), 6000)
    return () => clearInterval(interval)
  }, [refreshSignal])

  async function fetchConversations(showLoading = true) {
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, listing_id, buyer_id, seller_id, status, last_message, last_message_at, created_at,
        buyer_last_read_at, seller_last_read_at, last_sender_id,
        buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url, is_admin),
        seller:profiles!conversations_seller_id_fkey(full_name, avatar_url, is_admin)
      `)
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order('last_message_at', { ascending: false })
    if (error) console.error('Error fetching conversations:', error.message)
    setConversations(data || [])
    if (showLoading) setLoading(false)
  }

  function openThread(c) {
    const isSelfChat = c.buyer_id === c.seller_id
    const isBuyer = c.buyer_id === session.user.id
    const otherProfile = isSelfChat ? c.buyer : (isBuyer ? c.seller : c.buyer)
    onOpenThread({
      id: c.id,
      otherName: isSelfChat ? 'You' : (otherProfile?.full_name || 'PolyNet Student'),
      otherAvatar: otherProfile?.avatar_url || null,
      otherUserId: isBuyer ? c.seller_id : c.buyer_id,
      otherIsAdmin: !isSelfChat && !!otherProfile?.is_admin,
      status: c.status,
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
    })
  }

  // Long press only fires if the finger stays roughly still — a scroll
  // gesture that happens to last 480ms no longer gets misread as a hold,
  // since any real movement past MOVE_THRESHOLD cancels the pending timer.
  function handlePressStart(c, e) {
    longPressTriggered.current = false
    const touch = e?.touches?.[0]
    if (touch) touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(10)
      setActionSheetFor(c)
    }, 480)
  }

  function handleTouchMove(e) {
    if (!pressTimer.current) return
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handlePressEnd() {
    clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  function handleRowClick(c) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    openThread(c)
  }

  async function performDeleteChat() {
    const c = confirmDeleteChat
    setConfirmDeleteChat(null)
    if (!c) return
    setDeleting(true)
    const result = await deleteConversationVerified(c.id)
    setDeleting(false)
    if (!result.ok) {
      setInfoNotice({ title: 'Could not delete chat', body: 'Please try again.' })
      fetchConversations(false) // re-sync in case it was a false local removal
      return
    }
    setConversations(prev => prev.filter(x => x.id !== c.id))
  }

  function submitChatReport(reason) {
    const c = reportChatTarget
    setReportChatTarget(null)
    if (!c) return
    const { otherUserId } = otherPartyOf(c, session.user.id)
    supabase.from('reports').insert({
      target_type: 'chat',
      target_id: c.id,
      reporter_id: session.user.id,
      reason,
      context_preview: c.last_message ? c.last_message.slice(0, 140) : null,
      context_author_id: otherUserId,
    }).then(({ error }) => {
      if (error) console.error('Error submitting report:', error.message)
    })
    setInfoNotice({ title: 'Reported', body: 'Thank you for helping keep our community safe.' })
  }

  // Same block flow as inside an open thread, just triggered from the
  // long-press sheet on an inbox row instead.
  async function performBlock() {
    const c = confirmBlockChat
    setConfirmBlockChat(null)
    if (!c) return
    const isSelfChat = c.buyer_id === c.seller_id
    if (isSelfChat) return

    const { otherUserId } = otherPartyOf(c, session.user.id)

    const { error: blockErr } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: session.user.id, blocked_id: otherUserId })
    if (blockErr) {
      console.error('Error blocking user:', blockErr.message)
      setInfoNotice({ title: 'Could not block user', body: 'Please try again.' })
      return
    }
    const result = await deleteConversationVerified(c.id)
    if (!result.ok) console.error('Blocked user but could not delete the conversation.')
    setConversations(prev => prev.filter(x => x.id !== c.id))
  }

  const blockTargetName = confirmBlockChat ? otherPartyOf(confirmBlockChat, session.user.id).otherName : ''

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div
        ref={headerRef}
        style={{
          padding: '18px 20px 20px',
          background: headerBg,
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <h1 style={{
            margin: 0,
            fontFamily: "'Baloo 2', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.4px',
            lineHeight: '1.35',
            background: 'linear-gradient(120deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'inline-block',
          }}>
            Messages
          </h1>
        </div>
      </div>

      {/* Scrollable list area — bounded to the viewport (the root above is
          height:100vh + overflow:hidden, not minHeight:100vh), so this is
          the only thing that can ever scroll, and only once its content
          actually exceeds the available space. A short list just sits
          still — no stray few-px scroll or rubber-band from page/body
          scrolling, which is what a minHeight:100vh page allowed before. */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingTop: `${headerHeight}px` }}>
      {loading ? (
        <InboxSkeleton />
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 30px' }}>
          <div style={{ marginBottom: '12px', opacity: 0.35, color: 'var(--app-accent)' }}>
            <Icon name="inbox" size={32} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No conversations yet</p>
        </div>
      ) : (
        <div style={{ padding: '4px 12px' }}>
          {conversations.map((c, idx) => {
            const isSelfChat = c.buyer_id === c.seller_id
            const isBuyer = c.buyer_id === session.user.id
            const otherProfile = isSelfChat ? c.buyer : (isBuyer ? c.seller : c.buyer)
            const otherName = isSelfChat ? 'You' : (otherProfile?.full_name || 'PolyNet Student')
            const isOtherAdmin = !isSelfChat && !!otherProfile?.is_admin
            const isPendingForMe = c.status === 'pending' && !isSelfChat && session.user.id === c.seller_id
            const unread = isUnreadForMe(c, session.user.id)
            const isLast = idx === conversations.length - 1
            return (
              <div
                key={c.id}
                onClick={() => handleRowClick(c)}
                onMouseDown={(e) => handlePressStart(c, e)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={(e) => handlePressStart(c, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handlePressEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px', cursor: 'pointer',
                  borderBottom: isLast ? 'none' : `1px solid ${CHAT_BORDER_PURPLE}`,
                  userSelect: 'none', WebkitUserSelect: 'none',
                }}
              >
                <InitialsAvatar name={otherName} url={otherProfile?.avatar_url} size={48} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span style={{
                        fontWeight: unread ? 800 : 700, fontSize: '13.5px', color: 'var(--text-strong)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {otherName}
                      </span>
                      {isOtherAdmin && <VerifiedBadge size={12} />}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {unread && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: UNREAD_BLUE, flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.last_message_at)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: isPendingForMe ? 'var(--app-accent)' : 'var(--text-muted)', fontWeight: isPendingForMe || unread ? 700 : 400, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isPendingForMe ? 'Message request' : (c.last_message || 'Start the conversation')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      <AnimatePresence>
        {actionSheetFor && (
          <ChatActionSheet
            onClose={() => setActionSheetFor(null)}
            onDelete={() => { const c = actionSheetFor; setActionSheetFor(null); setConfirmDeleteChat(c) }}
            onReport={() => { const c = actionSheetFor; setActionSheetFor(null); setReportChatTarget(c) }}
            onBlock={() => { const c = actionSheetFor; setActionSheetFor(null); setConfirmBlockChat(c) }}
            showBlock={actionSheetFor.buyer_id !== actionSheetFor.seller_id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteChat && (
          <ConfirmSheet
            title="Delete this chat?"
            body="This will remove the conversation permanently. This can't be undone."
            confirmLabel="Delete Chat"
            danger
            onConfirm={performDeleteChat}
            onCancel={() => setConfirmDeleteChat(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBlockChat && (
          <ConfirmSheet
            title={`Block ${blockTargetName}?`}
            body="They won't be able to message you again."
            confirmLabel="Block User"
            danger
            onConfirm={performBlock}
            onCancel={() => setConfirmBlockChat(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportChatTarget && (
          <ReportReasonsSheet
            onSelect={submitChatReport}
            onClose={() => setReportChatTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {infoNotice && (
          <InfoSheet
            title={infoNotice.title}
            body={infoNotice.body}
            onClose={() => setInfoNotice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ChatThread({ session, conversation, onBack, onConversationDeleted }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(conversation.status)
  const [deciding, setDeciding] = useState(false)
  const [viewingProfileId, setViewingProfileId] = useState(null)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [confirmDeleteChatOpen, setConfirmDeleteChatOpen] = useState(false)
  const [confirmDeleteRequestOpen, setConfirmDeleteRequestOpen] = useState(false)
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false)
  const [reportSheetOpen, setReportSheetOpen] = useState(false)
  const [infoNotice, setInfoNotice] = useState(null) // { title, body }
  const [deleteMessageId, setDeleteMessageId] = useState(null)
  // Fetched independently of whatever the caller passed in — a chat opened
  // via "Message Seller" (Polymart/Feed) won't have otherIsAdmin set on the
  // conversation object the way one opened from the Inbox row does, so this
  // stays the single source of truth regardless of entry point.
  const [otherIsAdmin, setOtherIsAdmin] = useState(!!conversation.otherIsAdmin)
  const bottomRef = useRef(null)

  // Message long-press-to-delete — same stationary-finger requirement as
  // the Inbox row long press, so scrolling the message list never gets
  // misread as a hold on a bubble.
  const messagePressTimer = useRef(null)
  const messagePressTriggered = useRef(false)
  const messageTouchStart = useRef({ x: 0, y: 0 })

  const isSelfChat = conversation.buyerId === conversation.sellerId
  const isRecipient = !isSelfChat && session.user.id === conversation.sellerId
  const isInitiator = !isSelfChat && session.user.id === conversation.buyerId
  const isPendingForMe = status === 'pending' && isRecipient
  const showPendingBanner = isPendingForMe
  const showInitiatorNotice = status === 'pending' && isInitiator

  // --- Precise layout measurement -------------------------------------
  // Header and banner heights are measured off the real DOM (not assumed
  // pixel constants) so the message list's top padding — and therefore
  // where scrolling "stops" at the very top — lines up exactly with the
  // bottom edge of whatever is actually fixed above it. Same idea for the
  // input bar height, which sizes the list's bottom padding.
  const headerRef = useRef(null)
  const bannerRef = useRef(null)
  const inputBarRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(64)
  const [bannerHeight, setBannerHeight] = useState(0)
  const [inputBarHeight, setInputBarHeight] = useState(72)

  useEffect(() => {
    const headerEl = headerRef.current
    const inputEl = inputBarRef.current
    if (!headerEl || !inputEl) return

    const measure = () => {
      setHeaderHeight(headerEl.offsetHeight)
      setBannerHeight(bannerRef.current ? bannerRef.current.offsetHeight : 0)
      setInputBarHeight(inputEl.offsetHeight)
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(headerEl)
    ro.observe(inputEl)
    if (bannerRef.current) ro.observe(bannerRef.current)

    return () => ro.disconnect()
  }, [showPendingBanner, showInitiatorNotice])

  const topOffset = headerHeight + bannerHeight

  // --- Keyboard-aware bottom offset ------------------------------------
  // On mobile, the layout viewport doesn't shrink when the keyboard opens
  // (only visualViewport does), so a plain `bottom: 0` bar stays pinned
  // under the keyboard instead of riding above it, and anything else fixed
  // at the bottom of the screen (like nav tabs) can end up rendered on top
  // of the keyboard. Tracking visualViewport and nudging the input bar up
  // by the keyboard's height keeps it glued just above the keyboard.
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handleViewportChange = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    handleViewportChange()
    vv.addEventListener('resize', handleViewportChange)
    vv.addEventListener('scroll', handleViewportChange)
    return () => {
      vv.removeEventListener('resize', handleViewportChange)
      vv.removeEventListener('scroll', handleViewportChange)
    }
  }, [])

  useEffect(() => {
    fetchMessages(true)
    markAsRead()
    const interval = setInterval(() => fetchMessages(false), 4000)
    return () => clearInterval(interval)
  }, [conversation.id])

  useEffect(() => {
    if (isSelfChat) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', conversation.otherUserId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Error checking admin status:', error.message); return }
        setOtherIsAdmin(!!data?.is_admin)
      })
    return () => { cancelled = true }
  }, [conversation.otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0) markAsRead()
  }, [messages.length])

  async function markAsRead() {
    const isBuyer = conversation.buyerId === session.user.id
    const column = isBuyer ? 'buyer_last_read_at' : 'seller_last_read_at'
    const { error } = await supabase.from('conversations').update({ [column]: new Date().toISOString() }).eq('id', conversation.id)
    if (error) console.error('Error marking as read:', error.message)
  }

  async function fetchMessages(showLoading) {
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, created_at, ref_listing_id, ref_listing_title, ref_listing_image')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    if (error) console.error('Error fetching messages:', error.message)
    setMessages(data || [])
    if (showLoading) setLoading(false)
  }

  async function acceptRequest() {
    setDeciding(true)
    const { error } = await supabase.from('conversations').update({ status: 'accepted' }).eq('id', conversation.id)
    if (!error) setStatus('accepted')
    else console.error('Error accepting request:', error.message)
    setDeciding(false)
  }

  async function performDeleteRequest() {
    setConfirmDeleteRequestOpen(false)
    setDeciding(true)
    const result = await deleteConversationVerified(conversation.id)
    setDeciding(false)
    if (!result.ok) {
      setInfoNotice({ title: 'Could not delete request', body: 'Please try again.' })
      return
    }
    onBack()
  }

  async function sendMessage() {
    if (!text.trim()) return
    setSending(true)
    const content = text.trim()
    setText('')
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: conversation.id,
      sender_id: session.user.id,
      content,
    })
    if (!error) {
      if (isPendingForMe) {
        await supabase.from('conversations').update({ status: 'accepted' }).eq('id', conversation.id)
        setStatus('accepted')
      }
      const isBuyer = conversation.buyerId === session.user.id
      const myReadColumn = isBuyer ? 'buyer_last_read_at' : 'seller_last_read_at'
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_sender_id: session.user.id,
        [myReadColumn]: new Date().toISOString(),
      }).eq('id', conversation.id)
      fetchMessages(false)
    } else {
      console.error('Error sending message:', error.message)
      setText(content)
    }
    setSending(false)
  }

  async function performDeleteChat() {
    setConfirmDeleteChatOpen(false)
    const result = await deleteConversationVerified(conversation.id)
    if (!result.ok) {
      setInfoNotice({ title: 'Could not delete chat', body: 'Please try again.' })
      return
    }
    onConversationDeleted?.()
    onBack()
  }

  function submitChatReport(reason) {
    setReportSheetOpen(false)
    supabase.from('reports').insert({
      target_type: 'chat',
      target_id: conversation.id,
      reporter_id: session.user.id,
      reason,
      context_preview: `Chat with ${conversation.otherName}`,
      context_author_id: conversation.otherUserId,
    }).then(({ error }) => {
      if (error) console.error('Error submitting report:', error.message)
    })
    setInfoNotice({ title: 'Reported', body: 'Thank you for helping keep our community safe.' })
  }

  async function performBlockUser() {
    setConfirmBlockOpen(false)
    const { error: blockErr } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: session.user.id, blocked_id: conversation.otherUserId })
    if (blockErr) {
      console.error('Error blocking user:', blockErr.message)
      setInfoNotice({ title: 'Could not block user', body: 'Please try again.' })
      return
    }
    const result = await deleteConversationVerified(conversation.id)
    if (!result.ok) console.error('Blocked user but could not delete the conversation.')
    onConversationDeleted?.()
    onBack()
  }

  function openOtherProfile() {
    if (isSelfChat) return
    setViewingProfileId(conversation.otherUserId)
  }

  // --- Message long-press-to-delete ------------------------------------
  // Only meaningful on your own messages — deleting someone else's message
  // out from under them isn't something a regular chat participant should
  // be able to do.
  function handleMessagePressStart(m, mine, e) {
    if (!mine) return
    messagePressTriggered.current = false
    const touch = e?.touches?.[0]
    if (touch) messageTouchStart.current = { x: touch.clientX, y: touch.clientY }
    messagePressTimer.current = setTimeout(() => {
      messagePressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(10)
      setDeleteMessageId(m.id)
    }, 480)
  }

  function handleMessageTouchMove(e) {
    if (!messagePressTimer.current) return
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - messageTouchStart.current.x
    const dy = touch.clientY - messageTouchStart.current.y
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      clearTimeout(messagePressTimer.current)
      messagePressTimer.current = null
    }
  }

  function handleMessagePressEnd() {
    clearTimeout(messagePressTimer.current)
    messagePressTimer.current = null
  }

  async function performDeleteMessage() {
    const messageId = deleteMessageId
    setDeleteMessageId(null)
    if (!messageId) return
    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId)
    if (error) {
      console.error('Error deleting message:', error.message)
      setInfoNotice({ title: 'Could not delete message', body: 'Please try again.' })
      return
    }
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }
  // Swipe right (finger moving left→right) to exit the chat, matching
  // the gesture already used to close listing details elsewhere in the
  // app. Only responds to a rightward drag past a small threshold — a
  // leftward swipe or a short/accidental drag does nothing.
  function handleThreadDragEnd(event, info) {
    const distanceThreshold = 60
    const velocityThreshold = 500
    if (info.offset.x > distanceThreshold || info.velocity.x > velocityThreshold) {
      onBack()
    }
  }

  return (
    // height (not minHeight) + overflow:hidden bounds this to the viewport,
    // so the message list's overflowY:auto below is the thing that scrolls
    // — not the page. That's also what keeps the "PolyNet" watermark fixed:
    // it lives in a sibling container that no longer grows past the screen.
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35}
      onDragEnd={handleThreadDragEnd}
      style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* HEADER — fixed, stays put regardless of message-list scroll */}
      <div
        ref={headerRef}
        style={{
          padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)',
          display: 'flex', alignItems: 'center', gap: '12px',
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 130,
        }}
      >
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="arrowLeft" size={20} />
        </div>
        <InitialsAvatar
          name={conversation.otherName}
          url={conversation.otherAvatar}
          size={36}
          onClick={!isSelfChat ? openOtherProfile : undefined}
        />
        {/* Tapping the name area (the "top bar") opens the same read-only
            profile card as the avatar — just a bigger, more discoverable
            hit target. */}
        <div
          onClick={!isSelfChat ? openOtherProfile : undefined}
          style={{
            textAlign: 'left', flex: 1, minWidth: 0,
            cursor: !isSelfChat ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <div style={{
            fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {conversation.otherName}
          </div>
          {otherIsAdmin && <VerifiedBadge size={13} />}
        </div>

        <div onClick={() => setShowActionSheet(true)} style={{ cursor: 'pointer', color: 'var(--text-strong)', padding: '4px' }}>
          <Icon name="ellipsis-vertical" size={20} />
        </div>
      </div>

      {/* PENDING-REQUEST BANNER — also fixed, sits directly under the
          header. Its "top" is the *measured* header height, not a
          hardcoded '64px', so it never gaps or overlaps. */}
      {isPendingForMe && (
        <div
          ref={bannerRef}
          style={{
            padding: '14px 20px', background: 'var(--app-accent-soft)', borderBottom: '1px solid var(--app-border)',
            position: 'fixed', top: `${headerHeight}px`, left: 0, right: 0, zIndex: 129,
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: '12.5px', fontWeight: 700, color: 'var(--app-accent)' }}>
            Message request — keep this conversation or delete it?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={acceptRequest}
              disabled={deciding}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Keep
            </button>
            <button
              onClick={() => setConfirmDeleteRequestOpen(true)}
              disabled={deciding}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {status === 'pending' && isInitiator && (
        <div
          ref={bannerRef}
          style={{
            padding: '10px 20px', background: 'var(--page-bg)', borderBottom: '1px solid var(--app-border)',
            position: 'fixed', top: `${headerHeight}px`, left: 0, right: 0, zIndex: 129,
          }}
        >
          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Message request sent — they'll see it once they check their chats.
          </p>
        </div>
      )}

      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(124,58,237,0.035)',
        paddingTop: `${topOffset}px`, paddingBottom: `${inputBarHeight + keyboardOffset}px`,
        transition: 'padding-bottom 0.15s ease-out',
      }}>
        <div style={{
          position: 'absolute', inset: 0, top: `${topOffset}px`, bottom: `${inputBarHeight + keyboardOffset}px`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: '52px',
            color: 'var(--app-accent)', opacity: 0.05, whiteSpace: 'nowrap',
          }}>
            PolyNet
          </span>
        </div>

        <div style={{ position: 'relative', height: '100%', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {loading ? (
            <MessagesSkeleton />
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>Say hello 👋</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === session.user.id
              const hasRef = !!m.ref_listing_image
              const hasText = m.content && m.content.trim().length > 0

              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {hasRef && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
                      padding: '6px', borderRadius: '14px', background: 'var(--card-bg)',
                      border: '1px solid var(--app-border)', maxWidth: '75%',
                    }}>
                      <img
                        src={m.ref_listing_image}
                        alt={m.ref_listing_title || 'Listing'}
                        style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.ref_listing_title || 'Listing'}
                      </span>
                    </div>
                  )}
                  {hasText && (
                    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px', width: '100%' }}>
                      {!mine && (
                        <InitialsAvatar
                          name={conversation.otherName}
                          url={conversation.otherAvatar}
                          size={22}
                          onClick={!isSelfChat ? openOtherProfile : undefined}
                        />
                      )}
                      <div
                        onMouseDown={(e) => handleMessagePressStart(m, mine, e)}
                        onMouseUp={handleMessagePressEnd}
                        onMouseLeave={handleMessagePressEnd}
                        onTouchStart={(e) => handleMessagePressStart(m, mine, e)}
                        onTouchMove={handleMessageTouchMove}
                        onTouchEnd={handleMessagePressEnd}
                        style={{
                          maxWidth: '75%', padding: '10px 14px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: mine ? 'var(--app-accent)' : 'var(--card-bg)',
                          color: mine ? '#fff' : 'var(--text-body)',
                          border: mine ? 'none' : '1px solid var(--app-border)',
                          fontSize: '13.5px', lineHeight: 1.5, textAlign: 'left',
                          userSelect: 'none', WebkitUserSelect: 'none',
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  )}
                  <div style={{
                    fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px',
                    marginRight: mine ? '4px' : 0, marginLeft: mine || !hasText ? 0 : '28px',
                  }}>
                    {messageTime(m.created_at)}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* MESSAGE INPUT BAR — fixed at the bottom, but its `bottom` offset
          tracks the visualViewport keyboard height, so it rides up flush
          above the keyboard instead of staying pinned under it (which is
          what let nav chrome/keyboard overlap look glitchy before). */}
      <div
        ref={inputBarRef}
        style={{
          padding: '12px 16px', background: 'var(--card-bg)', borderTop: '1px solid var(--app-border)',
          display: 'flex', gap: '8px',
          position: 'fixed', bottom: `${keyboardOffset}px`, left: 0, right: 0, zIndex: 130,
          transition: 'bottom 0.15s ease-out',
        }}
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          placeholder="Message..."
          style={{ flex: 1, padding: '12px 14px', borderRadius: '999px', border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)', color: 'var(--text-strong)', outline: 'none', fontSize: '13.5px' }}
        />
        <button onClick={sendMessage} disabled={sending || !text.trim()} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: text.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)', color: '#fff', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="send" size={16} />
        </button>
      </div>

      {viewingProfileId && (
        <PublicProfileCard
          userId={viewingProfileId}
          session={session}
          onClose={() => setViewingProfileId(null)}
          hideMessageButton
        />
      )}

      <AnimatePresence>
        {showActionSheet && (
          <ChatActionSheet
            onClose={() => setShowActionSheet(false)}
            onDelete={() => { setShowActionSheet(false); setConfirmDeleteChatOpen(true) }}
            onReport={() => { setShowActionSheet(false); setReportSheetOpen(true) }}
            onBlock={() => { setShowActionSheet(false); setConfirmBlockOpen(true) }}
            showBlock={!isSelfChat}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteChatOpen && (
          <ConfirmSheet
            title="Delete this chat?"
            body="This will remove the conversation permanently. This can't be undone."
            confirmLabel="Delete Chat"
            danger
            onConfirm={performDeleteChat}
            onCancel={() => setConfirmDeleteChatOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteRequestOpen && (
          <ConfirmSheet
            title="Delete this message request?"
            body="This can't be undone."
            confirmLabel="Delete Request"
            danger
            onConfirm={performDeleteRequest}
            onCancel={() => setConfirmDeleteRequestOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBlockOpen && (
          <ConfirmSheet
            title={`Block ${conversation.otherName}?`}
            body="They won't be able to message you again."
            confirmLabel="Block User"
            danger
            onConfirm={performBlockUser}
            onCancel={() => setConfirmBlockOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportSheetOpen && (
          <ReportReasonsSheet
            onSelect={submitChatReport}
            onClose={() => setReportSheetOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteMessageId && (
          <ConfirmSheet
            title="Delete this message?"
            body="This will remove it for everyone in this chat. This can't be undone."
            confirmLabel="Delete Message"
            danger
            onConfirm={performDeleteMessage}
            onCancel={() => setDeleteMessageId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {infoNotice && (
          <InfoSheet
            title={infoNotice.title}
            body={infoNotice.body}
            onClose={() => setInfoNotice(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Chats({ session, pendingChat, onClearPending, onThreadOpenChange }) {
  const { isDark } = useTheme()
  const [openConversation, setOpenConversation] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0)
  const [infoNotice, setInfoNotice] = useState(null) // { title, body }

  useEffect(() => {
    onThreadOpenChange?.(!!openConversation)
  }, [openConversation])

  useEffect(() => {
    if (!pendingChat) return
    let cancelled = false
    setResolving(true)
    findOrCreateConversation(session, pendingChat).then(result => {
      if (cancelled) return

      if (result?.blocked) {
        setInfoNotice({ title: "Can't message this user", body: "You can't message this user." })
      } else if (result?.error) {
        setInfoNotice({ title: 'Could not open chat', body: 'Please try again.' })
      } else if (result) {
        setOpenConversation(result)
      }

      onClearPending()
      setResolving(false)
    })
    return () => { cancelled = true }
  }, [pendingChat])

  function handleCloseThread() {
    setOpenConversation(null)
    setInboxRefreshKey(k => k + 1)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <Inbox session={session} onOpenThread={setOpenConversation} isDark={isDark} refreshSignal={inboxRefreshKey} />

      {resolving && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 260,
          background: 'rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {openConversation && (
          <motion.div
            key="thread-overlay"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'var(--page-bg)' }}
          >
            <ChatThread
              session={session}
              conversation={openConversation}
              onBack={handleCloseThread}
              onConversationDeleted={() => setInboxRefreshKey(k => k + 1)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {infoNotice && (
          <InfoSheet
            title={infoNotice.title}
            body={infoNotice.body}
            onClose={() => setInfoNotice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Chats
