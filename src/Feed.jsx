import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'
import { FeedSkeleton } from './Skeleton'

const TYPE_STYLES = {
  shoutout: { label: 'Shoutout', color: 'var(--success)', bg: 'var(--app-accent-soft)', icon: 'sparkles' },
  event: { label: 'Event', color: 'var(--app-accent)', bg: 'var(--app-accent-soft)', icon: 'newspaper' },
  opportunity: { label: 'Opportunity', color: '#d97706', bg: 'var(--app-accent-soft)', icon: 'store' },
  general: { label: 'Post', color: 'var(--text-muted)', bg: 'var(--app-accent-soft)', icon: 'message-circle' },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function compressImage(file, maxWidth = 1080, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function Avatar({ url, name, size = 40, onClick }) {
  const initials = (name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}>
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'var(--app-accent)', fontWeight: 700, fontSize: size * 0.36 }}>{initials}</span>
      )}
    </div>
  )
}

function Feed({ session, onOpenChats, onViewProfile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('general')
  const [posting, setPosting] = useState(false)
  const [likedIds, setLikedIds] = useState(new Set())
  const [burstId, setBurstId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [openComments, setOpenComments] = useState(null)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('feed_posts')
      .select('id, content, post_type, created_at, author_id, image_url, profiles(full_name, department, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPosts(data)
    setLoading(false)
  }

  async function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file)
    setImageFile(compressed)
    setImagePreview(URL.createObjectURL(compressed))
    setUploading(false)
  }

  async function handlePost() {
    if (!newContent.trim() && !imageFile) return
    setPosting(true)

    let imageUrl = null
    if (imageFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(fileName, imageFile, { contentType: 'image/jpeg' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('feed_posts').insert({
      author_id: session.user.id,
      content: newContent,
      post_type: newType,
      image_url: imageUrl,
    })

    if (!error) {
      setNewContent('')
      setNewType('general')
      setImageFile(null)
      setImagePreview(null)
      setShowComposer(false)
      fetchPosts()
    }
    setPosting(false)
  }

  function likePost(id) {
    setLikedIds(prev => new Set(prev).add(id))
  }

  function toggleLike(id) {
    setLikedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDoubleTap(id) {
    likePost(id)
    setBurstId(id)
    setTimeout(() => setBurstId(current => (current === id ? null : current)), 700)
  }

  async function toggleComments(postId) {
    if (openComments === postId) {
      setOpenComments(null)
      return
    }
    setOpenComments(postId)
    if (!commentsByPost[postId]) {
      const { data } = await supabase
        .from('feed_comments')
        .select('id, content, created_at, author_id, profiles(full_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setCommentsByPost(prev => ({ ...prev, [postId]: data || [] }))
    }
  }

  async function submitComment(postId) {
    if (!newComment.trim()) return
    setCommentLoading(true)
    const { error } = await supabase.from('feed_comments').insert({ post_id: postId, author_id: session.user.id, content: newComment })
    if (!error) {
      const { data } = await supabase
        .from('feed_comments')
        .select('id, content, created_at, author_id, profiles(full_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setCommentsByPost(prev => ({ ...prev, [postId]: data || [] }))
      setNewComment('')
    }
    setCommentLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="PolyNet" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--app-accent)' }}>PolyNet</h1>
              <p style={{ marginTop: '1px', fontSize: '11px', color: 'var(--text-muted)' }}>Harare Poly</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={onOpenChats} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'transparent', color: 'var(--text-strong)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="inbox" size={20} />
            </button>
            <button onClick={() => setShowComposer(v => !v)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--app-accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name={showComposer ? 'x' : 'plus'} size={18} />
            </button>
          </div>
        </div>
      </div>

      {showComposer && (
        <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)' }}>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Share something with campus..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)', color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
          {imagePreview && (
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '14px' }} />
              <div onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="x" size={14} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
            {Object.entries(TYPE_STYLES).map(([key, value]) => (
              <div key={key} onClick={() => setNewType(key)} style={{ padding: '7px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: newType === key ? `1px solid ${value.color}` : '1px solid var(--app-border-soft)', background: newType === key ? value.bg : 'var(--card-bg)', color: value.color }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name={value.icon} size={12} />
                  {value.label}
                </span>
              </div>
            ))}
            <label style={{ marginLeft: 'auto', width: '34px', height: '34px', borderRadius: '10px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--app-accent)' }}>
              <Icon name="camera" size={16} />
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </label>
          </div>
          <button onClick={handlePost} disabled={posting || uploading || (!newContent.trim() && !imageFile)} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '14px', border: 'none', background: (newContent.trim() || imageFile) ? 'var(--app-accent)' : 'var(--app-border-soft)', color: '#fff', fontWeight: 700, cursor: (newContent.trim() || imageFile) ? 'pointer' : 'default' }}>
            {uploading ? 'Processing...' : posting ? 'Posting...' : 'Post to Feed'}
          </button>
        </div>
      )}

      {loading ? <FeedSkeleton /> : (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {posts.map(post => {
          const type = TYPE_STYLES[post.post_type] || TYPE_STYLES.general
          const name = post.profiles?.full_name || 'PolyNet Student'
          const dept = post.profiles?.department || ''
          const isLiked = likedIds.has(post.id)
          const comments = commentsByPost[post.id] || []
          const isOwnPost = post.author_id === session.user.id
          const goToAuthor = () => onViewProfile?.(post.author_id, isOwnPost)

          return (
            <div key={post.id} style={{ borderBottom: '8px solid var(--app-border)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px' }}>
                <Avatar url={post.profiles?.avatar_url} name={name} size={36} onClick={goToAuthor} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span onClick={goToAuthor} style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer' }}>{name}</span>
                    <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, color: type.color, background: type.bg }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name={type.icon} size={10} />
                        {type.label}
                      </span>
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{dept} · {timeAgo(post.created_at)}</div>
                </div>
              </div>

              {post.image_url && (
                <div onDoubleClick={() => handleDoubleTap(post.id)} style={{ position: 'relative' }}>
                  <img src={post.image_url} alt="post" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} />
                  {burstId === post.id && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ color: '#fff', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))', animation: 'heartPop 0.6s ease' }}>
                        <Icon name="heart" size={72} strokeWidth={0} color="#fff" style={{ fill: '#fff' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '18px', padding: post.image_url ? '10px 16px 0' : '0 16px' }}>
                <div onClick={() => toggleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: isLiked ? 'var(--danger)' : 'var(--text-muted)' }}>
                  <Icon name="heart" size={18} color={isLiked ? 'var(--danger)' : 'currentColor'} style={isLiked ? { fill: 'var(--danger)', animation: 'heartPop 0.35s ease' } : {}} />
                  {isLiked ? 'Liked' : 'Like'}
                </div>
                <div onClick={() => toggleComments(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: openComments === post.id ? 'var(--app-accent)' : 'var(--text-muted)' }}>
                  <Icon name="message-circle" size={17} />
                  {comments.length > 0 ? `${comments.length} Comment${comments.length > 1 ? 's' : ''}` : 'Comment'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  <Icon name="share" size={17} />
                  Share
                </div>
              </div>

              {post.content && (
                <p style={{ margin: '10px 16px 12px', color: 'var(--text-body)', lineHeight: 1.6, fontSize: '14px' }}>
                  <span onClick={goToAuthor} style={{ fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer' }}>{name}</span>{' '}{post.content}
                </p>
              )}

              {openComments === post.id && (
                <div style={{ padding: '0 16px 14px' }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <Avatar name={c.profiles?.full_name || 'S'} size={26} />
                      <div style={{ background: 'var(--input-bg)', borderRadius: '12px', padding: '8px 10px', flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-strong)' }}>{c.profiles?.full_name || 'PolyNet Student'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '2px' }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>No comments yet</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id) }} placeholder="Write a comment..." style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)', color: 'var(--text-strong)', outline: 'none', fontSize: '13px' }} />
                    <button onClick={() => submitComment(post.id)} disabled={commentLoading || !newComment.trim()} style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', background: newComment.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      <Icon name="send" size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

export default Feed
