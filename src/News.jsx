import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'
import { NewsSkeleton } from './Skeleton'

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
  const [isAdmin, setIsAdmin] = useState(true)

  useEffect(() => {
    fetchArticles()
  }, [])

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
      const { error: uploadErr } = await supabase.storage.from('news-images').upload(fileName, imageFile, { contentType: 'image/jpeg' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('news_articles').insert({ author_id: session.user.id, title, body, image_url: imageUrl })

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '18px 20px 16px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="PolyNet" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--app-accent)' }}>News</h1>
              <p style={{ marginTop: '1px', fontSize: '11px', color: 'var(--text-muted)' }}>Campus updates</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowComposer(v => !v)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--app-accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name={showComposer ? 'x' : 'plus'} size={18} />
            </button>
          )}
        </div>
      </div>

      {showComposer && (
        <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Headline..." style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)', boxSizing: 'border-box', outline: 'none', marginBottom: '10px' }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write the announcement..." rows={4} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--app-border-soft)', background: 'var(--input-bg)', resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }} />
          {imagePreview && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '14px' }} />
              <div onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="x" size={14} />
              </div>
            </div>
          )}
          <label style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--app-accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--app-accent)' }}>
            <Icon name="camera" size={16} />
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          </label>
          <button onClick={handlePost} disabled={posting || uploading || !title.trim()} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '14px', border: 'none', background: title.trim() ? 'var(--app-accent)' : 'var(--app-border-soft)', color: '#fff', fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default' }}>
            {uploading ? 'Processing...' : posting ? 'Publishing...' : 'Publish Article'}
          </button>
        </div>
      )}

      {loading ? <NewsSkeleton /> : (
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {articles.map(article => {
          const isExpanded = expandedId === article.id
          const preview = article.body?.length > 140 && !isExpanded ? article.body.slice(0, 140) + '...' : article.body

          return (
            <div key={article.id} style={{ background: 'var(--card-bg)', borderRadius: '22px', border: '1px solid var(--app-border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              {article.image_url && <img src={article.image_url} alt={article.title} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '999px', background: 'var(--app-accent-soft)', color: 'var(--app-accent)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="newspaper" size={10} />
                      ANNOUNCEMENT
                    </span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(article.created_at)}</span>
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)' }}>{article.title}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6 }}>{preview}</p>
                {article.body?.length > 140 && (
                  <div onClick={() => setExpandedId(isExpanded ? null : article.id)} style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: 'var(--app-accent)', cursor: 'pointer' }}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </div>
                )}
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--app-border)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Posted by {article.profiles?.full_name || 'PolyNet Admin'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

export default News