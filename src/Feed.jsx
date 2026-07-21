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

function Feed({ session, onViewProfile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [myAvatar, setMyAvatar] = useState(null)

  // Composer panel state
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerStep, setComposerStep] = useState('choose') // 'choose' | 'text' | 'photo'
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('general')
  const [posting, setPosting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showCaptionField, setShowCaptionField] = useState(false)

  const [likedIds, setLikedIds] = useState(new Set())
  const [burstId, setBurstId] = useState(null)
  const [openComments, setOpenComments] = useState(null)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    fetchPosts()
    fetchMyAvatar()
  }, [])

  async function fetchMyAvatar() {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
    if (data) setMyAvatar(data.avatar_url)
  }

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

  function openComposer() {
    setComposerOpen(true)
    setComposerStep('choose')
  }

  function closeComposer() {
    setComposerOpen(false)
    setTimeout(() => {
      setComposerStep('choose')
      setNewContent('')
      setNewType('general')
      setImageFile(null)
      setImagePreview(null)
      setShowCaptionField(false)
    }, 300) // wait for slide-out animation before resetting
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
      closeComposer()
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

  async function deletePost(postId) {
    if (window.confirm('Are you sure you want to delete this post?')) {
      const { error } = await supabase.from('feed_posts').delete().eq('id', postId)
      if (!error) {
        setPosts(prev => prev.filter(p => p.id !== postId))
        setOpenMenuId(null)
      }
    }
  }

  function toggleSave(postId) {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
    setOpenMenuId(null)
  }

  function reportPost(postId) {
    alert('Post reported. Thank you for helping keep our community safe!')
    setOpenMenuId(null)
  }

  function sharePost(postId) {
    if (navigator.share) {
      navigator.share({ title: 'Check out this post!', text: 'A post from PolyNet' })
    } else {
      alert('Post link copied to clipboard!')
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#post-${postId}`)
    }
    setOpenMenuId(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Header — just logo and name */}
      <div style={{ padding: '18px 20px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="PolyNet" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--app-accent)' }}>PolyNet</h1>
            <p style={{ marginTop: '1px', fontSize: '11px', color: 'var(--text-muted)' }}>Harare Poly</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? <FeedSkeleton /> : (
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '90px' }}>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 16px', position: 'relative' }}>
                <Avatar url={post.profiles?.avatar_url} name={name} size={36} onClick={goToAuthor} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span onClick={goToAuthor} style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer' }}>{name}</span>
                    {dept && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dept}</span>
                    )}
                    <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, color: type.color, background: type.bg }}>
                      {type.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(post.created_at)}</div>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      style={{ cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="ellipsis-vertical" size={18} />
                    </div>
                    {openMenuId === post.id && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, zIndex: 100,
                        background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden'
                      }}>
                        {isOwnPost && (
                          <div
                            onClick={() => deletePost(post.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="trash-2" size={14} />
                            Delete
                          </div>
                        )}
                        <div
                          onClick={() => toggleSave(post.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: savedIds.has(post.id) ? 'var(--app-accent)' : 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="download" size={14} />
                          {savedIds.has(post.id) ? 'Saved' : 'Save'}
                        </div>
                        {!isOwnPost && (
                          <div
                            onClick={() => reportPost(post.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="flag" size={14} />
                            Report
                          </div>
                        )}
                        <div
                          onClick={() => sharePost(post.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                        >
                          <Icon name="share-2" size={14} />
                          Share
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {post.content && (
                <div style={{ margin: '6px 16px 10px', color: 'var(--text-body)', lineHeight: 1.6, fontSize: '14px' }}>
                  <span>{post.content}</span>
                </div>
              )}

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
              </div>

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

      {/* Floating Action Button — purple circle, plus icon */}
      <div
        onClick={openComposer}
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '86px',
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'var(--app-accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(124,58,237,0.45)',
          cursor: 'pointer', zIndex: 90,
        }}
      >
        <Icon name="plus" size={26} />
      </div>

      {/* Dark overlay behind slide-in panel */}
      {composerOpen && (
        <div
          onClick={closeComposer}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 150, animation: 'fadeIn 0.25s ease',
          }}
        />
      )}

      {/* Slide-in composer panel — from left */}
      <div
        style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          width: '86%',
          maxWidth: '360px',
          background: 'var(--card-bg)',
          zIndex: 160,
          transform: composerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Panel header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {composerStep !== 'choose' && (
            <div onClick={() => setComposerStep('choose')} style={{ cursor: 'pointer', color: 'var(--text-strong)' }}>
              <Icon name="arrowLeft" size={20} />
            </div>
          )}
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)', flex: 1 }}>
            {composerStep === 'choose' ? 'New Post' : composerStep === 'photo' ? 'Add Photo' : 'Write Something'}
          </h2>
          <div onClick={closeComposer} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Icon name="x" size={20} />
          </div>
        </div>

        {/* Step: choose */}
        {composerStep === 'choose' && (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              onClick={() => setComposerStep('photo')}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: '16px', border: '1.5px solid var(--app-border-soft)',
                cursor: 'pointer', background: 'var(--page-bg)',
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={20} color="var(--app-accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Photo</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Share a picture with campus</div>
              </div>
            </div>

            <div
              onClick={() => setComposerStep('text')}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: '16px', border: '1.5px solid var(--app-border-soft)',
                cursor: 'pointer', background: 'var(--page-bg)',
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="message-circle" size={20} color="var(--app-accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Text</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Write an update or announcement</div>
              </div>
            </div>
          </div>
        )}

        {/* Step: photo */}
        {composerStep === 'photo' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {!imagePreview ? (
              <label style={{
                flex: 1, minHeight: '220px', borderRadius: '16px',
                border: '2px dashed var(--app-border-soft)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '10px', cursor: 'pointer', color: 'var(--text-muted)',
              }}>
                <Icon name="imagePlus" size={32} color="var(--app-accent)" />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{uploading ? 'Processing...' : 'Tap to select a photo'}</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </label>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '16px' }} />
                  <div onClick={() => { setImageFile(null); setImagePreview(null) }} style={{
                    position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px',
                    borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <Icon name="x" size={15} />
                  </div>
                </div>

                {!showCaptionField ? (
                  <div
                    onClick={() => setShowCaptionField(true)}
                    style={{
                      marginTop: '14px', padding: '12px', borderRadius: '12px',
                      border: '1.5px dashed var(--app-border-soft)', textAlign: 'center',
                      color: 'var(--app-accent)', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    + Add Caption
                  </div>
                ) : (
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Write a caption..."
                    rows={2}
                    autoFocus
                    style={{
                      width: '100%', marginTop: '14px', padding: '12px', borderRadius: '12px',
                      border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                      color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box',
                      outline: 'none', fontFamily: 'inherit', fontSize: '13.5px',
                    }}
                  />
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                  {Object.entries(TYPE_STYLES).map(([key, value]) => (
                    <div key={key} onClick={() => setNewType(key)} style={{
                      padding: '6px 10px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 700,
                      cursor: 'pointer', border: newType === key ? `1px solid ${value.color}` : '1px solid var(--app-border-soft)',
                      background: newType === key ? value.bg : 'transparent', color: value.color,
                    }}>
                      {value.label}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handlePost}
                  disabled={posting || uploading}
                  style={{
                    width: '100%', marginTop: 'auto', padding: '14px', borderRadius: '14px',
                    border: 'none', background: 'var(--app-accent)', color: '#fff',
                    fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', marginBottom: '4px',
                  }}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step: text */}
        {composerStep === 'text' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Share something with campus..."
              rows={6}
              autoFocus
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box',
                outline: 'none', fontFamily: 'inherit', fontSize: '14.5px',
              }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
              {Object.entries(TYPE_STYLES).map(([key, value]) => (
                <div key={key} onClick={() => setNewType(key)} style={{
                  padding: '6px 10px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 700,
                  cursor: 'pointer', border: newType === key ? `1px solid ${value.color}` : '1px solid var(--app-border-soft)',
                  background: newType === key ? value.bg : 'transparent', color: value.color,
                }}>
                  {value.label}
                </div>
              ))}
            </div>

            <button
              onClick={handlePost}
              disabled={posting || !newContent.trim()}
              style={{
                width: '100%', marginTop: 'auto', padding: '14px', borderRadius: '14px',
                border: 'none', background: newContent.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)',
                color: '#fff', fontWeight: 700, fontSize: '14.5px',
                cursor: newContent.trim() ? 'pointer' : 'default', marginBottom: '4px',
              }}
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Feed