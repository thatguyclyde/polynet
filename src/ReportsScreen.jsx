import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Icon from './Icon'
import { getDisplayName } from './DisplayName'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function whatsappNotifyUrl(number, text) {
  return `whatsapp://send?phone=${number}&text=${encodeURIComponent(text)}`
}

const WHATSAPP_NUMBER = '263787525495'

function ReportsScreen({ onBack }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open') // 'open' | 'resolved' | 'all'

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('id, target_type, target_id, reason, context_preview, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name, is_admin, admin_title)')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching reports:', error.message)
    setReports(data || [])
    setLoading(false)
  }

  async function toggleResolved(report) {
    const nextStatus = report.status === 'open' ? 'resolved' : 'open'
    const { error } = await supabase.from('reports').update({ status: nextStatus }).eq('id', report.id)
    if (error) {
      console.error('Error updating report status:', error.message)
      return
    }
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: nextStatus } : r))
  }

  const filtered = reports.filter(r => filter === 'all' ? true : r.status === filter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ padding: '16px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-strong)' }}>
          <Icon name="arrowLeft" size={20} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-strong)', flex: 1 }}>Reports</span>
      </div>

      <div style={{ padding: '14px 20px 0', display: 'flex', gap: '6px' }}>
        {['open', 'resolved', 'all'].map(f => (
          <div
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', textTransform: 'capitalize',
              border: filter === f ? '1.5px solid var(--app-accent)' : '1.5px solid var(--app-border-soft)',
              background: filter === f ? 'var(--app-accent-soft)' : 'transparent',
              color: filter === f ? 'var(--app-accent)' : 'var(--text-muted)',
            }}
          >
            {f}
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px 40px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--app-accent)', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Icon name="flag" size={30} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '10px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>No {filter === 'all' ? '' : filter} reports.</p>
          </div>
        ) : (
          filtered.map(r => {
            const reporterName = getDisplayName(r.reporter, 'A user')
            const notifyText = `PolyNet report — ${r.target_type}: "${r.reason}"\n${r.context_preview ? `"${r.context_preview}"\n` : ''}Reported by ${reporterName} · ${timeAgo(r.created_at)}`
            return (
              <div key={r.id} style={{
                background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--app-border)',
                padding: '14px', marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px',
                      background: r.target_type === 'post' ? 'var(--app-accent-soft)' : 'rgba(29,155,240,0.14)',
                      color: r.target_type === 'post' ? 'var(--app-accent)' : '#1D9BF0',
                      textTransform: 'uppercase',
                    }}>
                      {r.target_type}
                    </span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-strong)', marginTop: '6px' }}>
                      {r.reason}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
                    background: r.status === 'open' ? 'rgba(239,68,68,0.12)' : 'rgba(22,163,74,0.12)',
                    color: r.status === 'open' ? '#EF4444' : '#16A34A',
                    flexShrink: 0,
                  }}>
                    {r.status === 'open' ? 'Open' : 'Resolved'}
                  </span>
                </div>

                {r.context_preview && (
                  <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: 'var(--text-body)', lineHeight: 1.5, background: 'var(--input-bg)', padding: '8px 10px', borderRadius: '10px' }}>
                    "{r.context_preview}"
                  </p>
                )}

                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Reported by {reporterName} · {timeAgo(r.created_at)}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <a
                    href={whatsappNotifyUrl(WHATSAPP_NUMBER, notifyText)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '9px', borderRadius: '10px', textDecoration: 'none',
                      background: 'rgba(37,211,102,0.14)', color: '#25D366', fontWeight: 700, fontSize: '12px',
                    }}
                  >
                    <Icon name="whatsapp" size={14} color="#25D366" />
                    Notify Me
                  </a>
                  <button
                    onClick={() => toggleResolved(r)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '10px', border: 'none',
                      background: r.status === 'open' ? 'var(--app-accent)' : 'var(--app-border-soft)',
                      color: r.status === 'open' ? '#fff' : 'var(--text-strong)',
                      fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {r.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

export default ReportsScreen