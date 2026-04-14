import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pause, Play, Trash2, RefreshCw, Calendar } from 'lucide-react'
import api from '../utils/api'

const FREQ_LABELS = { weekly: 'Weekly', biweekly: 'Every 2 Weeks', monthly: 'Monthly' }
const STATUS_STYLE = {
  active:    { bg: 'rgba(0,200,100,0.15)',  color: '#00C864' },
  paused:    { bg: 'rgba(245,180,0,0.15)',  color: '#F5B400' },
  cancelled: { bg: 'rgba(192,0,0,0.15)',    color: '#ff6b6b' },
}

export default function CustomerSubscriptions() {
  const [subs, setSubs] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ frequency: 'monthly', next_order_date: '', notes: '', items: [] })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get('/api/subscriptions/'),
        api.get('/api/products/'),
      ])
      setSubs(s.data?.results || s.data || [])
      setProducts(p.data?.results || p.data || [])
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product: '', quantity_crates: 0, quantity_bottles: 0 }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, key, val) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }
  })

  const handleCreate = async () => {
    if (!form.next_order_date) return alert('Please set a start date.')
    if (!form.items.length) return alert('Add at least one product.')
    const invalidItem = form.items.find(i => !i.product)
    if (invalidItem) return alert('Please select a product for each item.')
    const hasQty = form.items.every(i => +i.quantity_crates > 0 || +i.quantity_bottles > 0)
    if (!hasQty) return alert('Each product must have quantity > 0.')

    setSaving(true)
    try {
      await api.post('/api/subscriptions/', {
        frequency: form.frequency,
        next_order_date: form.next_order_date,
        notes: form.notes || '',
        items: form.items.map(i => ({
          product: parseInt(i.product),
          quantity_crates: parseInt(i.quantity_crates) || 0,
          quantity_bottles: parseInt(i.quantity_bottles) || 0,
        })),
      })
      setShowForm(false)
      setForm({ frequency: 'monthly', next_order_date: '', notes: '', items: [] })
      load()
    } catch (e) {
      const err = e.response?.data
      const msg = typeof err === 'object'
        ? Object.values(err).flat().join('\n')
        : 'Failed to create subscription. Please try again.'
      alert(msg)
    } finally { setSaving(false) }
  }

  const togglePause = async (sub) => {
    const action = sub.status === 'active' ? 'pause' : 'resume'
    await api.post(`/api/subscriptions/${sub.id}/${action}/`)
    load()
  }

  const triggerNow = async (sub) => {
    try {
      const r = await api.post(`/api/subscriptions/${sub.id}/trigger_now/`)
      alert(`✅ Order #${r.data.order_id} created!`)
      load()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  const deleteSub = async (id) => {
    if (!confirm('Cancel this subscription?')) return
    await api.delete(`/api/subscriptions/${id}/`)
    load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="w-12 h-12 rounded-2xl animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C00000,#F5B400)' }}>
        <RefreshCw size={20} className="text-white animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/customer-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">🔄 My Subscriptions</span>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#C00000,#8B0000)' }}>
            <Plus size={14} /> New
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#C00000,#F5B400)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {subs.length === 0 && !showForm && (
          <div className="rounded-2xl p-10 border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-4xl mb-3">🔄</p>
            <p className="text-white font-bold mb-1">No subscriptions yet</p>
            <p className="text-white/40 text-sm mb-4">Set up auto-orders for your regular products</p>
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#C00000,#8B0000)' }}>
              + Create Subscription
            </button>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="rounded-2xl border border-white/15 p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-white font-bold text-sm">New Recurring Order</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs block mb-1">Frequency</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                  style={{ background: '#0d1b35' }}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 Weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">Start Date</label>
                <input type="date" value={form.next_order_date} onChange={e => setForm(f => ({ ...f, next_order_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                  style={{ background: '#0d1b35' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-xs">Products</label>
                <button onClick={addItem} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <Plus size={12} /> Add Product
                </button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs border border-white/15 outline-none"
                    style={{ background: '#0d1b35' }}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name} ({p.brand})</option>)}
                  </select>
                  <input type="number" min="0" placeholder="Crates" value={item.quantity_crates}
                    onChange={e => updateItem(i, 'quantity_crates', e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg text-white text-xs border border-white/15 outline-none text-center"
                    style={{ background: '#0d1b35' }} />
                  <input type="number" min="0" placeholder="Btls" value={item.quantity_bottles}
                    onChange={e => updateItem(i, 'quantity_bottles', e.target.value)}
                    className="w-14 px-2 py-1.5 rounded-lg text-white text-xs border border-white/15 outline-none text-center"
                    style={{ background: '#0d1b35' }} />
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 px-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {form.items.length === 0 && (
                <p className="text-white/25 text-xs text-center py-3">No products added yet</p>
              )}
            </div>

            <div>
              <label className="text-white/50 text-xs block mb-1">Notes (optional)</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Deliver before 10am"
                className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-xl text-white/50 text-xs border border-white/15 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {saving ? 'Creating...' : 'Create Subscription'}
              </button>
            </div>
          </div>
        )}

        {/* Subscription Cards */}
        {subs.map(sub => {
          const ss = STATUS_STYLE[sub.status] || STATUS_STYLE.active
          return (
            <div key={sub.id} className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">🔄 {FREQ_LABELS[sub.frequency]}</p>
                  <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> Next: {sub.next_order_date}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={ss}>{sub.status}</span>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {(sub.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-white/70 text-xs">{item.product_details?.product_name || `Product #${item.product}`}</span>
                    <span className="text-white/40 text-xs">{item.quantity_crates}cr + {item.quantity_bottles}bt</span>
                  </div>
                ))}
              </div>

              {sub.notes && <p className="text-white/30 text-xs italic">📝 {sub.notes}</p>}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => togglePause(sub)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-white/15 hover:bg-white/8 transition-all"
                  style={{ color: sub.status === 'active' ? '#F5B400' : '#00C864' }}>
                  {sub.status === 'active' ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                </button>
                {sub.status === 'active' && (
                  <button onClick={() => triggerNow(sub)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-white/15 hover:bg-white/8 transition-all text-blue-400">
                    <RefreshCw size={12} /> Order Now
                  </button>
                )}
                <button onClick={() => deleteSub(sub.id)}
                  className="px-3 py-2 rounded-xl text-xs border border-white/15 hover:bg-red-900/20 transition-all text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
