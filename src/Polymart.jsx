import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'

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

const CATEGORIES = [
  { id: 'all',         label: 'All',         emoji: '🛍️' },
  { id: 'electronics', label: 'Electronics', emoji: '📱' },
  { id: 'books',       label: 'Books',       emoji: '📚' },
  { id: 'clothing',    label: 'Clothing',    emoji: '👕' },
  { id: 'furniture',   label: 'Furniture',   emoji: '🪑' },
  { id: 'services',    label: 'Services',    emoji: '🛠️' },
  { id: 'other',       label: 'Other',       emoji: '📦' },
]

function PolyMart({ session, onMessageSeller }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('electronics')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id, title, description, price, category, image_url, created_at, seller_id, profiles(full_name, department)')
      .order('created_at', { ascending: false })
    if (error) console.error('Fetch error:', error.message)
    if (data) setListings(data)
    setLoading(false)
  }

  async function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setErrorMsg('')
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      setImageFile(compressed)
      setImagePreview(URL.createObjectURL(compressed))
    } catch (err) {
      setErrorMsg('Could not process that image. Try a different one.')
      console.error('Compression error:', err)
    }
    setUploading(false)
  }

  async function handlePost() {
    if (!title.trim() || !price) return
    setPosting(true)
    setErrorMsg('')

    let imageUrl = null
    if (imageFile) {
      const fileName = `${session.user.id}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, imageFile, { contentType: 'image/jpeg' })

      if (uploadErr) {
        setErrorMsg(`Image upload failed: ${uploadErr.message}`)
        setPosting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(fileName)
      imageUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('marketplace_listings').insert({
      seller_id: session.user.id,
      title,
      description,
      price: parseFloat(price),
      category,
      image_url: imageUrl,
    })

    if (error) {
      setErrorMsg(`Failed to list item: ${error.message}`)
    } else {
      setTitle(''); setPrice(''); setDescription(''); setCategory('electronics')
      setImageFile(null); setImagePreview(null); setShowComposer(false)
      fetchListings()
    }
    setPosting(false)
  }

  const filtered = listings.filter(l => {
    const matchesCat = activeCat === 'all' || l.category === activeCat
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes dotPulse {0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
      </div>
    )
  }

  if (selectedListing) {
    const l = selectedListing
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div style={{
          padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)',
          display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div onClick={() => setSelectedListing(null)} style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-strong)' }}>←</div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-strong)' }}>Listing details</span>
        </div>

        {l.image_url ? (
          <img src={l.image_url} alt={l.title} style={{ width: '100%', height: '260px', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '260px', background: 'var(--app-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' }}>
            {CATEGORIES.find(c => c.id === l.category)?.emoji || '📦'}
          </div>
        )}

        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--app-accent)', marginBottom: '6px' }}>
            ${Number(l.price).toFixed(2)}
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: 'var(--text-strong)' }}>{l.title}</h2>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', background: 'var(--app-accent-soft)',
              color: 'var(--app-accent)', fontWeight: 700, fontSize: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(l.profiles?.full_name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-strong)' }}>{l.profiles?.full_name || 'PolyNet Student'}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{l.profiles?.department} · {timeAgo(l.created_at)}</div>
            </div>
          </div>

          {l.description && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>
                DESCRIPTION
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.6 }}>{l.description}</p>
            </div>
          )}

          <button onClick={() => onMessageSeller && onMessageSeller({
            listingId: selectedListing.id,
            sellerId: selectedListing.seller_id,
            listingTitle: selectedListing.title,
            sellerName: selectedListing.profiles?.full_name || 'PolyNet Student'
          })} style={{
            width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
            background: 'var(--app-accent)', color: '#fff', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer', boxShadow: 'var(--shadow-accent)',
          }}>
            💬 Message Seller
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{
        padding: '18px 20px 14px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="PolyNet" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--app-accent)', letterSpacing: '-0.3px' }}>PolyMart</h1>
              <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Buy & sell on campus</p>
            </div>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search PolyMart..."
          style={{
            width: '100%', padding: '11px 14px', borderRadius: '12px',
            border: '1.5px solid var(--app-border)', background: 'var(--input-bg)',
            fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', color: 'var(--text-strong)',
          }}
        />

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {CATEGORIES.map(cat => (
            <div
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              style={{
                padding: '7px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: activeCat === cat.id ? 'var(--app-accent)' : 'var(--app-accent-soft)',
                color: activeCat === cat.id ? '#fff' : 'var(--app-accent)',
              }}
            >
              {cat.emoji} {cat.label}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button — purple circle, plus icon */}
      <div
        onClick={() => setShowComposer(!showComposer)}
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

      {showComposer && (
        <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)' }}>
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
            placeholder="Describe the item..."
            rows={3}
            style={{ ...composerInput, resize: 'none', fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <div
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer',
                  background: category === cat.id ? 'var(--app-accent)' : 'var(--app-accent-soft)',
                  color: category === cat.id ? '#fff' : 'var(--app-accent)',
                }}
              >
                {cat.emoji} {cat.label}
              </div>
            ))}
          </div>

          {imagePreview && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={imagePreview} alt="preview" style={{
                width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px',
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

          <label style={{
            display: 'inline-flex', width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--app-accent-soft)', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '16px', marginBottom: '12px',
          }}>
            📷
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          </label>

          {errorMsg && (
            <p style={{ color: 'var(--danger)', fontSize: '12.5px', marginBottom: '10px', fontWeight: 600 }}>
              {errorMsg}
            </p>
          )}

          <button
            onClick={handlePost}
            disabled={posting || uploading || !title.trim() || !price}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
              background: (title.trim() && price) ? 'var(--app-accent)' : 'var(--app-border-soft)',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: (title.trim() && price) ? 'pointer' : 'default',
            }}
          >
            {uploading ? 'Processing image...' : posting ? 'Listing...' : 'List Item'}
          </button>
        </div>
      )}

      {/* Floating Action Button — purple circle, plus icon */}
      <div
        onClick={() => setShowComposer(!showComposer)}
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

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 30px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🛍️</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No listings found</p>
        </div>
      )}

      <div style={{
        padding: '16px 20px', display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px',
      }}>
        {filtered.map(l => (
          <div
            key={l.id}
            onClick={() => setSelectedListing(l)}
            style={{
              background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden',
              border: '1px solid var(--app-border)', cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {l.image_url ? (
              <img
                src={l.image_url}
                alt={l.title}
                style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.querySelector('.fallback-icon')?.style.setProperty('display', 'flex')
                }}
              />
            ) : null}
            <div className="fallback-icon" style={{
              width: '100%', height: '120px', background: 'var(--app-accent-soft)',
              display: l.image_url ? 'none' : 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '32px',
            }}>
              {CATEGORIES.find(c => c.id === l.category)?.emoji || '📦'}
            </div>
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
        ))}
      </div>

      <div style={{ height: '20px' }} />
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