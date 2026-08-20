import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { useTheme } from './ThemeContext'
import { getDisplayName } from './DisplayName'

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

import { SkeletonShimmerStyle, shimmerStyle as feedShimmer } from './Skeleton'

// Use the exact Feed shimmer (vibrant sweep)
const shimmerBg = { ...feedShimmer }

// Mimics one news card. Alternates image/text-only shape so the loading
// state doesn't look identical to every real card underneath it.
function NewsCardSkeleton({ withImage }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: '22px', overflow: 'hidden',
      border: '1px solid var(--app-border)', boxShadow: 'var(--shadow-card)',
    }}>
      {withImage && <div style={{ width: '100%', height: '180px', ...shimmerBg }} />}
      <div style={{ padding: '16px' }}>
        {!withImage && (
          <div style={{ width: '96px', height: '18px', borderRadius: '999px', marginBottom: '10px', ...shimmerBg }} />
        )}
        <div style={{ width: '92%', height: withImage ? '12px' : '16px', borderRadius: '6px', marginBottom: '8px', ...shimmerBg }} />
        <div style={{ width: '70%', height: withImage ? '12px' : '16px', borderRadius: '6px', marginBottom: '14px', ...shimmerBg }} />
        <div style={{ paddingTop: '10px', borderTop: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '110px', height: '11px', borderRadius: '6px', ...shimmerBg }} />
          <div style={{ width: '60px', height: '15px', borderRadius: '6px', ...shimmerBg }} />
        </div>
      </div>
    </div>
  )
}

// Feed of placeholder cards shown while articles + read-state are loading.
function NewsSkeleton() {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SkeletonShimmerStyle />
      <NewsCardSkeleton withImage />
      <NewsCardSkeleton />
      <NewsCardSkeleton withImage />
      <NewsCardSkeleton />
    </div>
  )
}

// Two-button confirmation — used for Delete and Download.
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
            background: danger ? '#EF4444' : POST_EDGE_PURPLE, color: '#fff',
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

// Single-button acknowledgement — used for the "Reported" notice, replacing
// the old window.alert().
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
            background: POST_EDGE_PURPLE, color: '#fff',
            fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  )
}

