import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { NewsSkeleton } from './Skeleton'

const LIKE_ACCENT = 'var(--app-accent)'

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

// Thumbs-up like button — fills solid accent and bumps on like, same
// mechanism as Feed's heart: pulseKey forces the keyframe to replay.
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
          size={16}
          color={isLiked ? LIKE_ACCENT : 'var(--text-muted)'}
          fill={isLiked ? LIKE_ACCENT : 'none'}
        />
      </motion.div>
      <span style={{ fontWeight: 700, fontSize: '12px', color: isLiked ? LIKE_ACCENT : 'var(--text-muted)' }}>
        {count > 0 ? count : 'Like'}
      </span>
    </div>
  )
}

function News({ session }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(true)

  // Real, persisted likes
  const [likedIds, setLikedIds] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({})
  const [likePulse, setLikePulse] = useState({})

  // 3-dot menu + fullscreen image viewer
  const [openMenuId, setOpenMenuId] = useState(null)
  const [viewingArticle, setViewingArticle] = useState(null)
  const tapTimer = useRef(null)

  useEffect(() => {
    fetchArticles()
    fetchMyLikes()
  }, [])

  async function fetchMyLikes() {
    const { data } = await supabase
      .from('news_likes')
      .select('article_id')
      .eq('user_id', session.user.id)
    if (data) setLikedIds(new Set(data.map(r => r.article_id)))
  }

  async function fetchArticles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('news_articles')
      .select(`
        id, title, body, image_url, created_at, author_id,
        profiles(full_name),
        likes:news_likes(count)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) console.error('Error fetching articles:', error.message)

    if (data) {
      setArticles(data)
      const nextCounts = {}
      data.forEach(a => {
        nextCounts[a.id] = a.likes?.[0]?.count ?? 0
      })
      setLikeCounts(nextCounts)
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
    if (!title.trim()) return
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

    const { error } = await supabase.from('news_articles').insert({ author_id: session.user.id, title, body, image_url: imageUrl })

    if (!error) {
      closeComposer()
      fetchArticles()
    }
    setPosting(false)
  }

  function openComposer() {
    setShowComposer(true)
  }

  function closeComposer() {
    setShowComposer(false)
  }

  function resetComposerFields() {
    setTitle('')
    setBody('')
    setImageFile(null)
    setImagePreview(null)
  }

  // Persisted like toggle — optimistic UI, reverts on failure
  async function toggleLike(articleId) {
    const alreadyLiked = likedIds.has(articleId)

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

  // Distinguish single tap (fullscreen) from a would-be double tap on the image
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
      navigator.share({ title: article.title, text: 'Check out this update on PolyNet' })
    } else {
      alert('Article link copied to clipboard!')
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#article-${article.id}`)
    }
    setOpenMenuId(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="PolyNet" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--app-accent)' }}>News</h1>
            <p style={{ marginTop: '1px', fontSize: '11px', color: 'var(--text-muted)' }}>Campus updates</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button — purple circle, plus icon */}
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

      {/* Composer — centered card, same pattern as Feed/PolyMart */}
      <AnimatePresence onExitComplete={resetComposerFields}>
        {showComposer && (
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
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-strong)', flex: 1 }}>
                    New Article
                  </h2>
                  <div onClick={closeComposer} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Icon name="x" size={20} />
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Headline..."
                    style={{
                      width: '100%', padding: '12px', borderRadius: '14px',
                      border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                      color: 'var(--text-strong)', boxSizing: 'border-box', outline: 'none',
                      fontSize: '14px', marginBottom: '10px',
                    }}
                  />
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write the announcement..."
                    rows={4}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '14px',
                      border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)',
                      color: 'var(--text-strong)', resize: 'none', boxSizing: 'border-box',
                      outline: 'none', fontFamily: 'inherit', fontSize: '13.5px', marginBottom: '10px',
                    }}
                  />

                  {imagePreview && (
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '14px' }} />
                      <div onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Icon name="x" size={14} />
                      </div>
                    </div>
                  )}

                  <label style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--app-accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--app-accent)' }}>
                    <Icon name="camera" size={16} />
                    <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                  </label>

                  <button
                    onClick={handlePost}
                    disabled={posting || uploading || !title.trim()}
                    style={{
                      width: '100%', marginTop: '16px', padding: '13px', borderRadius: '14px',
                      border: 'none', background: title.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)',
                      color: '#fff', fontWeight: 700, fontSize: '14.5px',
                      cursor: title.trim() ? 'pointer' : 'default', marginBottom: '4px',
                    }}
                  >
                    {uploading ? 'Processing...' : posting ? 'Publishing...' : 'Publish Article'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {loading ? <NewsSkeleton /> : (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {articles.map(article => {
          const isExpanded = expandedId === article.id
          const preview = article.body?.length > 140 && !isExpanded ? article.body.slice(0, 140) + '...' : article.body
          const isOwnArticle = article.author_id === session.user.id
          const isLiked = likedIds.has(article.id)
          const isViewingThis = viewingArticle?.id === article.id

          return (
            <div key={article.id} style={{ background: 'var(--card-bg)', borderRadius: '22px', border: '1px solid var(--app-border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              {article.image_url && (
                <div style={{ position: 'relative' }}>
                  <motion.img
                    layoutId={`news-image-${article.id}`}
                    onClick={() => handleImageTap(article)}
                    src={article.image_url}
                    alt={article.title}
                    style={{
                      width: '100%', height: '180px', objectFit: 'cover', display: 'block',
                      cursor: 'pointer',
                      opacity: isViewingThis ? 0 : 1,
                    }}
                  />
                </div>
              )}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="newspaper" size={10} />
                      ANNOUNCEMENT
                    </span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>{timeAgo(article.created_at)}</span>

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

                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)' }}>{article.title}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6 }}>{preview}</p>
                {article.body?.length > 140 && (
                  <div onClick={() => setExpandedId(isExpanded ? null : article.id)} style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </div>
                )}

                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Posted by {article.profiles?.full_name || 'PolyNet Admin'}
                  </span>
                  <LikeButton
                    isLiked={isLiked}
                    count={likeCounts[article.id] || 0}
                    pulseKey={likePulse[article.id] || 0}
                    onClick={() => toggleLike(article.id)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Fullscreen Image Viewer — same shared-element pattern as Feed */}
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
              alt={viewingArticle.title}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxHeight: '100vh', objectFit: 'contain',
              }}
            />

            {/* Top bar — back button + 3 dots, same options as the card's menu */}
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

            {/* Bottom overlay — like button + title, still tappable in fullscreen */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '40px 20px 24px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', flex: 1 }}>{viewingArticle.title}</span>
              <LikeButton
                isLiked={likedIds.has(viewingArticle.id)}
                count={likeCounts[viewingArticle.id] || 0}
                pulseKey={likePulse[viewingArticle.id] || 0}
                onClick={() => toggleLike(viewingArticle.id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default News