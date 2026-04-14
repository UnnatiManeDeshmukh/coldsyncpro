import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, ArrowLeft, Plus, X, CheckCircle } from 'lucide-react'
import api from '../utils/api'
import { validateQuantity, validateSafeText } from '../utils/validators'
import { useTranslation } from 'react-i18next'

const STATUS_STYLE = {
  Pending:   { color:'#F5B400', bg:'rgba(245,180,0,0.15)' },
  Approved:  { color:'#00C864', bg:'rgba(0,200,100,0.15)' },
  Rejected:  { color:'#C00000', bg:'rgba(192,0,0,0.15)' },
  Completed: { color:'#1E6FFF', bg:'rgba(30,111,255,0.15)' },
}

export default function ReturnsPage() {
  const { t } = useTranslation()
  const [returns, setReturns]   = useState([])
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ order_id:'', reason:'Damaged', return_type:'Return', quantity_bottles:1, quantity_crates:0, refund_amount:'', notes:'' })
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/returns/'),
      api.get('/api/orders/customer/my-orders/'),
    ]).then(([r, o]) => {
      setReturns(r.data.results || r.data || [])
      setOrders(o.data.results || o.data || [])
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.order_id) { setError('Please select an order'); return }
    const qErr = validateQuantity(form.quantity_crates, form.quantity_bottles)
    if (qErr) { setError(qErr); return }
    if (form.notes) {
      const nErr = validateSafeText(form.notes, 'Notes')
      if (nErr) { setError(nErr); return }
    }
    setSubmitting(true); setError('')
    try {
      // Get customer id from order
      const order = orders.find(o => o.id === parseInt(form.order_id))
      await api.post('/api/returns/', {
        order: parseInt(form.order_id),
        customer: order?.customer || order?.customer_details?.id,
        reason: form.reason,
        return_type: form.return_type,
        quantity_crates: parseInt(form.quantity_crates) || 0,
        quantity_bottles: parseInt(form.quantity_bottles) || 0,
        refund_amount: parseFloat(form.refund_amount) || 0,
        notes: form.notes,
      })
      setSuccess(true)
      setShowForm(false)
      setForm({ order_id:'', reason:'Damaged', return_type:'Return', quantity_bottles:1, quantity_crates:0, refund_amount:'', notes:'' })
      load()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <svg className="animate-spin w-10 h-10" style={{ color:'#1E6FFF' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('returns.title')}</span>
          </div>
          <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
            style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
            <Plus size={13} /> {t('returns.newReturn')}
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-4 border" style={{ background:'rgba(0,200,100,0.1)', borderColor:'rgba(0,200,100,0.3)' }}>
            <CheckCircle size={18} style={{ color:'#00C864' }} />
            <p className="text-white text-sm font-medium">{t('returns.successMsg')}</p>
          </div>
        )}

        {returns.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">↩️</span>
            <p className="text-white/40 text-sm">{t('returns.noReturns')}</p>
            <button onClick={() => setShowForm(true)} className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all" style={{ background:'#1E6FFF' }}>
              {t('returns.submitReturn')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.Pending
              return (
                <div key={r.id} className="rounded-2xl p-4 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm">Return #{r.id}</span>
                        <span className="text-white/40 text-xs">· Order #{r.order}</span>
                      </div>
                      <p className="text-white/60 text-xs mb-1">Reason: <span className="text-white/80">{r.reason}</span> · Type: <span className="text-white/80">{r.return_type}</span></p>
                      {(r.quantity_crates > 0 || r.quantity_bottles > 0) && (
                        <p className="text-white/40 text-xs">{r.quantity_crates > 0 ? `${r.quantity_crates} crates` : ''} {r.quantity_bottles > 0 ? `${r.quantity_bottles} bottles` : ''}</p>
                      )}
                      {r.notes && <p className="text-white/40 text-xs mt-1 italic">"{r.notes}"</p>}
                      {r.admin_notes && <p className="text-xs mt-1" style={{ color:'#F5B400' }}>Admin: {r.admin_notes}</p>}
                    </div>
                    <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color }}>{r.status}</span>
                  </div>
                  <p className="text-white/20 text-xs mt-2">{new Date(r.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Return Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background:'#0d1b35' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold">{t('returns.newReturnTitle')}</h3>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            {error && <p className="text-red-400 text-xs mb-4 p-3 rounded-xl" style={{ background:'rgba(192,0,0,0.1)' }}>{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs mb-1.5">{t('returns.selectOrder')}</label>
                <select value={form.order_id} onChange={e => setForm({...form, order_id:e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} required>
                  <option value="">— {t('paynow.selectOrder')} —</option>
                  {orders.map(o => <option key={o.id} value={o.id}>Order #{o.id} — ₹{parseFloat(o.total_amount).toFixed(0)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('returns.reason')}</label>
                  <select value={form.reason} onChange={e => setForm({...form, reason:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                    {['Damaged','Wrong Item','Excess Delivery','Quality Issue','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('returns.returnType')}</label>
                  <select value={form.return_type} onChange={e => setForm({...form, return_type:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                    {['Return','Refund','Credit'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('returns.crates')}</label>
                  <input type="number" min="0" value={form.quantity_crates} onChange={e => setForm({...form, quantity_crates:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('returns.bottles')}</label>
                  <input type="number" min="0" value={form.quantity_bottles} onChange={e => setForm({...form, quantity_bottles:e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
                </div>
              </div>
              {(form.return_type === 'Refund' || form.return_type === 'Credit') && (
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">Refund / Credit Amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.refund_amount}
                    onChange={e => setForm({...form, refund_amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
                </div>
              )}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">{t('returns.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none resize-none"
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}
                  placeholder={t('returns.describeIssue')} />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {submitting ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : t('returns.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
