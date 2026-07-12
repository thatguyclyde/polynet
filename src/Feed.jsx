import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const TYPE_STYLES = {
  shoutout:    { emoji: '🙌', label: 'Shoutout',    color: '#16A34A', bg: '#F0FDF4' },
  event:       { emoji: '📢', label: 'Event',       color: '#7C3AED', bg: '#F5F3FF' },
  opportunity: { emoji: '💼', label: 'Opportunity', color: '#D97706', bg: '#FFFBEB' },
  general:     { emoji: '💬', label: 'Post',        color: '#475569', bg: '#F8FAFC' },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Compress image to WhatsApp-status-like quality before upload
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

function Feed({ session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('general')
  const [posting, setPosting] = useState(false)
  const [likedIds, setLikedIds] = useState(new Set())
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Comments
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
      .select('id, content, post_type, created_at, author_id, image_url, profiles(full_name, department)')
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
      const { error: uploadErr } = await supabase.storage
        .from('post-images')
        .upload(fileName, imageFile, { contentType: 'image/jpeg' })

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName)
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

  function toggleLike(id) {
    setLikedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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
    const { error } = await supabase.from('feed_comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: newComment,
    })
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%', background: '#7C3AED',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes dotPulse {0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{
        padding: '18px 20px 16px',
        background: '#ffffff',
        borderBottom: '1px solid #F1F1F5',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="PolyNet" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#7C3AED', letterSpacing: '-0.3px' }}>
              PolyNet
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
              Harare Poly
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowComposer(!showComposer)}
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: '#7C3AED', color: '#fff', border: 'none',
            fontSize: '22px', fontWeight: 300, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}
        >
          {showComposer ? '×' : '+'}
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #F1F1F5' }}>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Share something with campus..."
            rows={3}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              border: '1.5px solid #F1F1F5', background: '#FAFAFA',
              fontSize: '14px', color: '#1A1A2E', resize: 'none',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />

          {imagePreview && (
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <img src={imagePreview} alt="preview" style={{
                width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '12px',
              }} />
              <div
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >×</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(TYPE_STYLES).map(([key, val]) => (
              <div
                key={key}
                onClick={() => setNewType(key)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', border: `1.5px solid ${newType === key ? val.color : '#F1F1F5'}`,
                  background: newType === key ? val.bg : '#fff',
                  color: newType === key ? val.color : '#94A3B8',
                }}
              >
                {val.emoji} {val.label}
              </div>
            ))}

            <label style={{
              marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '10px',
              background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
            }}>
              📷
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </label>
          </div>

          <button
            onClick={handlePost}
            disabled={posting || uploading || (!newContent.trim() && !imageFile)}
            style={{
              width: '100%', marginTop: '12px', padding: '12px',
              borderRadius: '12px', border: 'none',
              background: (newContent.trim() || imageFile) ? '#7C3AED' : '#E2E0FF',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: (newContent.trim() || imageFile) ? 'pointer' : 'default',
            }}
          >
            {uploading ? 'Processing image...' : posting ? 'Posting...' : 'Post to Feed'}
          </button>
        </div>
      )}

      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 30px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📣</div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            Nothing here yet. Be the first to post something!
          </p>
        </div>
      )}

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {posts.map(post => {
          const type = TYPE_STYLES[post.post_type] || TYPE_STYLES.general
          const name = post.profiles?.full_name || 'PolyNet Student'
          const dept = post.profiles?.department || ''
          const isLiked = likedIds.has(post.id)
          const comments = commentsByPost[post.id] || []

          return (
            <div key={post.id} style={{
              background: '#ffffff', borderRadius: '18px', padding: '16px',
              border: '1px solid #F1F1F5', boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: '#F5F3FF', color: '#7C3AED', fontWeight: 700, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1A1A2E' }}>{name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: type.bg, color: type.color,
                    }}>
                      {type.emoji} {type.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '1px' }}>
                    {dept} · {timeAgo(post.created_at)}
                  </div>
                </div>
              </div>

              {post.content && (
                <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                  {post.content}
                </p>
              )}

              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="post"
                  style={{
                    width: '100%', maxHeight: '340px', objectFit: 'cover',
                    borderRadius: '14px', marginBottom: '12px', display: 'block',
                  }}
                />
              )}

              <div style={{ display: 'flex', gap: '18px', paddingTop: '10px', borderTop: '1px solid #F8F8FA' }}>
                <div onClick={() => toggleLike(post.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: 600, color: isLiked ? '#EF4444' : '#94A3B8',
                }}>
                  <span style={{ fontSize: '15px' }}>{isLiked ? '❤️' : '🤍'}</span>
                  {isLiked ? 'Liked' : 'Like'}
                </div>
                <div onClick={() => toggleComments(post.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px',
                  fontWeight: 600, color: openComments === post.id ? '#7C3AED' : '#94A3B8', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: '15px' }}>💬</span>
                  {comments.length > 0 ? `${comments.length} Comment${comments.length > 1 ? 's' : ''}` : 'Comment'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600, color: '#94A3B8', cursor: 'pointer', marginLeft: 'auto' }}>
                  ↗ Share
                </div>
              </div>

              {openComments === post.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F8F8FA' }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '8px', background: '#F5F3FF',
                        color: '#7C3AED', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(c.profiles?.full_name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div style={{ background: '#FAFAFA', borderRadius: '12px', padding: '8px 12px', flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A2E' }}>
                          {c.profiles?.full_name || 'PolyNet Student'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p style={{ fontSize: '12.5px', color: '#B4B4C0', marginBottom: '10px' }}>No comments yet</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id) }}
                      placeholder="Write a comment..."
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '12px',
                        border: '1.5px solid #F1F1F5', background: '#FAFAFA',
                        fontSize: '13px', outline: 'none', color: '#1A1A2E',
                      }}
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={commentLoading || !newComment.trim()}
                      style={{
                        padding: '10px 16px', borderRadius: '12px', border: 'none',
                        background: newComment.trim() ? '#7C3AED' : '#E2E0FF',
                        color: '#fff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer',
                      }}
                    >Send</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ height: '20px' }} />
    </div>
  )
}

export default Feed