// Share sheet — WhatsApp / Copy Link / Download Image / More options.
function ShareSheet({ article, onClose, onDownload }) {
  const [copied, setCopied] = useState(false)
  const url = article?.shareUrl

  function shareToWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent('Check out this update on PolyNet: ' + url)}`, '_blank')
    onClose()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); onClose() }, 900)
    } catch {
      onClose()
    }
  }

  async function systemShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PolyNet News', text: 'Check out this update on PolyNet', url })
      } catch {}
    }
    onClose()
  }

  function requestDownload() {
    onClose()
    onDownload(article)
  }

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
        <h3 style={{ margin: '10px 12px 14px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Share article</h3>

        <div onClick={shareToWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,211,102,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="whatsapp" size={19} color="#25D366" />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>WhatsApp</span>
        </div>

        <div onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="copy" size={17} color="var(--app-accent)" />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>{copied ? 'Link copied!' : 'Copy Link'}</span>
        </div>

        {article?.image_url && (
          <div onClick={requestDownload} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="download" size={17} color="var(--app-accent)" />
            </div>
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>Download Image</span>
          </div>
        )}

        {typeof navigator !== 'undefined' && navigator.share && (
          <div onClick={systemShare} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share-2" size={18} color="var(--app-accent)" />
            </div>
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>More options</span>
          </div>
        )}
      </motion.div>
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
  const fileInputRef = useRef(null)

  const [deleteArticleId, setDeleteArticleId] = useState(null)
  const [downloadArticle, setDownloadArticle] = useState(null)
  const [reportArticleId, setReportArticleId] = useState(null)
  const [reportedNotice, setReportedNotice] = useState(false)
  const [sharingArticle, setSharingArticle] = useState(null)

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
        profiles(full_name, is_admin, admin_title),
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

  // Picking a photo (from anywhere the hidden input is triggered) jumps
  // straight to the image step — no extra tap needed in between.
  async function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setComposerStep('image')
    setUploading(true)
    const compressed = await compressImage(file)
    setImageFile(compressed)
    setImagePreview(URL.createObjectURL(compressed))
    setUploading(false)
    e.target.value = null
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

  function requestDeleteArticle(articleId) {
    setOpenMenuId(null)
    setDeleteArticleId(articleId)
  }

  async function performDeleteArticle() {
    const articleId = deleteArticleId
    setDeleteArticleId(null)
    if (!articleId) return
    const { error } = await supabase.from('news_articles').delete().eq('id', articleId)
    if (!error) {
      setArticles(prev => prev.filter(a => a.id !== articleId))
      if (viewingArticle?.id === articleId) setViewingArticle(null)
    } else {
      console.error('Error deleting article:', error.message)
    }
  }

  function requestReportArticle(articleId) {
    setOpenMenuId(null)
    setReportArticleId(articleId)
  }

  function confirmReportArticle() {
    setReportArticleId(null)
    setReportedNotice(true)
  }

  function requestDownloadImage(article) {
    setOpenMenuId(null)
    setDownloadArticle(article)
  }

  async function confirmDownloadImage() {
    const article = downloadArticle
    setDownloadArticle(null)
    if (!article?.image_url) return
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      window.open(article.image_url, '_blank')
      return
    }
    try {
      const response = await fetch(article.image_url, { mode: 'cors' })
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `polynet-news-${article.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error downloading image, falling back to opening it:', err)
      window.open(article.image_url, '_blank')
    }
  }

  function openShareSheet(article) {
    setOpenMenuId(null)
    const url = `${window.location.origin}${window.location.pathname}#article-${article.id}`
    setSharingArticle({ ...article, shareUrl: url })
  }

  const headerBg = isDark ? '#000000' : '#FFFFFF'
  const headerSubtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{
        padding: '18px 20px 16px',
        background: headerBg,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120,
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

                {/* Always mounted so it's reachable straight from the
                    "choose" step — tapping Image below fires this directly,
                    no intermediate tap needed. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />

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
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-strong)' }}>Announcement</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>A bold, text-only post</div>
                        </div>
                      </div>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                          borderRadius: '16px', border: '1.5px solid var(--app-border-soft)',
                          cursor: 'pointer', background: 'var(--page-bg)',
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="camera" size={20} color="var(--app-accent)" />
                        </div>
                        <div style={{ textAlign: 'left' }}>
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
          const posterName = getDisplayName(article.profiles, 'PolyNet Admin')
          const menuOpenForThisArticle = openMenuId === article.id && !isViewingThis

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
                      {menuOpenForThisArticle && (
                        <>
                          <div
                            onClick={() => setOpenMenuId(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                          />
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 100,
                            background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '150px', overflow: 'hidden'
                          }}>
                            {isOwnArticle && (
                              <div
                                onClick={() => requestDeleteArticle(article.id)}
                                style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                              >
                                <Icon name="trash-2" size={14} />
                                Delete
                              </div>
                            )}
                            {!isOwnArticle && (
                              <div
                                onClick={() => requestReportArticle(article.id)}
                                style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                              >
                                <Icon name="flag" size={14} />
                                Report
                              </div>
                            )}
                            <div
                              onClick={() => openShareSheet(article)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                            >
                              <Icon name="share-2" size={14} />
                              Share
                            </div>
                          </div>
                        </>
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
                    {menuOpenForThisArticle && (
                      <>
                        <div
                          onClick={() => setOpenMenuId(null)}
                          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        />
                        <div style={{
                          position: 'absolute', top: '100%', right: 0, zIndex: 100,
                          background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '150px', overflow: 'hidden'
                        }}>
                          {isOwnArticle && (
                            <div
                              onClick={() => requestDeleteArticle(article.id)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="trash-2" size={14} />
                              Delete
                            </div>
                          )}
                          <div
                            onClick={() => requestDownloadImage(article)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="download" size={14} />
                            Download
                          </div>
                          {!isOwnArticle && (
                            <div
                              onClick={() => requestReportArticle(article.id)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="flag" size={14} />
                              Report
                            </div>
                          )}
                          <div
                            onClick={() => openShareSheet(article)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                          >
                            <Icon name="share-2" size={14} />
                            Share
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {article.body && (
                  hasImage ? (
                    <>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6, textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{preview}</p>
                      {article.body.length > 140 && (
                        <div onClick={() => setExpandedId(isExpanded ? null : article.id)} style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}>
                          {isExpanded ? 'Show less' : 'Read more'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.5, textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{preview}</p>
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
                    <>
                      {/* Tap-outside-to-close backdrop — sits below this
                          dropdown's z-index (310), above the viewer's own
                          background (300), so a stray tap closes only the
                          menu, not the whole fullscreen viewer. */}
                      <motion.div
                        key="viewer-menu-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null) }}
                        style={{ position: 'fixed', inset: 0, zIndex: 305 }}
                      />
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
                            onClick={() => requestDeleteArticle(viewingArticle.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="trash-2" size={14} />
                            Delete
                          </div>
                        )}
                        <div
                          onClick={() => requestDownloadImage(viewingArticle)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="download" size={14} />
                          Download
                        </div>
                        {viewingArticle.author_id !== session.user.id && (
                          <div
                            onClick={() => requestReportArticle(viewingArticle.id)}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="flag" size={14} />
                            Report
                          </div>
                        )}
                        <div
                          onClick={() => openShareSheet(viewingArticle)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center' }}
                        >
                          <Icon name="share-2" size={14} />
                          Share
                        </div>
                      </motion.div>
                    </>
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
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', flex: 1, textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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

      <AnimatePresence>
        {deleteArticleId && (
          <ConfirmSheet
            title="Delete this article?"
            body="This will remove it permanently for everyone on PolyNet. This can't be undone."
            confirmLabel="Delete Article"
            danger
            onConfirm={performDeleteArticle}
            onCancel={() => setDeleteArticleId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {downloadArticle && (
          <ConfirmSheet
            title="Download this image?"
            body="It will be saved to your device."
            confirmLabel="Download"
            onConfirm={confirmDownloadImage}
            onCancel={() => setDownloadArticle(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportArticleId && (
          <ConfirmSheet
            title="Report this article?"
            body="This flags it for review by campus moderators."
            confirmLabel="Report"
            danger
            onConfirm={confirmReportArticle}
            onCancel={() => setReportArticleId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportedNotice && (
          <InfoSheet
            title="Reported"
            body="Thank you for helping keep our community safe."
            onClose={() => setReportedNotice(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharingArticle && (
          <ShareSheet
            article={sharingArticle}
            onClose={() => setSharingArticle(null)}
            onDownload={requestDownloadImage}
          />
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');
      `}</style>
    </div>
  )
}

export default News
