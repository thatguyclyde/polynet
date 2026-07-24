import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { FeedSkeleton } from './Skeleton'
import PublicProfileCard from './PublicProfileCard'

const CATEGORY_STYLES = {
  school: { label: 'School Related', color: 'var(--success)', bg: 'rgba(22,163,74,0.12)' },
  other: { label: 'Other', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
}

const FILTERS = [
  { id: 'all', label: 'All', color: 'var(--app-accent)', bg: 'var(--app-accent-soft)' },
  { id: 'school', label: 'School Related', color: 'var(--success)', bg: 'rgba(22,163,74,0.12)' },
  { id: 'other', label: 'Other', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
]

const LIKE_RED = '#ED4956'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function middleTruncate(str, maxChars = 24) {
  if (!str || str.length <= maxChars) return str
  const keepStart = Math.ceil((maxChars - 1) * 0.62)
  const keepEnd = Math.floor((maxChars - 1) * 0.38)
  return `${str.slice(0, keepStart)}…${str.slice(str.length - keepEnd)}`
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

function LikeButton({ isLiked, count, pulseKey, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <motion.div
        key={pulseKey}
        initial={{ scale: 1 }}
        animate={{ scale: isLiked ? [1, 1.35, 0.9, 1.08, 1] : 1 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        whileTap={{ scale: 0.8 }}
        style={{ display: 'flex' }}
      >
        <Icon
          name="heart"
          size={22}
          color={isLiked ? LIKE_RED : 'var(--text-muted)'}
          fill={isLiked ? LIKE_RED : 'none'}
        />
      </motion.div>
      <span style={{ fontWeight: 700, fontSize: '13px', color: isLiked ? LIKE_RED : 'var(--text-muted)' }}>
        {count > 0 ? count : 'Like'}
      </span>
    </div>
  )
}

function CommentButton({ isOpen, count, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <Icon name="comment" size={22} color={isOpen ? 'var(--app-accent)' : 'var(--text-muted)'} />
      <span style={{ fontWeight: 700, fontSize: '13px', color: isOpen ? 'var(--app-accent)' : 'var(--text-muted)' }}>
        {count > 0 ? count : 'Comment'}
      </span>
    </div>
  )
}

function Feed({ session, onStartChat }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [myAvatar, setMyAvatar] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerStep, setComposerStep] = useState('choose')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('school')
  const [posting, setPosting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showCaptionField, setShowCaptionField] = useState(false)

  const [likedIds, setLikedIds] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({})
  const [commentCounts, setCommentCounts] = useState({})
  const [likePulse, setLikePulse] = useState({})

  const [burstId, setBurstId] = useState(null)
  const [openComments, setOpenComments] = useState(null)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  const [viewingPost, setViewingPost] = useState(null)
  const tapTimer = useRef(null)

  const [viewingProfileId, setViewingProfileId] = useState(null)

  useEffect(() => {
    fetchPosts()
    fetchMyAvatar()
    fetchMyLikes()
  }, [])

  async function fetchMyAvatar() {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
    if (data) setMyAvatar(data.avatar_url)
  }

  async function fetchMyLikes() {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', session.user.id)
    if (data) setLikedIds(new Set(data.map(r => r.post_id)))
  }

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        id, content, post_type, created_at, author_id, image_url,
        profiles(full_name, department, avatar_url),
        likes:post_likes(count),
        comments:feed_comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) console.error('Error fetching posts:', error.message)

    if (data) {
      setPosts(data)
      const nextLikeCounts = {}
      const nextCommentCounts = {}
      data.forEach(p => {
        nextLikeCounts[p.id] = p.likes?.[0]?.count ?? 0
        nextCommentCounts[p.id] = p.comments?.[0]?.count ?? 0
      })
      setLikeCounts(nextLikeCounts)
      setCommentCounts(nextCommentCounts)
    }
    setLoading(false)
  }

  function openComposer() {
    setComposerOpen(true)
    setComposerStep('choose')
  }

  function closeComposer() {
    setComposerOpen(false)
  }

  function resetComposerFields() {
    setComposerStep('choose')
    setNewContent('')
    setNewCategory('school')
    setImageFile(null)
    setImagePreview(null)
    setShowCaptionField(false)
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
      post_type: newCategory,
      image_url: imageUrl,
    })

    if (!error) {
      closeComposer()
      fetchPosts()
    }
    setPosting(false)
  }

  async function toggleLike(postId) {
    const alreadyLiked = likedIds.has(postId)

    setLikedIds(prev => {
      const next = new Set(prev)
      alreadyLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setLikeCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (alreadyLiked ? -1 : 1)),
    }))
    if (!alreadyLiked) {
      setLikePulse(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
    }

    if (alreadyLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
      if (error) {
        console.error('Unlike failed:', error.message)
        setLikedIds(prev => new Set(prev).add(postId))
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
      }
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: session.user.id })
      if (error) {
        console.error('Like failed:', error.message)
        setLikedIds(prev => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })
        setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }))
      }
    }
  }

  function handleDoubleTap(postId) {
    if (!likedIds.has(postId)) toggleLike(postId)
    setBurstId(postId)
    setTimeout(() => setBurstId(current => (current === postId ? null : current)), 700)
  }

  function handleImageTap(post) {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      handleDoubleTap(post.id)
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        setViewingPost(post)
      }, 240)
    }
  }

  function closeImageViewer() {
    setViewingPost(null)
    setOpenMenuId(null)
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
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
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
        if (viewingPost?.id === postId) setViewingPost(null)
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

  function goToAuthor(authorId) {
    setViewingProfileId(authorId)
  }

  function handleMessageUser({ id, name, avatar }) {
    onStartChat?.({
      listingId: null,
      listingTitle: null,
      sellerId: id,
      sellerName: name,
      sellerAvatar: avatar,
    })
  }

  const filteredPosts = activeFilter === 'all' ? posts : posts.filter(p => p.post_type === activeFilter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Header — "PolyNet" wordmark, left-aligned, bright purple gradient,
          frosted-blur backing instead of a hard border line. */}
      <div style={{
        padding: '18px 20px 14px',
        background: 'color-mix(in srgb, var(--card-bg) 72%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{
            margin: 0,
            fontFamily: "'Baloo 2', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.4px',
            background: 'linear-gradient(120deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'inline-block',
          }}>
            PolyNet
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Harare Poly
          </p>
        </div>

        {/* Filter row — All / School Related / Other */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f.id
            return (
              <div
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: '7px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  border: isActive ? `1.5px solid ${f.color}` : '1.5px solid var(--app-border-soft)',
                  background: isActive ? f.bg : 'transparent',
                  color: isActive ? f.color : 'var(--text-muted)',
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
              >
                {f.label}
              </div>
            )
          })}
        </div>
      </div>

      {loading ? <FeedSkeleton /> : (
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '90px' }}>
        {filteredPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '70px 30px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No posts here yet</p>
          </div>
        )}
        {filteredPosts.map(post => {
          const name = post.profiles?.full_name || 'PolyNet Student'
          const dept = post.profiles?.department || ''
          const isSchoolRelated = post.post_type === 'school'
          const isLiked = likedIds.has(post.id)
          const comments = commentsByPost[post.id] || []
          const isOwnPost = post.author_id === session.user.id
          const isViewingThis = viewingPost?.id === post.id

          return (
            <motion.div key={post.id} layout="position" style={{ borderBottom: '8px solid var(--app-border)' }}>
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '12px 16px 10px', position: 'relative',
                borderBottom: '1px solid var(--app-border-soft)',
              }}>
                <Avatar url={post.profiles?.avatar_url} name={name} size={36} onClick={() => goToAuthor(post.author_id)} />

                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'nowrap' }}>
                  <span
                    onClick={() => goToAuthor(post.author_id)}
                    title={name}
                    style={{
                      fontWeight: 700, fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      flexShrink: 1, minWidth: '68px', maxWidth: '62%',
                    }}
                  >
                    {name}
                  </span>
                  {dept && (
                    <span
                      title={dept}
                      style={{
                        fontSize: '10px', color: 'var(--text-muted)',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        flexShrink: 1, minWidth: 0,
                      }}
                    >
                      {middleTruncate(dept, 24)}
                    </span>
                  )}
                  {isSchoolRelated && (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }} title="School related">
                      <Icon name="book" size={14} color="var(--success)" />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(post.created_at)}</div>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      style={{ cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="ellipsis-vertical" size={18} />
                    </div>
                    {openMenuId === post.id && !isViewingThis && (
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
                <div style={{ margin: '8px 16px 10px', color: 'var(--text-body)', lineHeight: 1.6, fontSize: '14px' }}>
                  <span>{post.content}</span>
                </div>
              )}

              {post.image_url && (
                <div style={{ position: 'relative' }}>
                  <motion.img
                    layoutId={`post-image-${post.id}`}
                    onClick={() => handleImageTap(post)}
                    src={post.image_url}
                    alt="post"
                    style={{
                      width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block',
                      cursor: 'pointer',
                      opacity: isViewingThis ? 0 : 1,
                    }}
                  />
                  {burstId === post.id && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))', animation: 'heartPop 0.6s ease' }}>
                        <Icon name="heart" size={72} strokeWidth={0} color={LIKE_RED} fill={LIKE_RED} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', padding: post.image_url ? '10px 16px 0' : '2px 16px 0' }}>
                <LikeButton
                  isLiked={isLiked}
                  count={likeCounts[post.id] || 0}
                  pulseKey={likePulse[post.id] || 0}
                  onClick={() => toggleLike(post.id)}
                />
                <CommentButton
                  isOpen={openComments === post.id}
                  count={commentCounts[post.id] || 0}
                  onClick={() => toggleComments(post.id)}
                />
              </div>

              <AnimatePresence initial={false}>
                {openComments === post.id && (
                  <motion.div
                    key="comments"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.7 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '10px 16px 14px' }}>
                      {comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <Avatar name={c.profiles?.full_name || 'S'} size={26} onClick={() => goToAuthor(c.author_id)} />
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
      )}

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

      <AnimatePresence onExitComplete={resetComposerFields}>
        {composerOpen && (
          <>
            <motion.div
              key="composer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              onClick={closeComposer}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 150 }}
            />

            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 160,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                key="composer-panel"
                initial={{ x: '-55%', opacity: 0, scale: 0.94 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: '-55%', opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 230, damping: 26, mass: 0.9 }}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  maxHeight: '76vh',
                  background: 'var(--card-bg)',
                  borderRadius: '26px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
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

                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                          <Icon name="comment" size={20} color="var(--app-accent)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Text</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Write an update or announcement</div>
                        </div>
                      </div>
                    </div>
                  )}

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

                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                            {Object.entries(CATEGORY_STYLES).map(([key, value]) => (
                              <div key={key} onClick={() => setNewCategory(key)} style={{
                                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '14px', fontSize: '12.5px', fontWeight: 700,
                                cursor: 'pointer', border: newCategory === key ? `1.5px solid ${value.color}` : '1.5px solid var(--app-border-soft)',
                                background: newCategory === key ? value.bg : 'transparent', color: newCategory === key ? value.color : 'var(--text-muted)',
                              }}>
                                {value.label}
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handlePost}
                            disabled={posting || uploading}
                            style={{
                              width: '100%', marginTop: '18px', padding: '14px', borderRadius: '14px',
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

                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        {Object.entries(CATEGORY_STYLES).map(([key, value]) => (
                          <div key={key} onClick={() => setNewCategory(key)} style={{
                            flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: '14px', fontSize: '12.5px', fontWeight: 700,
                            cursor: 'pointer', border: newCategory === key ? `1.5px solid ${value.color}` : '1.5px solid var(--app-border-soft)',
                            background: newCategory === key ? value.bg : 'transparent', color: newCategory === key ? value.color : 'var(--text-muted)',
                          }}>
                            {value.label}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handlePost}
                        disabled={posting || !newContent.trim()}
                        style={{
                          width: '100%', marginTop: '18px', padding: '14px', borderRadius: '14px',
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
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPost && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(10,10,14,0.97)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={closeImageViewer}
          >
            <motion.img
              layoutId={`post-image-${viewingPost.id}`}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              src={viewingPost.image_url}
              alt="post"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={() => handleDoubleTap(viewingPost.id)}
              style={{
                width: '100%', maxHeight: '100vh', objectFit: 'contain',
              }}
            />

            {burstId === viewingPost.id && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))', animation: 'heartPop 0.6s ease' }}>
                  <Icon name="heart" size={90} strokeWidth={0} color={LIKE_RED} fill={LIKE_RED} />
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 16px 40px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
              }}
            >
              <div
                onClick={closeImageViewer}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                <Icon name="arrowLeft" size={19} color="#fff" />
              </div>

              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setOpenMenuId(openMenuId === viewingPost.id ? null : viewingPost.id)}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer',
                  }}
                >
                  <Icon name="ellipsis-vertical" size={19} color="#fff" />
                </div>

                <AnimatePresence>
                  {openMenuId === viewingPost.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 310,
                        background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                        boxShadow: '0 8px 28px rgba(0,0,0,0.35)', minWidth: '160px', overflow: 'hidden',
                        transformOrigin: 'top right',
                      }}
                    >
                      {viewingPost.author_id === session.user.id && (
                        <div
                          onClick={() => deletePost(viewingPost.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="trash-2" size={14} />
                          Delete
                        </div>
                      )}
                      <div
                        onClick={() => toggleSave(viewingPost.id)}
                        style={{ padding: '12px 16px', fontSize: '13px', color: savedIds.has(viewingPost.id) ? 'var(--app-accent)' : 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                      >
                        <Icon name="download" size={14} />
                        {savedIds.has(viewingPost.id) ? 'Saved' : 'Save'}
                      </div>
                      {viewingPost.author_id !== session.user.id && (
                        <div
                          onClick={() => reportPost(viewingPost.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="flag" size={14} />
                          Report
                        </div>
                      )}
                      <div
                        onClick={() => sharePost(viewingPost.id)}
                        style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                      >
                        <Icon name="share-2" size={14} />
                        Share
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewingProfileId && (
        <PublicProfileCard
          userId={viewingProfileId}
          session={session}
          onClose={() => setViewingProfileId(null)}
          onMessage={handleMessageUser}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Feed