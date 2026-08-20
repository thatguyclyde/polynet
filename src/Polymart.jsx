import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Icon from './Icon'
import { useTheme } from './ThemeContext'
import { getDisplayName } from './DisplayName'
import PublicProfileCard from './PublicProfileCard'

const FILTER_ACTIVE_BG = '#FFFFFF'
const FILTER_ACTIVE_TEXT = '#1A1A2E'
const FILTER_PURPLE_EDGE = '#7C3AED'
const VERIFIED_BLUE = '#1D9BF0'
const MAX_LISTING_IMAGES = 3
const PRESS_MOVE_CANCEL_PX = 10 // finger movement beyond this cancels the pending long-press

const REPORT_REASONS = [
  'Prohibited or illegal item',
  'Counterfeit or fake goods',
  'Misleading listing (price, condition, or photos)',
  'Suspected scam or fraud',
  'Stolen item',
  'Unsafe or dangerous item',
  'Harassment from buyer/seller',
  'Explicit or inappropriate images',
  'Spam or duplicate listing',
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
  return new Promise((resolve, reject) => {
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
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('Image failed to load'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// Every category now uses a real lucide icon instead of an emoji
const CATEGORIES = [
  { id: 'all',         label: 'All',         icon: 'shoppingBag' },
  { id: 'electronics', label: 'Electronics', icon: 'zap' },
  { id: 'books',       label: 'Books',       icon: 'book' },
  { id: 'clothing',    label: 'Clothing',    icon: 'shirt' },
  { id: 'furniture',   label: 'Furniture',   icon: 'armchair' },
  { id: 'services',    label: 'Services',    icon: 'wrench' },
  { id: 'other',       label: 'Other',       icon: 'package' },
]

function categoryIcon(id) {
  return CATEGORIES.find(c => c.id === id)?.icon || 'package'
}

// Single source of truth for "what images does this listing have" — prefers
// the new image_urls array, falls back to the old single image_url column
// for listings created before multi-image support existed.
function getListingImages(listing) {
  if (listing?.image_urls && listing.image_urls.length > 0) return listing.image_urls
  if (listing?.image_url) return [listing.image_url]
  return []
}

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
// Shimmer keyframe shared by both skeleton components below.
import { SkeletonShimmerStyle, shimmerStyle as feedShimmer } from './Skeleton'

const shimmerBg = { ...feedShimmer }

// Mimics one listing card (image + price + title lines) — used both for
// the main grid's initial load and My Listings' sheet.
function ListingCardSkeleton({ height = 120 }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
      <div style={{ width: '100%', height: `${height}px`, ...shimmerBg }} />
      <div style={{ padding: '10px' }}>
        <div style={{ width: '45%', height: '15px', borderRadius: '6px', marginBottom: '8px', ...shimmerBg }} />
        <div style={{ width: '75%', height: '12px', borderRadius: '6px', ...shimmerBg }} />
      </div>
    </div>
  )
}

// Grid of card placeholders for the listings area only — the real header,
// search bar, and category filters stay visible and interactive the whole
// time; only this section swaps out while listings are loading.
function ListingsGridSkeleton() {
  return (
    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      <SkeletonShimmerStyle />
      {[0, 1, 2, 3, 4, 5].map(i => <ListingCardSkeleton key={i} />)}
    </div>
  )
}

// My Listings sheet — smaller 2-column grid, matching the shorter thumbnail
// height used inside that panel.
function MyListingsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      <SkeletonShimmerStyle />
      {[0, 1, 2, 3].map(i => <ListingCardSkeleton key={i} height={100} />)}
    </div>
  )
}

// Same bottom-sheet confirmation pattern as Feed.jsx / News.jsx, reused
// here for "mark as sold".
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
            background: danger ? '#EF4444' : FILTER_PURPLE_EDGE, color: '#fff',
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

// Reason picker for reporting a listing — same pattern as Feed.jsx's
// ReportReasonsSheet, with marketplace-specific reasons.
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
          width: '100%', maxWidth: '420px', maxHeight: '75vh', overflowY: 'auto',
          background: 'var(--card-bg)', borderRadius: '24px 24px 0 0',
          padding: '10px 12px 28px',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--app-border-soft)', margin: '6px auto 4px' }} />
        <h3 style={{ margin: '10px 12px 2px', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-strong)' }}>Report listing</h3>
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

// Single-button acknowledgement, same pattern used elsewhere for report
// confirmations.
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
            background: FILTER_PURPLE_EDGE, color: '#f7f5f5f0', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  )
}

