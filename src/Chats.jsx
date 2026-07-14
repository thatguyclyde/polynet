import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function InitialsAvatar({ name, size = 44 }) {
  const initials = (name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--app-accent-soft)', color: 'var(--app-accent)', fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36,
    }}>
      {initials}
    </div>
  )
}

async function findOrCreateConversation(session, pendingChat) {
  const { listingId, sellerId, listingTitle, sellerName } = pendingChat

  if (sellerId === session.user.id) {
    return null
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id, last_message_at')
    .eq('listing_id', listingId)
    .eq('buyer_id', session.user.id)
    .maybeSingle()

  let conversation = existing
  if (!conversation) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, buyer_id: session.user.id, seller_id: sellerId })
      .select('id, listing_id, buyer_id, seller_id, last_message_at')
      .single()
    conversation = created
  }
  if (!conversation) return null

  return {
    id: conversation.id,
    listingTitle,
    otherName: sellerName || 'PolyNet Student',
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
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, listing_id, buyer_id, seller_id, last_message, last_message_at, created_at,
        listing:marketplace_listings(id, title, image_url),
        buyer:profiles!conversations_buyer_id_fkey(full_name),
        seller:profiles!conversations_seller_id_fkey(full_name)
      `)
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  function openThread(c) {
    const isBuyer = c.buyer_id === session.user.id
    onOpenThread({
      id: c.id,
      listingTitle: c.listing?.title || 'Listing',
      otherName: (isBuyer ? c.seller?.full_name : c.buyer?.full_name) || 'PolyNet Student',
      listingImage: c.listing?.image_url || null,
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevron-left" size={20} />
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
            const isBuyer = c.buyer_id === session.user.id
            const otherName = (isBuyer ? c.seller?.full_name : c.buyer?.full_name) || 'PolyNet Student'
            return (
              <div key={c.id} onClick={() => openThread(c)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px', cursor: 'pointer', borderRadius: '16px' }}>
                {c.listing?.image_url ? (
                  <img src={c.listing.image_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <InitialsAvatar name={otherName} size={48} />
                )}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-strong)' }}>{otherName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(c.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.listing?.title ? `${c.listing.title} · ` : ''}{c.last_message || 'Start the conversation'}
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
  const bottomRef = useRef(null)

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
    const { data } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    if (showLoading) setLoading(false)
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
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversation.id)
      fetchMessages(false)
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)', display: 'flex' }}>
          <Icon name="chevron-left" size={20} />
        </div>
        <InitialsAvatar name={conversation.otherName} size={36} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)' }}>{conversation.otherName}</div>
          {conversation.listingTitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{conversation.listingTitle}</div>}
        </div>
      </div>

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
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
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
    findOrCreateConversation(session, pendingChat).then(convo => {
      if (cancelled) return
      if (convo) setOpenConversation(convo)
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
