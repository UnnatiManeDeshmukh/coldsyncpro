import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Plus, Trash2, Edit2, X } from 'lucide-react'
import api from '../utils/api'

const ACCENTS = ['red','blue','gold','orange','purple','green']
const ACCENT_STYLE = {
  red:    { bg:'rgba(192,0,0,0.15)',    border:'rgba(192,0,0,0.4)',    text:'#ff6b6b' },
  blue:   { bg:'rgba(30,111,255,0.15)', border:'rgba(30,111,255,0.4)', text:'#74b9ff' },
  gold:   { bg:'rgba(245,180,0,0.15)',  border:'rgba(245,180,0,0.4)',  text:'#F5B400' },
  orange: { bg:'rgba(255,131,0,0.15)',  border:'rgba(255,131,0,0.4)',  text:'#FF8300' },
  purple: { bg:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.4)', text:'#a29bfe' },
  green:  { bg:'rgba(0,200,100,0.15)',  border:'rgba(0,200,100,0.4)',  text:'#00C864' },
}

const EMPTY_FORM = { title:'', description:'', tag:'', emoji:'🎁', accent:'gold', expires_at:'', is_active:true }
const today = new Date().toISOString().split('T')[0]

export default function AdminOffers() {
  const [offers, setOffers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'add' | 'edit'
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')
  const [errors, setErrors]   = useState({})
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    if (!token) { navigate('/login'); return }
    setLoading(true)
    api.get('/api/notifications/admin/offers/')
      .then(r => setOffers(r.data || []))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, expires_at: '' })
    setErrors({})
    setModal('add')
  }

  const openEdit = (o) => {
    setForm({
      title: o.title, description: o.description, tag: o.tag,
      emoji: o.emoji, accent: o.accent, expires_at: o.expires_at,
      is_active: o.is_active,
    })
    setErrors({})
    setModal({ type: 'edit', id: o.id })
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title = 'Title required'
    if (!form.description.trim()) e.description = 'Description required'
    if (!form.tag.trim())         e.tag = 'Tag required'
    if (!form.expires_at)         e.expires_at = 'Expiry date required'
    else if (form.expires_at < today) e.expires_at = 'Expiry must be in the future'
    return e
  }

  const save = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/api/notifications/admin/offers/', form)
        showToast('✅ Offer created')
      } else {
        await api.patch(`/api/notifications/admin/offers/${modal.id}/`, form)
        showToast('✅ Offer updated')
      }
      setModal(null)
      load()
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.error || 'Failed'))
    } finally { setSaving(false) }
  }

  const deleteOffer = async (id) => {
    if (!window.confirm('Delete this offer?')) return
    try {
      await api.delete(`/api/notifications/admin/offers/${id}/`)
      showToast('✅ Offer deleted')
      load()
    } catch { showToast('❌ Failed to delete') }
  }

  const toggleActive = async (o) => {
    try {
      await api.patch(`/api/notifications/admin/offers/${o.id}/`, { is_active: !o.is_active })
      setOffers(prev => prev.map(x => x.id === o.id ? { ...x, is_active: !o.is_active } : x))
    } catch { showToast('❌ Failed') }
  }

  const daysLeft = (exp) => {
    const d = Math.ceil((new Date(exp) - new Date()) / 86400000)
    return d <= 0 ? 'Expired' : `${d}d left`
  }

  const inp = 'w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none'
  const sty = (err) => ({ background:'rgba(255,255,255,0.08)', border:`1px solid ${err ? '#C00000' : 'rgba(255,255,255,0.15)'}` })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
        style={{ background:'linear-gradient(135deg,#FF8300,#F5B400)' }}>
        <span className="text-2xl">🎁</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A', fontFamily:'system-ui,sans-serif' }}>
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background:'#0d1b35', border:'1px solid rgba(255,255,255,0.15)' }}>{toast}</div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10"
        style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">🎁 Offers Management</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
              style={{ background:'linear-gradient(135deg,#FF8300,#F5B400)' }}>
              <Plus size={16} /> New Offer
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#FF8300,#F5B400,#00C864)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label:'Total Offers', value: offers.length, color:'#74b9ff' },
            { label:'Active', value: offers.filter(o=>o.is_active).length, color:'#00C864' },
            { label:'Expired', value: offers.filter(o=>new Date(o.expires_at)<new Date()).length, color:'#ff6b6b' },
          ].map((s,i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10 text-center"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              <p className="font-bold text-2xl" style={{ color:s.color }}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl">🎁</span>
            <p className="text-white/30 text-sm mt-4">No offers yet</p>
            <button onClick={openAdd}
              className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background:'linear-gradient(135deg,#FF8300,#F5B400)' }}>
              Create First Offer
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map(o => {
              const st = ACCENT_STYLE[o.accent] || ACCENT_STYLE.gold
              const expired = new Date(o.expires_at) < new Date()
              return (
                <div key={o.id} className="rounded-2xl p-5 border transition-all group relative"
                  style={{ background: st.bg, borderColor: st.border, opacity: expired ? 0.6 : 1 }}>
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(o)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all"
                      style={{ color: st.text }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteOffer(o.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-all text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{o.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: st.border, color: st.text }}>{o.tag}</span>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1">{o.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed mb-3 line-clamp-2">{o.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: expired ? '#ff6b6b' : 'rgba(255,255,255,0.4)' }}>
                      {expired ? '⚠️ Expired' : `⏰ ${daysLeft(o.expires_at)}`}
                    </span>
                    <button onClick={() => toggleActive(o)}
                      className="px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: o.is_active ? 'rgba(0,200,100,0.2)' : 'rgba(255,255,255,0.1)',
                        color: o.is_active ? '#00C864' : 'rgba(255,255,255,0.4)',
                      }}>
                      {o.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/15 p-6 max-h-[90vh] overflow-y-auto"
            style={{ background:'#0d1b35' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold">{modal === 'add' ? '🎁 New Offer' : '✏️ Edit Offer'}</h3>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-white/50 text-xs mb-1 block">Title *</label>
                <input value={form.title} onChange={e => { setForm(p=>({...p,title:e.target.value})); setErrors(p=>({...p,title:''})) }}
                  placeholder="e.g. Summer Sale — 10% Off" className={inp} style={sty(errors.title)} />
                {errors.title && <p className="text-red-400 text-xs mt-1">⚠ {errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="text-white/50 text-xs mb-1 block">Description *</label>
                <textarea value={form.description} onChange={e => { setForm(p=>({...p,description:e.target.value})); setErrors(p=>({...p,description:''})) }}
                  placeholder="Describe the offer details..." rows={3}
                  className={inp + ' resize-none'} style={sty(errors.description)} />
                {errors.description && <p className="text-red-400 text-xs mt-1">⚠ {errors.description}</p>}
              </div>

              {/* Tag + Emoji row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Tag *</label>
                  <input value={form.tag} onChange={e => { setForm(p=>({...p,tag:e.target.value})); setErrors(p=>({...p,tag:''})) }}
                    placeholder="e.g. SALE, NEW, HOT" className={inp} style={sty(errors.tag)} />
                  {errors.tag && <p className="text-red-400 text-xs mt-1">⚠ {errors.tag}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Emoji</label>
                  <input value={form.emoji} onChange={e => setForm(p=>({...p,emoji:e.target.value}))}
                    placeholder="🎁" className={inp} style={sty(false)} maxLength={4} />
                </div>
              </div>

              {/* Accent color */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">Accent Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENTS.map(a => {
                    const s = ACCENT_STYLE[a]
                    return (
                      <button key={a} onClick={() => setForm(p=>({...p,accent:a}))}
                        className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                        style={{
                          background: form.accent === a ? s.border : 'rgba(255,255,255,0.06)',
                          color: form.accent === a ? s.text : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${form.accent === a ? s.border : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        {a}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Expiry date */}
              <div>
                <label className="text-white/50 text-xs mb-1 block">Expiry Date *</label>
                <input type="date" value={form.expires_at} min={today}
                  onChange={e => { setForm(p=>({...p,expires_at:e.target.value})); setErrors(p=>({...p,expires_at:''})) }}
                  className={inp} style={sty(errors.expires_at)} />
                {errors.expires_at && <p className="text-red-400 text-xs mt-1">⚠ {errors.expires_at}</p>}
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-white/60 text-sm">Active (visible to customers)</span>
                <button onClick={() => setForm(p=>({...p,is_active:!p.is_active}))}
                  className="w-12 h-6 rounded-full transition-all relative"
                  style={{ background: form.is_active ? '#00C864' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: form.is_active ? '26px' : '2px' }} />
                </button>
              </div>

              {/* Preview */}
              {form.title && (
                <div className="rounded-xl p-3 border" style={{ background: ACCENT_STYLE[form.accent]?.bg, borderColor: ACCENT_STYLE[form.accent]?.border }}>
                  <p className="text-white/40 text-xs mb-1">Preview</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{form.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{form.title}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: ACCENT_STYLE[form.accent]?.border, color: ACCENT_STYLE[form.accent]?.text }}>
                        {form.tag || 'TAG'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-white/50 text-sm border border-white/15 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                style={{ background:'linear-gradient(135deg,#FF8300,#F5B400)' }}>
                {saving ? 'Saving...' : modal === 'add' ? 'Create Offer' : 'Update Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