// Floats in the middle of the screen, covering most of it — the person's
// own active listings only (name/price, no seller card, no Message
// button, since this is their own stuff). "Sold" marks sold: true, which
// hides it from PolyMart everywhere without deleting the row.
function MyListingsSheet({ session, onClose, onListingRemoved }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmSoldId, setConfirmSoldId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    fetchMyListings()
  }, [])

  async function fetchMyListings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id, title, price, category, image_url, image_urls, created_at')
      .eq('seller_id', session.user.id)
      .eq('sold', false)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching my listings:', error.message)
    setListings(data || [])
    setLoading(false)
  }

  async function confirmMarkSold() {
    const listingId = confirmSoldId
    setConfirmSoldId(null)
    if (!listingId) return
    setRemovingId(listingId)
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ sold: true })
      .eq('id', listingId)
    if (error) {
      console.error('Error marking listing sold:', error.message)
      alert('Could not update this listing. Please try again.')
    } else {
      setListings(prev => prev.filter(l => l.id !== listingId))
      onListingRemoved?.(listingId)
    }
    setRemovingId(null)
  }

  return (
    <>
      <motion.div
        key="my-listings-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 250 }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 260,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '30px 20px', pointerEvents: 'none',
      }}>
        <motion.div
          key="my-listings-panel"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={{
            width: '100%', maxWidth: '400px', maxHeight: '84vh',
            background: 'var(--card-bg)', borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)', flex: 1 }}>My Listings</h2>
            <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
              <Icon name="x" size={20} />
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 16px 20px' }}>
           {loading ? (
              <MyListingsSkeleton />
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <Icon name="shoppingBag" size={32} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '10px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>You haven't listed anything yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {listings.map(l => {
                  const thumb = getListingImages(l)[0]
                  return (
                    <div key={l.id}>
                      <div style={{
                        background: 'var(--page-bg)', borderRadius: '16px', overflow: 'hidden',
                        border: '1px solid var(--app-border)',
                      }}>
                        {thumb ? (
                          <img src={thumb} alt={l.title} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={categoryIcon(l.category)} size={24} color="var(--app-accent)" />
                          </div>
                        )}
                        <div style={{ padding: '9px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--app-accent)' }}>
                            ${Number(l.price).toFixed(2)}
                          </div>
                          <div style={{
                            fontSize: '12px', fontWeight: 600, color: 'var(--text-strong)', marginTop: '2px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {l.title}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmSoldId(l.id)}
                        disabled={removingId === l.id}
                        style={{
                          width: '100%', marginTop: '6px', padding: '8px', borderRadius: '10px',
                          border: 'none', background: 'var(--danger)', color: '#fff',
                          fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        }}
                      >
                        {removingId === l.id ? 'Marking...' : 'Sold'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {confirmSoldId && (
          <ConfirmSheet
            title="Mark as sold?"
            body="This removes the listing from PolyMart for everyone. It won't be visible anymore."
            confirmLabel="Mark as Sold"
            danger
            onConfirm={confirmMarkSold}
            onCancel={() => setConfirmSoldId(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function PolyMart({ session, onMessageSeller, onListingOpenChange }) {
  const { isDark } = useTheme()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [showMyListings, setShowMyListings] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('electronics')
  const [imageFiles, setImageFiles] = useState([]) // up to MAX_LISTING_IMAGES compressed blobs
  const [imagePreviews, setImagePreviews] = useState([]) // matching object URLs
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Detail-view image carousel + fullscreen viewer
  const [imageIndex, setImageIndex] = useState(0)
  const [viewingImage, setViewingImage] = useState(false)
  const [viewingProfileId, setViewingProfileId] = useState(null)

  // Long-press-to-report, now movement-aware: a finger that's actively
  // scrolling (moved beyond PRESS_MOVE_CANCEL_PX before the hold timer
  // fires) cancels the pending report trigger entirely — only a genuinely
  // steady press-and-hold opens the report sheet.
  const [reportTarget, setReportTarget] = useState(null)
  const [reportedNotice, setReportedNotice] = useState(false)
  const pressTimer = useRef(null)
  const pressStartPos = useRef({ x: 0, y: 0 })
  const longPressTriggered = useRef(false)

  useEffect(() => {
    fetchListings()
  }, [])

  // Let the parent (App.jsx) know when a listing's detail view is open, so
  // it can hide the top-right profile avatar while it's showing.
  useEffect(() => {
    onListingOpenChange?.(!!selectedListing)
    return () => onListingOpenChange?.(false)
  }, [selectedListing])

  // Reset the carousel/viewer whenever a different listing is opened.
  useEffect(() => {
    setImageIndex(0)
    setViewingImage(false)
  }, [selectedListing?.id])

  async function fetchListings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id, title, description, price, category, image_url, image_urls, created_at, seller_id, profiles(full_name, department, avatar_url, is_admin, admin_title)')
      .eq('sold', false)
      .order('created_at', { ascending: false })
    if (error) console.error('Fetch error:', error.message)
    if (data) setListings(data)
    setLoading(false)
  }

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setErrorMsg('')

    const remainingSlots = MAX_LISTING_IMAGES - imageFiles.length
    const toProcess = files.slice(0, remainingSlots)
    if (toProcess.length === 0) {
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const compressedList = await Promise.all(toProcess.map(f => compressImage(f)))
      const previews = compressedList.map(b => URL.createObjectURL(b))
      setImageFiles(prev => [...prev, ...compressedList])
      setImagePreviews(prev => [...prev, ...previews])
    } catch (err) {
      setErrorMsg('Could not process one of those images. Try different ones.')
      console.error('Compression error:', err)
    }
    setUploading(false)
    e.target.value = '' // allow re-selecting the same file(s) later
  }

  function removeImageAt(idx) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handlePost() {
    if (!title.trim() || !price) return
    setPosting(true)
    setErrorMsg('')

    const uploadedUrls = []
    for (let i = 0; i < imageFiles.length; i++) {
      const fileName = `${session.user.id}/${Date.now()}_${i}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, imageFiles[i], { contentType: 'image/jpeg' })

      if (uploadErr) {
        setErrorMsg(`Image upload failed: ${uploadErr.message}`)
        setPosting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(fileName)
      uploadedUrls.push(urlData.publicUrl)
    }

    const { error } = await supabase.from('marketplace_listings').insert({
      seller_id: session.user.id,
      title,
      description,
      price: parseFloat(price),
      category,
      image_url: uploadedUrls[0] || null,
      image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      sold: false,
    })

    if (error) {
      setErrorMsg(`Failed to list item: ${error.message}`)
    } else {
      closeComposer()
      fetchListings()
    }
    setPosting(false)
  }

  function openComposer() {
    setErrorMsg('')
    setShowComposer(true)
  }

  function closeComposer() {
    setShowComposer(false)
  }

  function resetComposerFields() {
    setTitle('')
    setPrice('')
    setDescription('')
    setCategory('electronics')
    setImageFiles([])
    setImagePreviews([])
    setErrorMsg('')
  }

  function handleListingSold(listingId) {
    setListings(prev => prev.filter(l => l.id !== listingId))
    if (selectedListing?.id === listingId) setSelectedListing(null)
  }

  // Brief, visible "Opening chat..." feedback on the button itself before
  // handing off to App.jsx's page switch — without this delay, the page
  // change happens so fast the label change never actually gets painted.
  // Chats' own loading dots take over right after this, which is expected.
  function handleMessageSeller() {
    if (openingChat || !onMessageSeller) return
    setOpeningChat(true)
    setTimeout(() => {
      onMessageSeller({
        listingId: selectedListing.id,
        sellerId: selectedListing.seller_id,
        listingTitle: selectedListing.title,
        sellerName: getDisplayName(selectedListing.profiles),
        listingImage: getListingImages(selectedListing)[0] || null,
        sellerAvatar: selectedListing.profiles?.avatar_url || null,
      })
    }, 300)
  }

  // Opened via tapping the seller's avatar on the detail page.
  function handleMessageFromProfile({ id, name, avatar }) {
    setViewingProfileId(null)
    onMessageSeller?.({
      listingId: null,
      sellerId: id,
      listingTitle: null,
      sellerName: name,
      listingImage: null,
      sellerAvatar: avatar,
    })
  }

  // ── Long-press-to-report on grid cards ─────────────────────────────
  function getPoint(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  function handlePressStart(listing, e) {
    longPressTriggered.current = false
    pressStartPos.current = getPoint(e)
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(10)
      setReportTarget(listing)
    }, 480)
  }

  // Cancels the pending report trigger the moment the finger drifts beyond
  // a small threshold — this is what stops a scroll gesture from
  // accidentally opening the report sheet.
  function handlePressMove(e) {
    if (!pressTimer.current) return
    const p = getPoint(e)
    const dx = Math.abs(p.x - pressStartPos.current.x)
    const dy = Math.abs(p.y - pressStartPos.current.y)
    if (dx > PRESS_MOVE_CANCEL_PX || dy > PRESS_MOVE_CANCEL_PX) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handlePressEnd() {
    clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  function handleCardClick(listing) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    setSelectedListing(listing)
  }

  async function submitReport(reason) {
    const listing = reportTarget
    setReportTarget(null)
    if (!listing) return
    const { error } = await supabase.from('reports').insert({
      target_type: 'listing',
      target_id: listing.id,
      reporter_id: session.user.id,
      reason,
      context_preview: (listing.title || '').slice(0, 140) || null,
      context_author_id: listing.seller_id,
    })
    if (error) console.error('Error submitting report:', error.message)
    setReportedNotice(true)
  }

  const filtered = listings.filter(l => {
    const matchesCat = activeCat === 'all' || l.category === activeCat
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const headerBg = isDark ? '#000000' : '#FFFFFF'
  const headerSubtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'
  const filterInactiveBorder = isDark ? 'rgba(255,255,255,0.18)' : 'var(--app-border-soft)'
  const filterInactiveText = isDark ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)'
  // Slightly darker than pure page background in light mode, so listing
  // cards visibly stand out against it. Left untouched in dark mode, where
  // the existing page/card contrast already works fine.
  const listingsAreaBg = isDark ? 'var(--page-bg)' : '#F5F4FA'

  if (selectedListing) {
    const l = selectedListing
    const images = getListingImages(l)
    const hasMultiple = images.length > 1

    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        {/* Title on the left, "Back" as a plain text control on the right —
            no arrow icon. */}
        <div style={{
          padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)',
          display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-strong)', flex: 1 }}>Listing details</span>
          <div
            onClick={() => { setSelectedListing(null); setOpeningChat(false) }}
            style={{ cursor: 'pointer', color: 'var(--app-accent)', fontWeight: 700, fontSize: '14px' }}
          >
            Back
          </div>
        </div>

        {/* Shared layoutId with the grid thumbnail below — this is what
            drives the zoom-in transition from card to full detail view.
            Tapping the image itself maximizes it; the arrows (when there's
            more than one photo) stop propagation so they navigate instead
            of triggering the maximize. */}
        <motion.div
          layoutId={`listing-visual-${l.id}`}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={() => images.length > 0 && setViewingImage(true)}
          style={{ width: '100%', height: '260px', position: 'relative', overflow: 'hidden', cursor: images.length > 0 ? 'pointer' : 'default' }}
        >
          {images.length > 0 ? (
            <img
              src={images[imageIndex]}
              alt={l.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={categoryIcon(l.category)} size={44} color="var(--app-accent)" />
            </div>
          )}

          {hasMultiple && imageIndex > 0 && (
            <div
              onClick={(e) => { e.stopPropagation(); setImageIndex(i => i - 1) }}
              style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="chevronLeft" size={18} color="#fff" />
            </div>
          )}
          {hasMultiple && imageIndex < images.length - 1 && (
            <div
              onClick={(e) => { e.stopPropagation(); setImageIndex(i => i + 1) }}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="chevronRight" size={18} color="#fff" />
            </div>
          )}
          {hasMultiple && (
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
              {images.map((_, i) => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: i === imageIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                }} />
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          style={{ padding: '20px' }}
        >
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--app-accent)', marginBottom: '6px' }}>
            ${Number(l.price).toFixed(2)}
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{l.title}</h2>

          {/* Seller row — avatar now opens the public profile card */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px', textAlign: 'left' }}>
            <div
              onClick={() => setViewingProfileId(l.seller_id)}
              style={{
                width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden',
                background: 'var(--app-accent-soft)', color: 'var(--app-accent)', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
              }}
            >
              {l.profiles?.avatar_url ? (
                <img src={l.profiles.avatar_url} alt={getDisplayName(l.profiles)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getDisplayName(l.profiles, 'S').split(' ').map(n => n[0]).slice(0, 2).join('')
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', wordBreak: 'break-word' }}>
                {getDisplayName(l.profiles)}
                {l.profiles?.is_admin && <VerifiedBadge size={12} />}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{l.profiles?.department} · {timeAgo(l.created_at)}</div>
            </div>
          </div>

          {/* Description — left-aligned, wraps safely for long words/URLs */}
          {l.description && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                DESCRIPTION
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{l.description}</p>
            </div>
          )}

          <button
            onClick={handleMessageSeller}
            disabled={openingChat}
            style={{
              width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
              background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '15px',
              cursor: openingChat ? 'default' : 'pointer', boxShadow: 'var(--shadow-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: openingChat ? 0.75 : 1,
            }}
          >
            <Icon name="comment" size={17} color="#fff" />
            {openingChat ? 'Opening chat...' : 'Message Seller'}
          </button>
        </motion.div>

        {/* Fullscreen maximized image viewer */}
        <AnimatePresence>
          {viewingImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingImage(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(10,10,14,0.97)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <img
                src={images[imageIndex]}
                alt={l.title}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxHeight: '100vh', objectFit: 'contain' }}
              />

              {hasMultiple && imageIndex > 0 && (
                <div
                  onClick={(e) => { e.stopPropagation(); setImageIndex(i => i - 1) }}
                  style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <Icon name="chevronLeft" size={20} color="#fff" />
                </div>
              )}
              {hasMultiple && imageIndex < images.length - 1 && (
                <div
                  onClick={(e) => { e.stopPropagation(); setImageIndex(i => i + 1) }}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <Icon name="chevronRight" size={20} color="#fff" />
                </div>
              )}

              <div
                onClick={() => setViewingImage(false)}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <Icon name="x" size={19} color="#fff" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewingProfileId && (
          <PublicProfileCard
            userId={viewingProfileId}
            session={session}
            onClose={() => setViewingProfileId(null)}
            onMessage={handleMessageFromProfile}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{
        padding: '18px 20px 14px',
        background: headerBg,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 120,
        textAlign: 'left',
      }}>
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
            PolyMart
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: headerSubtitleColor, fontWeight: 600 }}>
            Buy & sell on campus
        </p>
      </div>
      
      {/* Floating Action Button */}
      <div
        onClick={openComposer}
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '86px',
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'var(--app-accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-accent)',
          cursor: 'pointer', zIndex: 90,
        }}
      >
        <Icon name="plus" size={26} />
      </div>

      {/* Composer — centered card */}
      <AnimatePresence onExitComplete={resetComposerFields}>
        {showComposer && (
          <>
            <motion.div
              key="polymart-composer-backdrop"
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
                key="polymart-composer-panel"
                initial={{ x: '-55%', opacity: 0, scale: 0.94 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: '-55%', opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 230, damping: 26, mass: 0.9 }}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  maxHeight: '80vh',
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
                    List an Item
                  </h2>
                  <div onClick={closeComposer} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Icon name="x" size={20} />
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What are you selling?"
                    style={composerInput}
                  />
                  <input
                    value={price}
                    onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Price ($)"
                    style={composerInput}
                  />
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Additional info..."
                    rows={3}
                    style={{ ...composerInput, resize: 'none', fontFamily: 'inherit' }}
                  />

                  {/* Category grid — fixed-height cells with the icon
                      stacked above the label and centered, instead of a
                      side-by-side flex row whose label could wrap and
                      throw cell heights out of alignment. Every cell is
                      now visually identical regardless of label length. */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                      const isSelected = category === cat.id
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            height: '64px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', padding: '0 4px',
                            background: isSelected ? 'var(--app-accent)' : 'var(--app-accent-soft)',
                            color: isSelected ? '#fff' : 'var(--app-accent)',
                            border: isSelected ? '1.5px solid var(--app-accent)' : '1.5px solid transparent',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                        >
                          <Icon name={cat.icon} size={16} color={isSelected ? '#fff' : 'var(--app-accent)'} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                            {cat.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Up to 3 photos, optional — each preview removable individually */}
                  {imagePreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {imagePreviews.map((src, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            width: imagePreviews.length === 1 ? '100%' : 'calc(33.33% - 6px)',
                            height: imagePreviews.length === 1 ? '160px' : '90px',
                          }}
                        >
                          <img src={src} alt={`preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                          <div
                            onClick={() => removeImageAt(idx)}
                            style={{
                              position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px',
                              borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}
                          >
                            <Icon name="x" size={12} color="#fff" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '10px',
                    background: imagePreviews.length >= MAX_LISTING_IMAGES ? 'var(--app-border-soft)' : 'var(--app-accent-soft)',
                    cursor: imagePreviews.length >= MAX_LISTING_IMAGES ? 'default' : 'pointer',
                    marginBottom: '12px',
                  }}>
                    <Icon name="camera" size={16} color={imagePreviews.length >= MAX_LISTING_IMAGES ? 'var(--text-muted)' : 'var(--app-accent)'} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: imagePreviews.length >= MAX_LISTING_IMAGES ? 'var(--text-muted)' : 'var(--app-accent)' }}>
                      {imagePreviews.length}/{MAX_LISTING_IMAGES} photos
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      disabled={imagePreviews.length >= MAX_LISTING_IMAGES}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {errorMsg && (
                    <p style={{ color: 'var(--danger)', fontSize: '12.5px', marginBottom: '10px', fontWeight: 600, wordBreak: 'break-word' }}>
                      {errorMsg}
                    </p>
                  )}

                  <button
                    onClick={handlePost}
                    disabled={posting || uploading || !title.trim() || !price}
                    style={{
                      width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
                      background: (title.trim() && price) ? 'var(--app-accent)' : 'var(--app-border-soft)',
                      color: '#fff', fontWeight: 700, fontSize: '14.5px',
                      cursor: (title.trim() && price) ? 'pointer' : 'default',
                      marginBottom: '4px',
                    }}
                  >
                    {uploading ? 'Processing images...' : posting ? 'Listing...' : 'List Item'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* My Listings — floats in the middle of the screen */}
      <AnimatePresence>
        {showMyListings && (
          <MyListingsSheet
            session={session}
            onClose={() => setShowMyListings(false)}
            onListingRemoved={handleListingSold}
          />
        )}
      </AnimatePresence>

      {/* Listings area — slightly darker background in light mode so cards
          stand out clearly from the page behind them. paddingTop accounts
          for the now-fixed header above it. Header/search/filters above
          this point always render for real — only the section below swaps
          between skeleton cards and actual listings. */}
      <div style={{ background: listingsAreaBg, minHeight: '40vh', paddingTop: '78px' }}>

        <div style={{ padding: '12px 20px 4px' }}>
          {/* Search bar (65%) + My Listings button (remaining 35%) — the
              button's label is allowed to wrap onto two lines rather than
              overflow on narrower screens. */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search PolyMart..."
              style={{
                flex: '0 0 65%', width: '65%', padding: '11px 14px', borderRadius: '12px',
                border: '1.5px solid var(--app-border)', background: 'var(--input-bg)',
                fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', color: 'var(--text-strong)',
              }}
            />
            <button
              onClick={() => setShowMyListings(true)}
              style={{
                flex: 1, minWidth: 0, padding: '0 6px', borderRadius: '12px', border: 'none',
                background: FILTER_PURPLE_EDGE, fontWeight: 700, fontSize: '11px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.15, boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Icon name="shoppingBag" size={12} color="#fff" style={{ flexShrink: 0 }} />
              <span style={{ overflowWrap: 'break-word', color: '#fff' }}>My Listings</span>
            </button>
          </div>

          {/* Category filter chips — scrolls away with the page */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '4px' }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCat === cat.id
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 600,
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    border: isActive ? `1.5px solid ${FILTER_PURPLE_EDGE}` : `1.5px solid ${filterInactiveBorder}`,
                    background: isActive ? FILTER_ACTIVE_BG : 'transparent',
                    color: isActive ? FILTER_ACTIVE_TEXT : filterInactiveText,
                    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  }}
                >
                  <Icon name={cat.icon} size={14} color={isActive ? FILTER_ACTIVE_TEXT : filterInactiveText} />
                  {cat.label}
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <ListingsGridSkeleton />
        ) : (
          <>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 30px' }}>
                <Icon name="shoppingBag" size={40} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No listings found</p>
              </div>
            )}

            <div style={{
              padding: '16px 20px', display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px',
            }}>
              {filtered.map(l => {
                const thumb = getListingImages(l)[0]
                return (
                  <div
                    key={l.id}
                    onClick={() => handleCardClick(l)}
                    onMouseDown={(e) => handlePressStart(l, e)}
                    onMouseMove={handlePressMove}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={(e) => handlePressStart(l, e)}
                    onTouchMove={handlePressMove}
                    onTouchEnd={handlePressEnd}
                    style={{
                      background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden',
                      border: '1px solid var(--app-border)', cursor: 'pointer',
                      boxShadow: 'var(--shadow-card)',
                      userSelect: 'none', WebkitUserSelect: 'none',
                    }}
                  >
                    {/* Shared layoutId with the detail page's hero image — this
                        drives the zoom-in transition on tap. */}
                    <motion.div layoutId={`listing-visual-${l.id}`} style={{ position: 'relative', width: '100%', height: '120px', overflow: 'hidden' }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={l.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.querySelector('.fallback-icon')?.style.setProperty('display', 'flex')
                          }}
                        />
                      ) : null}
                      <div className="fallback-icon" style={{
                        width: '100%', height: '100%', background: 'var(--app-accent-soft)',
                        display: thumb ? 'none' : 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        position: 'absolute', inset: 0,
                      }}>
                        <Icon name={categoryIcon(l.category)} size={28} color="var(--app-accent)" />
                      </div>
                    </motion.div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--app-accent)' }}>
                        ${Number(l.price).toFixed(2)}
                      </div>
                      <div style={{
                        fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong)', marginTop: '2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {l.title}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {timeAgo(l.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ height: '20px' }} />
      </div>

      <AnimatePresence>
        {reportTarget && (
          <ReportReasonsSheet
            onSelect={submitReport}
            onClose={() => setReportTarget(null)}
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');
      `}</style>
    </div>
  )
}

const composerInput = {
  width: '100%', padding: '12px', borderRadius: '12px',
  border: '1.5px solid var(--app-border-soft)', background: 'var(--input-bg)',
  fontSize: '14px', color: 'var(--text-strong)', outline: 'none',
  boxSizing: 'border-box', marginBottom: '10px',
}

export default PolyMart