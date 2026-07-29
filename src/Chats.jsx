import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import PublicProfileCard from './PublicProfileCard'
import { useTheme } from './ThemeContext'

const CHAT_BORDER_PURPLE = 'rgba(124,58,237,0.35)'
const UNREAD_BLUE = '#1D9BF0'
const CONV_FIELDS = 'id, listing_id, buyer_id, seller_id, status, last_message_at, buyer_last_read_at, seller_last_read_at, last_sender_id'

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

// Attaches a product-reference message to this specific conversation, once
// per distinct listing. Each product gets its own reference message with
// its own thumbnail — never shared or overwritten by a different product.
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
  if ((existingRef || []).length > 0) return // already referenced in this conversation

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
      console.error('Error creating conversation:', insertErr.message)
      return { error: true }
    }
    conversation = created
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

  const pressTimer = useRef(null)
  const longPressTriggered = useRef(false)

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
        buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url),
        seller:profiles!conversations_seller_id_fkey(full_name, avatar_url)
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
      status: c.status,
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
    })
  }

  function handlePressStart(c) {
    longPressTriggered.current = false
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(10)
      setActionSheetFor(c)
    }, 480)
  }

  function handlePressEnd() {
    clearTimeout(pressTimer.current)
  }

  function handleRowClick(c) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    openThread(c)
  }

  async function handleDelete() {
    const c = actionSheetFor
    if (!c) return
    setActionSheetFor(null)
    if (!window.confirm('Delete this chat? This cannot be undone.')) return
    const { error } = await supabase.from('conversations').delete().eq('id', c.id)
    if (error) {
      console.error('Error deleting conversation:', error.message)
      alert('Could not delete this chat. Please try again.')
    } else {
      setConversations(prev => prev.filter(x => x.id !== c.id))
    }
  }

  function handleReport() {
    setActionSheetFor(null)
    alert('Chat reported. Thank you for helping keep our community safe!')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{
        padding: '18px 20px 20px',
        background: headerBg,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
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
            const isPendingForMe = c.status === 'pending' && !isSelfChat && session.user.id === c.seller_id
            const unread = isUnreadForMe(c, session.user.id)
            const isLast = idx === conversations.length - 1
            return (
              <div
                key={c.id}
                onClick={() => handleRowClick(c)}
                onMouseDown={() => handlePressStart(c)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(c)}
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
                    <span style={{ fontWeight: unread ? 800 : 700, fontSize: '13.5px', color: 'var(--text-strong)' }}>{otherName}</span>
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

      <AnimatePresence>
        {actionSheetFor && (
          <ChatActionSheet
            onClose={() => setActionSheetFor(null)}
            onDelete={handleDelete}
            onReport={handleReport}
            showBlock={false}
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
  const bottomRef = useRef(null)

  const isSelfChat = conversation.buyerId === conversation.sellerId
  const isRecipient = !isSelfChat && session.user.id === conversation.sellerId
  const isInitiator = !isSelfChat && session.user.id === conversation.buyerId
  const isPendingForMe = status === 'pending' && isRecipient

  useEffect(() => {
    fetchMessages(true)
    markAsRead()
    const interval = setInterval(() => fetchMessages(false), 4000)
    return () => clearInterval(interval)
  }, [conversation.id])

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

  async function deleteRequest() {
    if (!window.confirm('Delete this message request? This cannot be undone.')) return
    setDeciding(true)
    const { error } = await supabase.from('conversations').delete().eq('id', conversation.id)
    setDeciding(false)
    if (!error) onBack()
    else console.error('Error deleting request:', error.message)
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

  async function handleDeleteChat() {
    setShowActionSheet(false)
    if (!window.confirm('Delete this chat? This cannot be undone.')) return
    const { error } = await supabase.from('conversations').delete().eq('id', conversation.id)
    if (error) {
      console.error('Error deleting conversation:', error.message)
      alert('Could not delete this chat. Please try again.')
      return
    }
    onConversationDeleted?.()
    onBack()
  }

  function handleReportChat() {
    setShowActionSheet(false)
    alert('Chat reported. Thank you for helping keep our community safe!')
  }

  async function handleBlockUser() {
    setShowActionSheet(false)
    if (!window.confirm(`Block ${conversation.otherName}? They won't be able to message you again.`)) return
    const { error: blockErr } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: session.user.id, blocked_id: conversation.otherUserId })
    if (blockErr) {
      console.error('Error blocking user:', blockErr.message)
      alert('Could not block this user. Please try again.')
      return
    }
    const { error: delErr } = await supabase.from('conversations').delete().eq('id', conversation.id)
    if (delErr) console.error('Error deleting conversation after block:', delErr.message)
    onConversationDeleted?.()
    onBack()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="arrowLeft" size={20} />
        </div>
        <InitialsAvatar
          name={conversation.otherName}
          url={conversation.otherAvatar}
          size={36}
          onClick={!isSelfChat ? () => setViewingProfileId(conversation.otherUserId) : undefined}
        />
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)' }}>{conversation.otherName}</div>
        </div>

        {/* 3-dot icon opens the action sheet directly — no intermediate menu */}
        <div onClick={() => setShowActionSheet(true)} style={{ cursor: 'pointer', color: 'var(--text-strong)', padding: '4px' }}>
          <Icon name="ellipsis-vertical" size={20} />
        </div>
      </div>

      {isPendingForMe && (
        <div style={{ padding: '14px 20px', background: 'var(--app-accent-soft)', borderBottom: '1px solid var(--app-border)' }}>
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
              onClick={deleteRequest}
              disabled={deciding}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {status === 'pending' && isInitiator && (
        <div style={{ padding: '10px 20px', background: 'var(--page-bg)', borderBottom: '1px solid var(--app-border)' }}>
          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Message request sent — they'll see it once they check their chats.
          </p>
        </div>
      )}

      {/* Message area — faint purple tint + a very light "PolyNet" watermark
          centered behind the messages, subtle enough not to compete with content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(124,58,237,0.035)' }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: '52px',
            color: 'var(--app-accent)', opacity: 0.05, whiteSpace: 'nowrap',
          }}>
            PolyNet
          </span>
        </div>

        <div style={{ position: 'relative', height: '100%', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
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
                          onClick={!isSelfChat ? () => setViewingProfileId(conversation.otherUserId) : undefined}
                        />
                      )}
                      <div style={{
                        maxWidth: '75%', padding: '10px 14px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: mine ? 'var(--app-accent)' : 'var(--card-bg)',
                        color: mine ? '#fff' : 'var(--text-body)',
                        border: mine ? 'none' : '1px solid var(--app-border)',
                        fontSize: '13.5px', lineHeight: 1.5, textAlign: 'left',
                      }}>
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

      <div style={{ padding: '12px 16px', background: 'var(--card-bg)', borderTop: '1px solid var(--app-border)', display: 'flex', gap: '8px' }}>
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
            onDelete={handleDeleteChat}
            onReport={handleReportChat}
            onBlock={handleBlockUser}
            showBlock={!isSelfChat}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Chats({ session, pendingChat, onClearPending, onThreadOpenChange }) {
  const { isDark } = useTheme()
  const [openConversation, setOpenConversation] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0)

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
        alert("You can't message this user.")
      } else if (result?.error) {
        alert('Could not open this chat. Please try again.')
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
    </div>
  )
}

export default Chats