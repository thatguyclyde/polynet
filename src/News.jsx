import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { NewsSkeleton } from './Skeleton'
import { useTheme } from './ThemeContext'

const LIKE_ACCENT = 'var(--app-accent)'
const DISLIKE_COLOR = '#EF4444'
const VERIFIED_BLUE = '#1D9BF0'
const POST_EDGE_PURPLE = '#7C3AED'

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

function VerifiedBadge({ size = 15 }) {
  return (
    <span
      title="Verified"
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

function LikeButton({ isLiked, count, pulseKey, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <motion.div
        key={pulseKey}
        initial={{ scale: 1 }}
        animate={{ scale: isLiked ? [1, 1.3, 0.9, 1.08, 1] : 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        whileTap={{ scale: 0.8 }}
        style={{ display: 'flex' }}
      >
        <Icon
          name="thumbsUp"
          size={19}
          color={isLiked ? LIKE_ACCENT : 'var(--text-muted)'}
          fill={isLiked ? LIKE_ACCENT : 'none'}
        />
      </motion.div>
      <span style={{ fontWeight: 700, fontSize: '13px', color: isLiked ? LIKE_ACCENT : 'var(--text-muted)' }}>
        {count > 0 ? count : 'Like'}
      </span>
    </div>
  )
}

function DislikeButton({ isDisliked, count, pulseKey, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <motion.div
        key={pulseKey}
        initial={{ scale: 1 }}
        animate={{ scale: isDisliked ? [1, 1.3, 0.9, 1.08, 1] : 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        whileTap={{ scale: 0.8 }}
        style={{ display: 'flex' }}
      >
        <Icon
          name="thumbsDown"
          size={19}
          color={isDisliked ? DISLIKE_COLOR : 'var(--text-muted)'}
          fill={isDisliked ? DISLIKE_COLOR : 'none'}
        />
      </motion.div>
      <span style={{ fontWeight: 700, fontSize: '13px', color: isDisliked ? DISLIKE_COLOR : 'var(--text-muted)' }}>
        {count > 0 ? count : ''}
      </span>
    </div>
  )
}

function News({ session, isAdmin }) {
  const { isDark } = useTheme()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerStep, setComposerStep] = useState('choose')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [likedIds, setLikedIds] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({})
  const [likePulse, setLikePulse] = useState({})

  const [dislikedIds, setDislikedIds] = useState(new Set())
  const [dislikeCounts, setDislikeCounts] = useState({})
  const [dislikePulse, setDislikePulse] = useState({})

  const [openMenuId, setOpenMenuId] = useState(null)
  const [viewingArticle, setViewingArticle] = useState(null)
  const tapTimer = useRef(null)

  // The read timestamp from BEFORE this visit — anything newer than this
  // gets the purple "new" edge. Stays null until initReadState resolves,
  // so nothing is marked new prematurely on first render.
  const [unreadThreshold, setUnreadThreshold] = useState(undefined) // undefined = not yet loaded

  useEffect(() => {
    initReadState()
    fetchArticles()
    fetchMyLikes()
    fetchMyDislikes()
  }, [])

  // Captures the previous last_read_at (used as the "new post" cutoff for
  // this visit), then updates it to now — so next visit, nothing from this
  // session is considered new anymore.
  async function initReadState() {
    const { data, error } = await supabase
      .from('news_reads')
      .select('last_read_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (error) console.error('Error reading news read-state:', error.message)

    setUnreadThreshold(data?.last_read_at || null)

    const { error: upsertErr } = await supabase
      .from('news_reads')
      .upsert({ user_id: session.user.id, last_read_at: new Date().toISOString() })
    if (upsertErr) console.error('Error updating news read-state:', upsertErr.message)
  }

  async function fetchMyLikes() {
    const { data } = await supabase
      .from('news_likes')
      .select('article_id')
      .eq('user_id', session.user.id)
    if (data) setLikedIds(new Set(data.map(r => r.article_id)))
  }

  async function fetchMyDislikes() {
    const { data } = await supabase
      .from('news_dislikes')
      .select('article_id')
      .eq('user_id', session.user.id)
    if (data) setDislikedIds(new Set(data.map(r => r.article_id)))
  }

  async function fetchArticles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('news_articles')
      .select(`
        id, title, body, image_url, created_at, author_id,
        profiles(full_name),
        likes:news_likes(count),
        dislikes:news_dislikes(count)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) console.error('Error fetching articles:', error.message)

    if (data) {
      setArticles(data)
      const nextLikeCounts = {}
      const nextDislikeCounts = {}
      data.forEach(a => {
        nextLikeCounts[a.id] = a.likes?.[0]?.count ?? 0
        nextDislikeCounts[a.id] = a.dislikes?.[0]?.count ?? 0
      })
      setLikeCounts(nextLikeCounts)
      setDislikeCounts(nextDislikeCounts)
    }
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
    if (composerStep === 'announcement' && !body.trim()) return
    if (composerStep === 'image' && !imageFile) return
    setPosting(true)

    let imageUrl = null
    if (imageFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage.from('news-images').upload(fileName, imageFile, { contentType: 'image/jpeg' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('news_articles').insert({
      author_id: session.user.id,
      title: '',
      body,
      image_url: imageUrl,
    })

    if (!error) {
      closeComposer()
      fetchArticles()
    }
    setPosting(false)
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
    setBody('')
    setImageFile(null)
    setImagePreview(null)
  }

  async function toggleLike(articleId) {
    const alreadyLiked = likedIds.has(articleId)
    const alreadyDisliked = dislikedIds.has(articleId)

    setLikedIds(prev => {
      const next = new Set(prev)
      alreadyLiked ? next.delete(articleId) : next.add(articleId)
      return next
    })
    setLikeCounts(prev => ({
      ...prev,
      [articleId]: Math.max(0, (prev[articleId] || 0) + (alreadyLiked ? -1 : 1)),
    }))
    if (!alreadyLiked) {
      setLikePulse(prev => ({ ...prev, [articleId]: (prev[articleId] || 0) + 1 }))
    }

    // Liking clears an existing dislike (mutual exclusivity)
    if (!alreadyLiked && alreadyDisliked) {
      setDislikedIds(prev => {
        const next = new Set(prev)
        next.delete(articleId)
        return next
      })
      setDislikeCounts(prev => ({ ...prev, [articleId]: Math.max(0, (prev[articleId] || 0) - 1) }))
      const { error } = await supabase.from('news_dislikes').delete().eq('article_id', articleId).eq('user_id', session.user.id)
      if (error) console.error('Error clearing dislike:', error.message)
    }

    if (alreadyLiked) {
      const { error } = await supabase
        .from('news_likes')
        .delete()
        .eq('article_id', articleId)
        .eq('user_id', session.user.id)
      if (error) {
        console.error('Unlike failed:', error.message)
        setLikedIds(prev => new Set(prev).add(articleId))
        setLikeCounts(prev => ({ ...prev, [articleId]: (prev[articleId] || 0) + 1 }))
      }
    } else {
      const { error } = await supabase
        .from('news_likes')
        .insert({ article_id: articleId, user_id: session.user.id })
      if (error) {
        console.error('Like failed:', error.message)
        setLikedIds(prev => {
          const next = new Set(prev)
          next.delete(articleId)
          return next
        })
        setLikeCounts(prev => ({ ...prev, [articleId]: Math.max(0, (prev[articleId] || 0) - 1) }))
      }
    }
  }

  async function toggleDislike(articleId) {
    const alreadyDisliked = dislikedIds.has(articleId)
    const alreadyLiked = likedIds.has(articleId)

    setDislikedIds(prev => {
      const next = new Set(prev)
      alreadyDisliked ? next.delete(articleId) : next.add(articleId)
      return next
    })
    setDislikeCounts(prev => ({
      ...prev,
      [articleId]: Math.max(0, (prev[articleId] || 0) + (alreadyDisliked ? -1 : 1)),
    }))
    if (!alreadyDisliked) {
      setDislikePulse(prev => ({ ...prev, [articleId]: (prev[articleId] || 0) + 1 }))
    }

    // Disliking clears an existing like (mutual exclusivity)
    if (!alreadyDisliked && alreadyLiked) {
      setLikedIds(prev => {
        const next = new Set(prev)
        next.delete(articleId)
        return next
      })
      setLikeCounts(prev => ({ ...prev, [articleId]: Math.max(0, (prev[articleId] || 0) - 1) }))
      const { error } = await supabase.from('news_likes').delete().eq('article_id', articleId).eq('user_id', session.user.id)
      if (error) console.error('Error clearing like:', error.message)
    }

    if (alreadyDisliked) {
      const { error } = await supabase
        .from('news_dislikes')
        .delete()
        .eq('article_id', articleId)
        .eq('user_id', session.user.id)
      if (error) {
        console.error('Un-dislike failed:', error.message)
        setDislikedIds(prev => new Set(prev).add(articleId))
        setDislikeCounts(prev => ({ ...prev, [articleId]: (prev[articleId] || 0) + 1 }))
      }
    } else {
      const { error } = await supabase
        .from('news_dislikes')
        .insert({ article_id: articleId, user_id: session.user.id })
      if (error) {
        console.error('Dislike failed:', error.message)
        setDislikedIds(prev => {
          const next = new Set(prev)
          next.delete(articleId)
          return next
        })
        setDislikeCounts(prev => ({ ...prev, [articleId]: Math.max(0, (prev[articleId] || 0) - 1) }))
      }
    }
  }

  function handleImageTap(article) {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        setViewingArticle(article)
      }, 240)
    }
  }

  function closeImageViewer() {
    setViewingArticle(null)
    setOpenMenuId(null)
  }

  async function deleteArticle(articleId) {
    if (window.confirm('Are you sure you want to delete this article?')) {
      const { error } = await supabase.from('news_articles').delete().eq('id', articleId)
      if (!error) {
        setArticles(prev => prev.filter(a => a.id !== articleId))
        setOpenMenuId(null)
        if (viewingArticle?.id === articleId) setViewingArticle(null)
      }
    }
  }

  function reportArticle(articleId) {
    alert('Article reported. Thank you for helping keep our community safe!')
    setOpenMenuId(null)
  }

  function shareArticle(article) {
    if (navigator.share) {
      navigator.share({ title: 'PolyNet News', text: 'Check out this update on PolyNet' })
    } else {
      alert('Article link copied to clipboard!')
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#article-${article.id}`)
    }
    setOpenMenuId(null)
  }

  const headerBg = isDark ? '#000000' : '#FFFFFF'
  const headerSubtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{
        padding: '18px 20px 16px',
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
            background: 'linear-gradient(120deg, #7C3AED 0%, #A855F7 45%, #C084FC 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'inline-block',
          }}>
            News
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: headerSubtitleColor, fontWeight: 600, textAlign: 'left' }}>
            Campus updates
          </p>
        </div>
      </div>

      {isAdmin && (
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
      )}

      <AnimatePresence onExitComplete={resetComposerFields}>
        {composerOpen && (
          <>
            <motion.div
              key="news-composer-backdrop"
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
                key="news-composer-panel"
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
                    {composerStep === 'choose' ? 'New Post' : composerStep === 'announcement' ? 'Announcement' : 'Add Image'}
                  </h2>
                  <div onClick={closeComposer} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Icon name="x" size={20} />
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {composerStep === 'choose' && (
                    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        onClick={() => setComposerStep('announcement')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                          borderRadius: '16px', border: '1.5px solid var(--app-border-soft)',
                          cursor: 'pointer', background: 'var(--page-bg)',
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="megaphone" size={20} color="var(--app-accent)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Announcement</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>A bold, text-only post</div>
                        </div>
                      </div>

                      <div
                        onClick={() => setComposerStep('image')}
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
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Image</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Post a picture with a caption</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {composerStep === 'announcement' && (
                    <div style={{ padding: '20px' }}>
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write your announcement..."
                        rows={8}
                        autoFocus
                        style={{
                          width: '100%', padding: '14px', borderRadius: '14px',
                          border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                          color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box',
                          outline: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      />

                      <button
                        onClick={handlePost}
                        disabled={posting || !body.trim()}
                        style={{
                          width: '100%', marginTop: '16px', padding: '13px', borderRadius: '14px',
                          border: 'none', background: body.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)',
                          color: '#fff', fontWeight: 700, fontSize: '14.5px',
                          cursor: body.trim() ? 'pointer' : 'default', marginBottom: '4px',
                        }}
                      >
                        {posting ? 'Publishing...' : 'Publish Announcement'}
                      </button>
                    </div>
                  )}

                  {composerStep === 'image' && (
                    <div style={{ padding: '20px' }}>
                      {!imagePreview ? (
                        <label style={{
                          minHeight: '180px', borderRadius: '16px',
                          border: '2px dashed var(--app-border-soft)', display: 'flex',
                          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '10px', cursor: 'pointer', color: 'var(--text-muted)',
                        }}>
                          <Icon name="imagePlus" size={30} color="var(--app-accent)" />
                          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{uploading ? 'Processing...' : 'Tap to select a photo'}</span>
                          <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        </label>
                      ) : (
                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                          <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '16px' }} />
                          <div onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Icon name="x" size={14} />
                          </div>
                        </div>
                      )}

                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write a caption..."
                        rows={3}
                        style={{
                          width: '100%', marginTop: '10px', padding: '12px', borderRadius: '14px',
                          border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                          color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box',
                          outline: 'none', fontFamily: 'inherit', fontSize: '13.5px',
                        }}
                      />

                      <button
                        onClick={handlePost}
                        disabled={posting || uploading || !imageFile}
                        style={{
                          width: '100%', marginTop: '16px', padding: '13px', borderRadius: '14px',
                          border: 'none', background: imageFile ? 'var(--app-accent)' : 'var(--app-border-soft)',
                          color: '#fff', fontWeight: 700, fontSize: '14.5px',
                          cursor: imageFile ? 'pointer' : 'default', marginBottom: '4px',
                        }}
                      >
                        {uploading ? 'Processing...' : posting ? 'Publishing...' : 'Publish Image'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div style={{ paddingTop: '92px' }}>
      {loading || unreadThreshold === undefined ? <NewsSkeleton /> : (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {articles.map(article => {
          const hasImage = !!article.image_url
          const isExpanded = expandedId === article.id
          const preview = article.body?.length > 140 && !isExpanded ? article.body.slice(0, 140) + '...' : article.body
          const isOwnArticle = article.author_id === session.user.id
          const isLiked = likedIds.has(article.id)
          const isDisliked = dislikedIds.has(article.id)
          const isViewingThis = viewingArticle?.id === article.id
          const posterName = article.profiles?.full_name || 'PolyNet Admin'

          // Purple edge = unread indicator: only for OTHER people's posts
          // newer than the read-state captured at the start of THIS visit,
          // and only once we actually have a real (non-null) prior read
          // timestamp — a brand-new user with no read-state yet should see
          // nothing as "new" rather than everything.
          const isNew = !isOwnArticle && unreadThreshold !== null && new Date(article.created_at) > new Date(unreadThreshold)

          return (
            <div
              key={article.id}
              style={{
                background: 'var(--card-bg)',
                borderRadius: '22px',
                border: isNew ? `1.5px solid ${POST_EDGE_PURPLE}` : '1px solid var(--app-border)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {hasImage && (
                <div style={{ position: 'relative' }}>
                  <motion.img
                    layoutId={`news-image-${article.id}`}
                    onClick={() => handleImageTap(article)}
                    src={article.image_url}
                    alt="News image"
                    style={{
                      width: '100%', height: '180px', objectFit: 'cover', display: 'block',
                      cursor: 'pointer',
                      opacity: isViewingThis ? 0 : 1,
                    }}
                  />
                </div>
              )}
              <div style={{ padding: '16px' }}>
                {!hasImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="megaphone" size={11} color="var(--app-accent)" fill="none" />
                        ANNOUNCEMENT
                      </span>
                    </span>
                    <div style={{ flex: 1 }} />
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => setOpenMenuId(openMenuId === article.id ? null : article.id)}
                        style={{ cursor: 'pointer', padding: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon name="ellipsis-vertical" size={17} />
                      </div>
                      {openMenuId === article.id && !isViewingThis && (
                        <div style={{
                          position: 'absolute', top: '100%', right: 0, zIndex: 100,
                          background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '150px', overflow: 'hidden'
                        }}>
                          {isOwnArticle && (
                            <div
                              onClick={() => deleteArticle(article.id)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="trash-2" size={14} />
                              Delete
                            </div>
                          )}
                          {!isOwnArticle && (
                            <div
                              onClick={() => reportArticle(article.id)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="flag" size={14} />
                              Report
                            </div>
                          )}
                          <div
                            onClick={() => shareArticle(article)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                          >
                            <Icon name="share-2" size={14} />
                            Share
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {hasImage && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px', position: 'relative' }}>
                    <div
                      onClick={() => setOpenMenuId(openMenuId === article.id ? null : article.id)}
                      style={{ cursor: 'pointer', padding: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="ellipsis-vertical" size={17} />
                    </div>
                    {openMenuId === article.id && !isViewingThis && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, zIndex: 100,
                        background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '150px', overflow: 'hidden'
                      }}>
                        {isOwnArticle && (
                          <div
                            onClick={() => deleteArticle(article.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="trash-2" size={14} />
                            Delete
                          </div>
                        )}
                        {!isOwnArticle && (
                          <div
                            onClick={() => reportArticle(article.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="flag" size={14} />
                            Report
                          </div>
                        )}
                        <div
                          onClick={() => shareArticle(article)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                        >
                          <Icon name="share-2" size={14} />
                          Share
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {article.body && (
                  hasImage ? (
                    <>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6 }}>{preview}</p>
                      {article.body.length > 140 && (
                        <div onClick={() => setExpandedId(isExpanded ? null : article.id)} style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}>
                          {isExpanded ? 'Show less' : 'Read more'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.5 }}>{preview}</p>
                      {article.body.length > 140 && (
                        <div onClick={() => setExpandedId(isExpanded ? null : article.id)} style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}>
                          {isExpanded ? 'Show less' : 'Read more'}
                        </div>
                      )}
                    </>
                  )
                )}

                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Posted by {posterName}</span>
                      <VerifiedBadge size={12} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {timeAgo(article.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <LikeButton
                      isLiked={isLiked}
                      count={likeCounts[article.id] || 0}
                      pulseKey={likePulse[article.id] || 0}
                      onClick={() => toggleLike(article.id)}
                    />
                    <DislikeButton
                      isDisliked={isDisliked}
                      count={dislikeCounts[article.id] || 0}
                      pulseKey={dislikePulse[article.id] || 0}
                      onClick={() => toggleDislike(article.id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
      </div>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {viewingArticle && (
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
              layoutId={`news-image-${viewingArticle.id}`}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              src={viewingArticle.image_url}
              alt="News image"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxHeight: '100vh', objectFit: 'contain',
              }}
            />

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
                  onClick={() => setOpenMenuId(openMenuId === viewingArticle.id ? null : viewingArticle.id)}
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
                  {openMenuId === viewingArticle.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 310,
                        background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                        boxShadow: '0 8px 28px rgba(0,0,0,0.35)', minWidth: '150px', overflow: 'hidden',
                        transformOrigin: 'top right',
                      }}
                    >
                      {viewingArticle.author_id === session.user.id && (
                        <div
                          onClick={() => deleteArticle(viewingArticle.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="trash-2" size={14} />
                          Delete
                        </div>
                      )}
                      {viewingArticle.author_id !== session.user.id && (
                        <div
                          onClick={() => reportArticle(viewingArticle.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="flag" size={14} />
                          Report
                        </div>
                      )}
                      <div
                        onClick={() => shareArticle(viewingArticle)}
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

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '40px 20px 24px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', flex: 1 }}>
                {viewingArticle.body || 'PolyNet News'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <LikeButton
                  isLiked={likedIds.has(viewingArticle.id)}
                  count={likeCounts[viewingArticle.id] || 0}
                  pulseKey={likePulse[viewingArticle.id] || 0}
                  onClick={() => toggleLike(viewingArticle.id)}
                />
                <DislikeButton
                  isDisliked={dislikedIds.has(viewingArticle.id)}
                  count={dislikeCounts[viewingArticle.id] || 0}
                  pulseKey={dislikePulse[viewingArticle.id] || 0}
                  onClick={() => toggleDislike(viewingArticle.id)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');
      `}</style>
    </div>
  )
}

export default News