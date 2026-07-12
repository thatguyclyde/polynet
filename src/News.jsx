import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchArticles()
    checkAdmin()
  }, [])

  async function checkAdmin() {
    // Simple admin check placeholder — everyone can post for now
    // Later this can check a role column in profiles
    setIsAdmin(true)
  }

  async function fetchArticles() {
    setLoading(true)
    const { data } = await supabase
      .from('news_articles')
      .select('id, title, body, image_url, created_at, author_id, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setArticles(data)
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
      const { error: uploadErr } = await supabase.storage
        .from('news-images')
        .upload(fileName, imageFile, { contentType: 'image/jpeg' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('news_articles').insert({
      author_id: session.user.id,
      title,
      body,
      image_url: imageUrl,
    })

    if (!error) {
      setTitle('')
      setBody('')
      setImageFile(null)
      setImagePreview(null)
      setShowComposer(false)
      fetchArticles()
    }
    setPosting(false)
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
        padding: '18px 20px 16px', background: '#ffffff', borderBottom: '1px solid #F1F1F5',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="PolyNet" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#7C3AED', letterSpacing: '-0.3px' }}>
              News
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
              Harare Poly announcements
            </p>
          </div>
        </div>
        {isAdmin && (
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
        )}
      </div>

      {/* Composer */}
      {showComposer && (
        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #F1F1F5' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Headline..."
            style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              border: '1.5px solid #F1F1F5', background: '#FAFAFA',
              fontSize: '15px', fontWeight: 700, color: '#1A1A2E',
              outline: 'none', boxSizing: 'border-box', marginBottom: '10px',
            }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write the announcement..."
            rows={4}
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

          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <label style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
            }}>
              📷
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </label>
          </div>

          <button
            onClick={handlePost}
            disabled={posting || uploading || !title.trim()}
            style={{
              width: '100%', marginTop: '12px', padding: '12px',
              borderRadius: '12px', border: 'none',
              background: title.trim() ? '#7C3AED' : '#E2E0FF',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: title.trim() ? 'pointer' : 'default',
            }}
          >
            {uploading ? 'Processing image...' : posting ? 'Publishing...' : 'Publish Article'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {articles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 30px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📰</div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            No news yet. Check back soon!
          </p>
        </div>
      )}

      {/* Articles */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {articles.map(article => {
          const isExpanded = expandedId === article.id
          const preview = article.body?.length > 140 && !isExpanded
            ? article.body.slice(0, 140) + '...'
            : article.body

          return (
            <div key={article.id} style={{
              background: '#ffffff', borderRadius: '18px', overflow: 'hidden',
              border: '1px solid #F1F1F5', boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}>
              {article.image_url && (
                <img
                  src={article.image_url}
                  alt={article.title}
                  style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                />
              )}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
                    background: '#F5F3FF', color: '#7C3AED', letterSpacing: '0.4px',
                  }}>
                    📢 ANNOUNCEMENT
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#B4B4C0' }}>
                    {timeAgo(article.created_at)}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: '16.5px', fontWeight: 800, color: '#1A1A2E', lineHeight: 1.3 }}>
                  {article.title}
                </h3>

                {article.body && (
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#4B5563', lineHeight: 1.6 }}>
                    {preview}
                  </p>
                )}

                {article.body?.length > 140 && (
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    style={{ marginTop: '8px', fontSize: '12.5px', fontWeight: 700, color: '#7C3AED', cursor: 'pointer' }}
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </div>
                )}

                <div style={{ fontSize: '11.5px', color: '#B4B4C0', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F8F8FA' }}>
                  Posted by {article.profiles?.full_name || 'PolyNet Admin'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: '20px' }} />
    </div>
  )
}

export default News