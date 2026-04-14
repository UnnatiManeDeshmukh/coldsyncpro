import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../utils/api'

const STATUS_MAP = {
  Pending:   { bg: 'rgba(245,180,0,0.15)',  color: '#F5B400' },
  Approved:  { bg: 'rgba(0,200,100,0.15)',  color: '#00C864' },
  Rejected:  { bg: 'rgba(192,0,0,0.15)',    color: '#ff6b6b' },
  Completed: { bg: 'rgba(30,111,255,0.15)', color: '#74b9ff' },
}

const TABS = ['All', 'Pending', 'Approved', 'Completed', 'Rejected']

export default function AdminReturns() {
  const [returns, setReturns]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [saving, setSaving]     = useState(null)
  const [toast, setToast]       = useState('')
  const [expanded, setExpanded] = useState(null)
  const [notes, setNotes]       = useState({})   // { [id]: adminNoteText }
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = useCallback(async () => {
    if (!token) { navigate('/login'); return }
    try {
      const res = await api.get('/api/returns/?ordering=-created_at')
      setReturns(res.data.results || res.data || [])
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally { setLoading(false) }
  }, [token, navigate])

  useEffect(() => { load() }, [load])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const doAction = async (id, act) => {
    setSaving(id)
    try {
      await api.post(`/api/returns/${id}/${act}/`, { admin_notes: notes[id] || '' })
      showToast(`✅ Return ${act}d`)
      load()
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || 'Failed'))
    } finally { setSaving(null) }
  }

  const filtered = returns.filter(r => {
    const matchTab = tab === 'All' || r.status === tab
    const matchSearch = !search ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.order || '').includes(search) ||
      String(r.id).includes(search)
    return matchTab && matchSearch
  })

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === 'All' ? returns.length : returns.filter(r => r.status === t).length
    return acc
  }, {})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg,#FF6B6B,#C00000)' }}>
          <span className="text-2xl">↩️</span>
        </div>
        <p className="text-white font-bold text-sm">Loading Returns...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#07091A' }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background: '#0d1b35', border: '1px solid rgba(255,255,255,0.15)' }}>{toast}</div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'rgba(7,9,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">↩️ Returns Management</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer / order..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-52"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={() => { setLoading(true); load() }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#FF6B6B,#C00000)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: tab === t ? (t === 'Pending' ? '#F5B400' : t === 'Approved' ? '#00C864' : t === 'Rejected' ? '#C00000' : t === 'Completed' ? '#1E6FFF' : 'linear-gradient(135deg,#1E6FFF,#7C3AED)') : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === t ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              }}>
              {t} {counts[t] > 0 && <span className="ml-1 opacity-70">({counts[t]})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">↩️</span>
            <p className="text-white/20 text-sm mt-3">No returns found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.Pending
              const isOpen = expanded === r.id
              return (
                <div key={r.id} className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm">Return #{r.id}</span>
                        <span className="text-white/40 text-xs">· Order #{r.order}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: st.bg, color: st.color }}>{r.status}</span>
                        {r.return_type === 'Credit' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>Credit</span>
                        )}
                        {r.return_type === 'Refund' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(0,212,255,0.15)', color: '#67e8f9' }}>Refund</span>
                        )}
                      </div>
                      <p className="text-white/60 text-xs mt-0.5">
                        {r.customer_name || `Customer #${r.customer}`} · <span className="text-white/40">{r.reason}</span>
                        {(r.quantity_crates > 0 || r.quantity_bottles > 0) && (
                          <span className="text-white/30 ml-2">
                            {r.quantity_crates > 0 ? `${r.quantity_crates} crates` : ''}
                            {r.quantity_crates > 0 && r.quantity_bottles > 0 ? ' + ' : ''}
                            {r.quantity_bottles > 0 ? `${r.quantity_bottles} bottles` : ''}
                          </span>
                        )}
                      </p>
                    </div>

                    {r.refund_amount > 0 && (
                      <span className="text-white font-bold text-sm">₹{parseFloat(r.refund_amount).toLocaleString('en-IN')}</span>
                    )}

                    <span className="text-white/30 text-xs hidden sm:block">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </span>

                    <button onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded detail + actions */}
                  {isOpen && (
                    <div className="border-t border-white/8 px-4 py-4 space-y-3">
                      {r.notes && (
                        <p className="text-white/50 text-xs italic">Customer note: "{r.notes}"</p>
                      )}
                      {r.admin_notes && (
                        <p className="text-xs px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(245,180,0,0.08)', color: '#F5B400' }}>
                          Admin note: {r.admin_notes}
                        </p>
                      )}

                      {/* Admin note input for pending/approved */}
                      {(r.status === 'Pending' || r.status === 'Approved') && (
                        <div>
                          <label className="text-white/40 text-xs mb-1 block">Admin Note (optional)</label>
                          <input
                            value={notes[r.id] || ''}
                            onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                            placeholder="Add a note for the customer..."
                            className="w-full px-3 py-2 rounded-xl text-white text-xs focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {r.status === 'Pending' && (
                          <>
                            <button onClick={() => doAction(r.id, 'approve')} disabled={saving === r.id}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                              style={{ background: '#00C864' }}>
                              {saving === r.id ? '...' : '✓ Approve'}
                            </button>
                            <button onClick={() => doAction(r.id, 'reject')} disabled={saving === r.id}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                              style={{ background: '#C00000' }}>
                              {saving === r.id ? '...' : '✕ Reject'}
                            </button>
                          </>
                        )}
                        {r.status === 'Approved' && (
                          <button onClick={() => doAction(r.id, 'complete')} disabled={saving === r.id}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                            style={{ background: '#1E6FFF' }}>
                            {saving === r.id ? '...' : '✓ Mark Complete (Stock Re-added)'}
                          </button>
                        )}
                        {(r.status === 'Completed' || r.status === 'Rejected') && (
                          <span className="text-white/20 text-xs italic self-center">No further actions</span>
                        )}
                      </div>

                      {r.status === 'Pending' && r.return_type === 'Stock' && (r.quantity_crates > 0 || r.quantity_bottles > 0) && (
                        <p className="text-xs" style={{ color: 'rgba(245,180,0,0.7)' }}>
                          ℹ️ Approving will immediately re-add {r.quantity_crates > 0 ? `${r.quantity_crates} crates` : ''}{r.quantity_crates > 0 && r.quantity_bottles > 0 ? ' + ' : ''}{r.quantity_bottles > 0 ? `${r.quantity_bottles} bottles` : ''} to Main Warehouse stock.
                        </p>
                      )}
                      {r.status === 'Approved' && (r.quantity_crates > 0 || r.quantity_bottles > 0) && (
                        <p className="text-xs" style={{ color: 'rgba(0,200,100,0.6)' }}>
                          ℹ️ Completing will re-add {r.quantity_crates > 0 ? `${r.quantity_crates} crates` : ''}{r.quantity_crates > 0 && r.quantity_bottles > 0 ? ' + ' : ''}{r.quantity_bottles > 0 ? `${r.quantity_bottles} bottles` : ''} to Main Warehouse stock.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
