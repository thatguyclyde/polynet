import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { FeedSkeleton } from './Skeleton'
import PublicProfileCard from './PublicProfileCard'
import { useTheme } from './ThemeContext'
import { getDisplayName } from './DisplayName'

const CATEGORY_STYLES = {
  school: { label: 'School Related', color: 'var(--success)', bg: 'rgba(22,163,74,0.12)' },
  other: { label: 'Other', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
}

const FILTERS = [
  { id: 'all', label: 'All', color: '#A855F7', bg: 'rgba(168,85,247,0.18)' },
  { id: 'school', label: 'School Related', color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  { id: 'other', label: 'Other', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
]

const LIKE_RED = '#ED4956'
const BRAND_PURPLE = '#7C3AED'
const VERIFIED_BLUE = '#1D9BF0'
const FUZZY_THRESHOLD = 0.6
const COLLAPSE_THRESHOLD = 30 // must match FEED_COLLAPSE_THRESHOLD in App.jsx
const HEADER_HEIGHT_FALLBACK = 82 // used only until the real header height is measured
const COMMENT_PREVIEW_COUNT = 2

const REPORT_REASONS = [
  'Cyberbullying or harassment',
  'Explicit or sexual content',
  'Hate speech or discrimination',
  'Violence or dangerous behavior',
  'Spam or scam',
  'False information',
  'Something else',
]

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

function letterOverlapRatio(query, target) {
  const q = query.toLowerCase()
  const remaining = target.toLowerCase().split('')
  let matches = 0
  for (const ch of q) {
    const idx = remaining.indexOf(ch)
    if (idx !== -1) {
      matches++
      remaining.splice(idx, 1)
    }
  }
  return matches / q.length
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

// Small blue check badge marking admin authors — same visual language used
// in News.jsx and Chats.jsx, reused here for post headers and comments.
function VerifiedBadge({ size = 13 }) {
  return (
    <span
      title="Admin"
      style={{
        position: 'relative', width: size, height: size, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <Icon name="badgeCheck" size={size} color={VERIFIED_BLUE} fill={VERIFIED_BLUE} style={{ position: 'absolute', top: 0, left: 0 }} />
      <Icon name="check" size={size * 0.46} color="#fff" strokeWidth={3.5} style={{ position: 'relative' }} />
    </span>
  )
}

// Drawn directly instead of going through Icon.jsx — its icon-name mapping
// wasn't rendering "copy" reliably, so this sidesteps that entirely.
function CopyIcon({ size = 17, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
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
      <Icon name="comment" size={22} color={isOpen ? 'var(--app-accent)' : 'var(--text-muted)'} fill="none" />
      <span style={{ fontWeight: 700, fontSize: '13px', color: isOpen ? 'var(--app-accent)' : 'var(--text-muted)' }}>
        {count > 0 ? count : 'Comment'}
      </span>
    </div>
  )
}

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
            background: danger ? '#EF4444' : BRAND_PURPLE, color: '#fff',
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

function ShareSheet({ url, onClose }) {
  const [copied, setCopied] = useState(false)

  function shareToWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent('Check out this post on PolyNet: ' + url)}`, '_blank')
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
        await navigator.share({ title: 'PolyNet', text: 'Check out this post on PolyNet', url })
      } catch {}
    }
    onClose()
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
        <h3 style={{ margin: '10px 12px 14px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Share post</h3>

        <div onClick={shareToWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(37,211,102,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="whatsapp" size={19} color="#25D366" />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>WhatsApp</span>
        </div>

        <div onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 12px', cursor: 'pointer', borderRadius: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CopyIcon size={17} color="var(--app-accent)" />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-strong)' }}>{copied ? 'Link copied!' : 'Copy Link'}</span>
        </div>

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

// Reason picker for reporting a post — always available regardless of
// whether the post belongs to the person viewing it.
function ReportReasonsSheet({ onSelect, onClose }) {
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
        <h3 style={{ margin: '10px 12px 2px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Report post</h3>
        <p style={{ margin: '0 12px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>What's the issue?</p>
        {REPORT_REASONS.map(reason => (
          <div
            key={reason}
            onClick={() => onSelect(reason)}
            style={{ padding: '13px 12px', cursor: 'pointer', borderRadius: '12px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-strong)' }}
          >
            {reason}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// Single-button acknowledgement, same pattern used for News's report flow.
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
            background: BRAND_PURPLE, color: '#fff', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  )
}

function Feed({ session, onStartChat, scrollY = 0 }) {
  const { isDark } = useTheme()
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

  const [loadedImageIds, setLoadedImageIds] = useState(new Set())

  const [burstId, setBurstId] = useState(null)
  const [openComments, setOpenComments] = useState(null)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  // Which posts currently have their FULL comment list expanded — comments
  // default to showing just the first two (latest, since queries are
  // newest-first), with a "Read more" toggle.
  const [expandedComments, setExpandedComments] = useState(new Set())

  const [openMenuId, setOpenMenuId] = useState(null)
  const [savingImageId, setSavingImageId] = useState(null)

  const [viewingPost, setViewingPost] = useState(null)
  const tapTimer = useRef(null)

  const [viewingProfileId, setViewingProfileId] = useState(null)

  const [deletePostId, setDeletePostId] = useState(null)
  const [sharingPost, setSharingPost] = useState(null)

  const [reportPostId, setReportPostId] = useState(null)
  const [reportedNotice, setReportedNotice] = useState(false)

  const [skillSearchOpen, setSkillSearchOpen] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const [skillResults, setSkillResults] = useState([])
  const [skillSearching, setSkillSearching] = useState(false)
  const [skillSearched, setSkillSearched] = useState(false)

  const isCollapsed = scrollY > COLLAPSE_THRESHOLD

  // ── Dynamic header height ──────────────────────────────────────────
  // Measures the fixed title block's REAL rendered height via
  // ResizeObserver, instead of a hardcoded constant — so the content
  // below it (the filter row) is always padded correctly, regardless of
  // web-font load timing shifting the header's true height slightly.
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT_FALLBACK)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  async function fetchPosts(showLoading = true) {
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        id, content, post_type, created_at, author_id, image_url,
        profiles(full_name, department, avatar_url, is_admin, admin_title),
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
    if (showLoading) setLoading(false)
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
        .select('id, content, created_at, author_id, profiles(full_name, is_admin, admin_title)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
      setCommentsByPost(prev => ({ ...prev, [postId]: data || [] }))
    }
  }

  function toggleExpandComments(postId) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  async function submitComment(postId) {
    if (!newComment.trim()) return
    setCommentLoading(true)
    const { error } = await supabase.from('feed_comments').insert({ post_id: postId, author_id: session.user.id, content: newComment })
    if (!error) {
      const { data } = await supabase
        .from('feed_comments')
        .select('id, content, created_at, author_id, profiles(full_name, is_admin, admin_title)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
      setCommentsByPost(prev => ({ ...prev, [postId]: data || [] }))
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
      setNewComment('')
    }
    setCommentLoading(false)
  }

  async function performDeletePost() {
    const postId = deletePostId
    setDeletePostId(null)
    if (!postId) return
    const { error } = await supabase.from('feed_posts').delete().eq('id', postId)
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      setOpenMenuId(null)
      if (viewingPost?.id === postId) setViewingPost(null)
    } else {
      console.error('Error deleting post:', error.message)
    }
  }

  async function handleSaveImage(post) {
    setOpenMenuId(null)
    if (!post.image_url) {
      alert("This post doesn't have an image to save.")
      return
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      window.open(post.image_url, '_blank')
      return
    }

    setSavingImageId(post.id)
    try {
      const response = await fetch(post.image_url, { mode: 'cors' })
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `polynet-post-${post.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Error downloading image, falling back to opening it:', err)
      window.open(post.image_url, '_blank')
    }
    setSavingImageId(null)
  }

  function requestReportPost(postId) {
    setOpenMenuId(null)
    setReportPostId(postId)
  }

  function submitReport(reason) {
    // No reports table wired up in this file yet — this just acknowledges
    // the report for now.
    setReportPostId(null)
    setReportedNotice(true)
  }

  function openSharePost(post) {
    setOpenMenuId(null)
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`
    setSharingPost({ ...post, shareUrl: url })
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

  function openSkillSearch() {
    setSkillSearchOpen(true)
  }

  function closeSkillSearch() {
    setSkillSearchOpen(false)
    setSkillQuery('')
    setSkillResults([])
    setSkillSearched(false)
  }

  async function runSkillSearch() {
    const trimmed = skillQuery.trim()
    if (!trimmed) return
    setSkillSearching(true)
    setSkillSearched(true)

    const { data, error } = await supabase
      .from('skills')
      .select('user_id, skill_name, profiles(full_name, department, avatar_url, is_admin, admin_title)')
      .limit(1000)

    if (error) {
      console.error('Error searching skills:', error.message)
      setSkillResults([])
      setSkillSearching(false)
      return
    }

    const lowerQuery = trimmed.toLowerCase()
    const scored = (data || [])
      .filter(row => row.user_id !== session.user.id)
      .map(row => {
        const skillLower = row.skill_name.toLowerCase()
        const isSubstringMatch = skillLower.includes(lowerQuery)
        const overlap = letterOverlapRatio(trimmed, row.skill_name)
        const matches = isSubstringMatch || overlap >= FUZZY_THRESHOLD
        return { row, matches, score: isSubstringMatch ? 1 : overlap }
      })
      .filter(r => r.matches)
      .sort((a, b) => b.score - a.score)

    const byUser = new Map()
    scored.forEach(({ row }) => {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          userId: row.user_id,
          name: getDisplayName(row.profiles),
          department: row.profiles?.department || '',
          avatar: row.profiles?.avatar_url || null,
          matchedSkill: row.skill_name,
        })
      }
    })

    setSkillResults(Array.from(byUser.values()))
    setSkillSearching(false)
  }

  function openResultProfile(userId) {
    closeSkillSearch()
    setViewingProfileId(userId)
  }

  const filteredPosts = activeFilter === 'all' ? posts : posts.filter(p => p.post_type === activeFilter)

  const headerBg = isDark ? '#000000' : '#FFFFFF'
  const headerSubtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'
  const filterInactiveBorder = isDark ? 'rgba(255,255,255,0.18)' : 'var(--app-border-soft)'
  const filterInactiveText = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'
  const postDivider = isDark ? '#000000' : 'var(--app-border)'

  const skillsButtonContent = (
    <>
      <Icon name="search" size={13} color="#fff" />
      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#fff' }}>Skills</span>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', position: 'relative' }}>

      {/* TITLE — genuinely position:fixed. Ref'd + observed for its real
          rendered height, which the content below matches exactly. */}
      <div
        ref={headerRef}
        style={{
          padding: '18px 20px 14px',
          background: headerBg,
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120,
        }}
      >
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
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: headerSubtitleColor, fontWeight: 600 }}>
            Harare Poly
          </p>
        </div>
      </div>

      {/* DOCKED SKILLS BUTTON — fixed, appears only once collapsed. Its
          coordinates now match the AVATAR's own slot in App.jsx (top:14px,
          right:16px) — since the avatar simultaneously slides left via its
          own animation there, this button flies up and settles exactly
          into the spot the avatar just vacated, rather than sitting off to
          its side. Shares layoutId with the inline copy in the filter row
          below, so Framer Motion interpolates the whole move (including
          the upward travel) automatically between the two positions. */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            layoutId="feed-skills-button"
            onClick={openSkillSearch}
            style={{
              position: 'fixed', top: '14px', right: '16px', zIndex: 160,
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '999px',
              background: BRAND_PURPLE, cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(124,58,237,0.35)',
            }}
          >
            {skillsButtonContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content sits under the fixed title via a simple paddingTop match
          — no pull-to-refresh, no touch handling, no transform here
          anymore. This is plain, ordinary scrolling content. */}
      <div style={{ paddingTop: `${headerHeight}px` }}>

        {/* FILTERS + INLINE SKILLS BUTTON */}
        <div style={{ padding: '0 20px 12px', background: headerBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px', flex: 1 }}>
              {FILTERS.map(f => {
                const isActive = activeFilter === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      padding: '4px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                      whiteSpace: 'nowrap', cursor: 'pointer',
                      border: isActive ? `1.5px solid ${f.color}` : `1.5px solid ${filterInactiveBorder}`,
                      background: isActive ? f.bg : 'transparent',
                      color: isActive ? f.color : filterInactiveText,
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {f.label}
                  </div>
                )
              })}
            </div>

            {!isCollapsed && (
              <motion.div
                layoutId="feed-skills-button"
                onClick={openSkillSearch}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', borderRadius: '999px',
                  background: BRAND_PURPLE, cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(124,58,237,0.35)',
                }}
              >
                {skillsButtonContent}
              </motion.div>
            )}
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
            const name = getDisplayName(post.profiles)
            const isAuthorAdmin = !!post.profiles?.is_admin
            const dept = post.profiles?.department || ''
            const isSchoolRelated = post.post_type === 'school'
            const isLiked = likedIds.has(post.id)
            const comments = commentsByPost[post.id] || []
            const isExpanded = expandedComments.has(post.id)
            const visibleComments = isExpanded ? comments : comments.slice(0, COMMENT_PREVIEW_COUNT)
            const hasMoreComments = comments.length > COMMENT_PREVIEW_COUNT
            const isOwnPost = post.author_id === session.user.id
            const isViewingThis = viewingPost?.id === post.id
            const hasImage = !!post.image_url
            const isImageLoaded = loadedImageIds.has(post.id)
            const menuOpenForThisPost = openMenuId === post.id && !isViewingThis

            return (
              <motion.div key={post.id} layout="position" style={{ borderBottom: `8px solid ${postDivider}` }}>
                {/* Header row — no separator line here; a thin divider
                    now sits at the very bottom of the whole post instead. */}
                <div style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '12px 16px 10px', position: 'relative',
                }}>
                  <Avatar url={post.profiles?.avatar_url} name={name} size={40} onClick={() => goToAuthor(post.author_id)} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                      <span
                        onClick={() => goToAuthor(post.author_id)}
                        title={name}
                        style={{
                          fontWeight: 700, fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          minWidth: 0, maxWidth: '75%',
                        }}
                      >
                        {name}
                      </span>
                      {isAuthorAdmin && <VerifiedBadge size={12} />}
                      {isSchoolRelated && (
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: '2px' }} title="School related">
                          <Icon name="school" size={13} color="var(--success)" fill="none" />
                        </div>
                      )}
                    </div>
                    {dept && (
                      <div
                        title={dept}
                        style={{
                          fontSize: '11px', color: 'var(--text-muted)', marginTop: '0px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          textAlign: 'left',
                        }}
                      >
                        {dept}
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
                      {menuOpenForThisPost && (
                        <>
                          <div
                            onClick={() => setOpenMenuId(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                          />
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 100,
                            background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--app-border)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden'
                          }}>
                            {isOwnPost && (
                              <div
                                onClick={() => { setOpenMenuId(null); setDeletePostId(post.id) }}
                                style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                              >
                                <Icon name="trash-2" size={14} />
                                Delete
                              </div>
                            )}
                            <div
                              onClick={() => handleSaveImage(post)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="download" size={14} />
                              {savingImageId === post.id ? 'Saving...' : 'Save Image'}
                            </div>
                            {/* Report — always available, own posts included. */}
                            <div
                              onClick={() => requestReportPost(post.id)}
                              style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                            >
                              <Icon name="flag" size={14} />
                              Report
                            </div>
                            <div
                              onClick={() => openSharePost(post)}
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
                </div>

                {post.image_url && (
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '340px',
                    background: 'var(--app-border-soft)',
                    overflow: 'hidden',
                  }}>
                    <motion.img
                      layoutId={`post-image-${post.id}`}
                      onClick={() => handleImageTap(post)}
                      src={post.image_url}
                      alt="post"
                      loading="lazy"
                      onLoad={() => setLoadedImageIds(prev => new Set(prev).add(post.id))}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        cursor: 'pointer',
                        opacity: isViewingThis ? 0 : (isImageLoaded ? 1 : 0),
                        transition: 'opacity 0.25s ease',
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

                {post.content && (
                  hasImage ? (
                    <div style={{ margin: '8px 16px 10px', color: 'var(--text-body)', lineHeight: 1.6, fontSize: '14px', textAlign: 'left' }}>
                      <span>{post.content}</span>
                    </div>
                  ) : (
                    <div style={{ margin: '8px 16px 10px', color: 'var(--text-strong)', lineHeight: 1.5, fontSize: '16px', fontWeight: 800, textAlign: 'left' }}>
                      <span>{post.content}</span>
                    </div>
                  )
                )}

                <div style={{ display: 'flex', gap: '28px', padding: post.image_url ? '10px 16px 0' : '2px 16px 0' }}>
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
                        {visibleComments.map(c => {
                          const commentName = getDisplayName(c.profiles)
                          const isCommentAuthorAdmin = !!c.profiles?.is_admin
                          return (
                            <div key={c.id} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              <Avatar name={commentName} size={26} onClick={() => goToAuthor(c.author_id)} />
                              <div style={{ background: 'var(--input-bg)', borderRadius: '12px', padding: '8px 10px', flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '4px', textAlign: 'left' }}>
                                  {commentName}
                                  {isCommentAuthorAdmin && <VerifiedBadge size={11} />}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '2px', textAlign: 'left' }}>{c.content}</div>
                              </div>
                            </div>
                          )
                        })}
                        {comments.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>No comments yet</p>}
                        {hasMoreComments && (
                          <div
                            onClick={() => toggleExpandComments(post.id)}
                            style={{ marginTop: '10px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}
                          >
                            {isExpanded ? 'Show less' : `Read more comments (${comments.length - COMMENT_PREVIEW_COUNT})`}
                          </div>
                        )}
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

                {/* Divider — marks the very bottom of the whole post. */}
                <div style={{ borderBottom: '1px solid var(--app-border-soft)', margin: '10px 16px 0' }} />
              </motion.div>
            )
          })}
        </div>
        )}
      </div>

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
                    <>
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
                          boxShadow: '0 8px 28px rgba(0,0,0,0.35)', minWidth: '160px', overflow: 'hidden',
                          transformOrigin: 'top right',
                        }}
                      >
                        {viewingPost.author_id === session.user.id && (
                          <div
                            onClick={() => { setOpenMenuId(null); setDeletePostId(viewingPost.id) }}
                            style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                          >
                            <Icon name="trash-2" size={14} />
                            Delete
                          </div>
                        )}
                        <div
                          onClick={() => handleSaveImage(viewingPost)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="download" size={14} />
                          {savingImageId === viewingPost.id ? 'Saving...' : 'Save Image'}
                        </div>
                        {/* Report — always available, own posts included. */}
                        <div
                          onClick={() => requestReportPost(viewingPost.id)}
                          style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--app-border-soft)' }}
                        >
                          <Icon name="flag" size={14} />
                          Report
                        </div>
                        <div
                          onClick={() => openSharePost(viewingPost)}
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

      <AnimatePresence>
        {deletePostId && (
          <ConfirmSheet
            title="Delete this post?"
            body="This will remove it permanently for everyone on PolyNet. This can't be undone."
            confirmLabel="Delete Post"
            danger
            onConfirm={performDeletePost}
            onCancel={() => setDeletePostId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharingPost && (
          <ShareSheet url={sharingPost.shareUrl} onClose={() => setSharingPost(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportPostId && (
          <ReportReasonsSheet
            onSelect={submitReport}
            onClose={() => setReportPostId(null)}
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
        {skillSearchOpen && (
          <motion.div
            key="skill-search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSkillSearch}
            style={{
              position: 'fixed', inset: 0, zIndex: 350,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              style={{
                width: '100%', maxWidth: '480px', height: '82vh',
                background: 'var(--card-bg)', borderRadius: '26px 26px 0 0',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', position: 'absolute', left: '50%', top: '8px', transform: 'translateX(-50%)' }} />
                <div style={{ flex: 1, marginTop: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)' }}>Find by Skill</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>e.g. plumbing, graphic design, tutoring</p>
                </div>
                <div onClick={closeSkillSearch} style={{ cursor: 'pointer', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <Icon name="x" size={20} />
                </div>
              </div>

              <div style={{ padding: '14px 20px', display: 'flex', gap: '8px' }}>
                <input
                  value={skillQuery}
                  onChange={e => setSkillQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runSkillSearch() }}
                  placeholder="Search a skill..."
                  autoFocus
                  style={{
                    flex: 1, padding: '11px 14px', borderRadius: '12px',
                    border: '1.5px solid var(--app-border)', background: 'var(--input-bg)',
                    color: 'var(--text-strong)', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={runSkillSearch}
                  disabled={!skillQuery.trim() || skillSearching}
                  style={{
                    padding: '0 18px', borderRadius: '12px', border: 'none',
                    background: skillQuery.trim() ? BRAND_PURPLE : 'var(--app-border-soft)',
                    color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: skillQuery.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <Icon name="search" size={15} color="#fff" />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 20px' }}>
                {skillSearching ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: BRAND_PURPLE, animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                ) : skillSearched && skillResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>No students found with that skill yet.</p>
                  </div>
                ) : (
                  skillResults.map(r => (
                    <div
                      key={r.userId}
                      onClick={() => openResultProfile(r.userId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 4px', cursor: 'pointer',
                        borderBottom: '1px solid var(--app-border-soft)',
                      }}
                    >
                      <Avatar url={r.avatar} name={r.name} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)' }}>{r.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{r.department}</div>
                        <div style={{
                          display: 'inline-block', marginTop: '5px', padding: '3px 9px',
                          borderRadius: '999px', background: 'var(--app-accent-soft)',
                          color: 'var(--app-accent)', fontSize: '11px', fontWeight: 700,
                        }}>
                          {r.matchedSkill}
                        </div>
                      </div>
                      <Icon name="chevronRight" size={16} color="var(--text-muted)" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

export default Feed