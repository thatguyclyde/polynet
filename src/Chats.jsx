import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import PublicProfileCard from './PublicProfileCard'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
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

// A conversation's initial status is 'pending' unless it's a self-chat, in which
// case there's no one to "request" — it's accepted immediately.
async function findOrCreateConversation(session, pendingChat) {
  const { listingId = null, sellerId, listingTitle = null, sellerName, sellerAvatar = null } = pendingChat
  const myId = session.user.id
  const isSelfChat = sellerId === myId

  let query = supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, status, last_message_at')

  if (listingId) {
    query = query.eq('listing_id', listingId).eq('buyer_id', myId)
  } else {
    query = query
      .is('listing_id', null)
      .or(`and(buyer_id.eq.${myId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${myId})`)
  }

  const { data: existing, error: fetchErr } = await query.maybeSingle()

  if (fetchErr) {
    console.error('Error checking for existing conversation:', fetchErr.message)
    return { error: true }
  }

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
      .select('id, listing_id, buyer_id, seller_id, status, last_message_at')
      .single()

    if (insertErr) {
      console.error('Error creating conversation:', insertErr.message)
      return { error: true }
    }
    conversation = created
  }
  if (!conversation) return { error: true }

  return {
    id: conversation.id,
    listingTitle,
    listingImage: null,
    otherName: isSelfChat ? 'You' : (sellerName || 'PolyNet Student'),
    otherAvatar: isSelfChat ? null : sellerAvatar,
    otherUserId: sellerId,
    status: conversation.status,
    buyerId: conversation.buyer_id,
    sellerId: conversation.seller_id,
  }
}

function Inbox({ session, onOpenThread, onBack }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, listing_id, buyer_id, seller_id, status, last_message, last_message_at, created_at,
        listing:marketplace_listings(id, title, image_url),
        buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url),
        seller:profiles!conversations_seller_id_fkey(full_name, avatar_url)
      `)
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order('last_message_at', { ascending: false })
    if (error) console.error('Error fetching conversations:', error.message)
    setConversations(data || [])
    setLoading(false)
  }

  function openThread(c) {
    const isSelfChat = c.buyer_id === c.seller_id
    const isBuyer = c.buyer_id === session.user.id
    const otherProfile = isSelfChat ? (isBuyer ? c.buyer : c.seller) : (isBuyer ? c.seller : c.buyer)
    onOpenThread({
      id: c.id,
      listingTitle: c.listing?.title || null,
      listingImage: c.listing?.image_url || null,
      otherName: isSelfChat ? 'You' : (otherProfile?.full_name || 'PolyNet Student'),
      otherAvatar: isSelfChat ? null : (otherProfile?.avatar_url || null),
      otherUserId: isBuyer ? c.seller_id : c.buyer_id,
      status: c.status,
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevronLeft" size={20} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-strong)' }}>Chats</span>
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
        <div style={{ padding: '8px 12px' }}>
          {conversations.map(c => {
            const isSelfChat = c.buyer_id === c.seller_id
            const isBuyer = c.buyer_id === session.user.id
            const otherProfile = isSelfChat ? (isBuyer ? c.buyer : c.seller) : (isBuyer ? c.seller : c.buyer)
            const otherName = isSelfChat ? 'You' : (otherProfile?.full_name || 'PolyNet Student')
            const isPendingForMe = c.status === 'pending' && !isSelfChat && session.user.id === c.seller_id
            return (
              <div key={c.id} onClick={() => openThread(c)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px', cursor: 'pointer', borderRadius: '16px' }}>
                {c.listing?.image_url ? (
                  <img src={c.listing.image_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <InitialsAvatar name={otherName} url={isSelfChat ? null : otherProfile?.avatar_url} size={48} />
                )}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-strong)' }}>{otherName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(c.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: isPendingForMe ? 'var(--app-accent)' : 'var(--text-muted)', fontWeight: isPendingForMe ? 700 : 400, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isPendingForMe ? 'Message request' : (c.listing?.title ? `${c.listing.title} · ` : '') + (c.last_message || 'Start the conversation')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChatThread({ session, conversation, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(conversation.status)
  const [deciding, setDeciding] = useState(false)
  const [viewingProfileId, setViewingProfileId] = useState(null)
  const bottomRef = useRef(null)

  const isSelfChat = conversation.buyerId === conversation.sellerId
  const isRecipient = !isSelfChat && session.user.id === conversation.sellerId
  const isInitiator = !isSelfChat && session.user.id === conversation.buyerId
  const isPendingForMe = status === 'pending' && isRecipient

  useEffect(() => {
    fetchMessages(true)
    const interval = setInterval(() => fetchMessages(false), 4000)
    return () => clearInterval(interval)
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function fetchMessages(showLoading) {
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, created_at')
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
      // Replying to a pending request counts as accepting it
      if (isPendingForMe) {
        await supabase.from('conversations').update({ status: 'accepted' }).eq('id', conversation.id)
        setStatus('accepted')
      }
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversation.id)
      fetchMessages(false)
    } else {
      console.error('Error sending message:', error.message)
      setText(content)
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevronLeft" size={20} />
        </div>
        <InitialsAvatar
          name={conversation.otherName}
          url={conversation.otherAvatar}
          size={36}
          onClick={!isSelfChat ? () => setViewingProfileId(conversation.otherUserId) : undefined}
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)' }}>{conversation.otherName}</div>
          {conversation.listingTitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{conversation.listingTitle}</div>}
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

      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
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
          messages.map(m => {
            const mine = m.sender_id === session.user.id
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
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
            )
          })
        )}
        <div ref={bottomRef} />
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
    </div>
  )
}

function Chats({ session, pendingChat, onClearPending, onBack }) {
  const [openConversation, setOpenConversation] = useState(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!pendingChat) return
    let cancelled = false
    setResolving(true)
    findOrCreateConversation(session, pendingChat).then(result => {
      if (cancelled) return

      if (result?.error) {
        alert('Could not open this chat. Please try again.')
      } else if (result) {
        setOpenConversation(result)
      }

      onClearPending()
      setResolving(false)
    })
    return () => { cancelled = true }
  }, [pendingChat])

  if (resolving) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    )
  }

  if (openConversation) {
    return <ChatThread session={session} conversation={openConversation} onBack={() => setOpenConversation(null)} />
  }

  return <Inbox session={session} onOpenThread={setOpenConversation} onBack={onBack} />
}

export default Chats