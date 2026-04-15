import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Plus, Trash2, CheckCircle, ChevronDown, ChevronUp, Edit2, X } from 'lucide-react'
import api from '../utils/api'
import { validateSupplierName, validatePhone, validateEmail, validateAmount } from '../utils/validators'

const Badge = ({ val }) => {
  const map = {
    Pending:   { bg: 'rgba(245,180,0,0.15)',  color: '#F5B400' },
    Received:  { bg: 'rgba(0,200,100,0.15)',  color: '#00C864' },
    Cancelled: { bg: 'rgba(192,0,0,0.15)',    color: '#ff6b6b' },
  }
  const s = map[val] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>{val || '—'}</span>
  )
}

const EMPTY_ITEM = { product: '', quantity_crates: '0', quantity_bottles: '0', cost_per_bottle: '' }

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [pos, setPOs]             = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState('')
  const [modal, setModal]         = useState(null)   // { type, item? }
  const [saving, setSaving]       = useState(false)
  const [tab, setTab]             = useState('suppliers')
  const [expandedPO, setExpandedPO] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  // Supplier form
  const [fName, setFName]       = useState('')
  const [fContact, setFContact] = useState('')
  const [fPhone, setFPhone]     = useState('')
  const [fEmail, setFEmail]     = useState('')
  const [fAddr, setFAddr]       = useState('')
  const [fGst, setFGst]         = useState('')

  // PO form
  const [fPoSup, setFPoSup]     = useState('')
  const [fPoNotes, setFPoNotes] = useState('')
  const [poItems, setPoItems]   = useState([{ ...EMPTY_ITEM }])

  const [formErrs, setFormErrs] = useState({})

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    if (!token) { navigate('/login'); return }
    setLoading(true)
    try {
      const [supRes, poRes, prodRes] = await Promise.all([
        api.get('/api/suppliers/suppliers/'),
        api.get('/api/suppliers/purchase-orders/'),
        api.get('/api/products/'),
      ])
      setSuppliers(supRes.data?.results || supRes.data || [])
      setPOs(poRes.data?.results || poRes.data || [])
      setProducts(prodRes.data?.results || prodRes.data || [])
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }
    setLoading(false)
  }, [token, navigate])

  useEffect(() => { load() }, [load])

  const openAddSupplier = () => {
    setFName(''); setFContact(''); setFPhone(''); setFEmail(''); setFAddr(''); setFGst('')
    setFormErrs({})
    setModal({ type: 'add-supplier' })
  }

  const openEditSupplier = (s) => {
    setFName(s.name || ''); setFContact(s.contact_person || '')
    setFPhone(s.phone || ''); setFEmail(s.email || '')
    setFAddr(s.address || ''); setFGst(s.gst_number || '')
    setFormErrs({})
    setModal({ type: 'edit-supplier', item: s })
  }

  const openAddPO = (supplierId = '') => {
    setFPoSup(supplierId ? String(supplierId) : '')
    setFPoNotes('')
    setPoItems([{ ...EMPTY_ITEM }])
    setFormErrs({})
    setModal({ type: 'add-po' })
  }

  // ── PO item helpers ──
  const updatePoItem = (idx, field, val) => {
    setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }
  const addPoItem = () => setPoItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removePoItem = (idx) => setPoItems(prev => prev.filter((_, i) => i !== idx))

  // ── Compute PO total preview ──
  const poTotal = poItems.reduce((sum, it) => {
    const prod = products.find(p => String(p.id) === String(it.product))
    if (!prod) return sum
    const bottles = (parseInt(it.quantity_crates) || 0) * prod.crate_size + (parseInt(it.quantity_bottles) || 0)
    return sum + bottles * (parseFloat(it.cost_per_bottle) || 0)
  }, 0)

  // ── Save supplier (add or edit) ──
  const saveSupplier = async () => {
    const e = {}
    const ne = validateSupplierName(fName)
    const pe = validatePhone(fPhone)
    if (ne) e.fName = ne
    if (pe) e.fPhone = pe
    if (fEmail && validateEmail(fEmail)) e.fEmail = validateEmail(fEmail)
    if (fAddr && fAddr.trim().length < 5) e.fAddr = 'Address must be at least 5 characters'
    setFormErrs(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const payload = { name: fName, contact_person: fContact, phone: fPhone, email: fEmail, address: fAddr, gst_number: fGst }
    try {
      if (modal.type === 'edit-supplier') {
        await api.patch(`/api/suppliers/suppliers/${modal.item.id}/`, payload)
        showToast('✅ Supplier updated')
      } else {
        await api.post('/api/suppliers/suppliers/', payload)
        showToast('✅ Supplier added')
      }
      setModal(null); load()
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.phone?.[0] || err.response?.data?.name?.[0] || 'Failed'))
    }
    setSaving(false)
  }

  const deleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier? All linked POs will also be deleted.')) return
    try {
      await api.delete(`/api/suppliers/suppliers/${id}/`)
      showToast('✅ Supplier deleted'); load()
    } catch { showToast('❌ Failed to delete') }
  }

  // ── Create PO ──
  const addPO = async () => {
    const e = {}
    if (!fPoSup) e.fPoSup = 'Please select a supplier'
    poItems.forEach((it, idx) => {
      if (!it.product) e[`prod_${idx}`] = 'Select product'
      const priceErr = validateAmount(it.cost_per_bottle)
      if (priceErr) e[`price_${idx}`] = priceErr
      const cr = parseInt(it.quantity_crates) || 0
      const bt = parseInt(it.quantity_bottles) || 0
      if (cr === 0 && bt === 0) e[`qty_${idx}`] = 'Enter at least 1 crate or bottle'
    })
    setFormErrs(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await api.post('/api/suppliers/purchase-orders/', {
        supplier: fPoSup,
        notes: fPoNotes,
        items: poItems.map(it => ({
          product: it.product,
          quantity_crates: parseInt(it.quantity_crates) || 0,
          quantity_bottles: parseInt(it.quantity_bottles) || 0,
          cost_per_bottle: parseFloat(it.cost_per_bottle),
        })),
      })
      showToast('✅ Purchase Order created')
      setModal(null); load()
    } catch (err) {
      const d = err.response?.data
      let msg = 'Failed'
      if (d) {
        if (d.detail) msg = d.detail
        else if (d.non_field_errors) msg = d.non_field_errors[0]
        else if (d.items) {
          // items is array of per-item errors
          const itemErr = Array.isArray(d.items)
            ? d.items.map((e, i) => {
                if (!e || typeof e !== 'object') return null
                return Object.values(e).flat().join(', ')
              }).filter(Boolean).join(' | ')
            : JSON.stringify(d.items)
          msg = itemErr || 'Item validation failed'
        } else {
          const first = Object.entries(d)[0]
          if (first) msg = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`
        }
      }
      showToast('❌ ' + msg)
    }
    setSaving(false)
  }

  const markReceived = async (id) => {
    if (!window.confirm('Mark this PO as received? Stock will be updated automatically.')) return
    try {
      await api.post(`/api/suppliers/purchase-orders/${id}/mark_received/`)
      showToast('✅ PO received — inventory updated'); load()
    } catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Failed')) }
  }

  const cancelPO = async (id) => {
    if (!window.confirm('Cancel this PO?')) return
    try {
      await api.patch(`/api/suppliers/purchase-orders/${id}/`, { status: 'Cancelled' })
      showToast('✅ PO cancelled'); load()
    } catch { showToast('❌ Failed') }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg,#1E6FFF,#00C864)' }}>
          <span className="text-2xl">🏪</span>
        </div>
        <p className="text-white font-bold text-sm">Loading Suppliers...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#07091A' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background: '#0d1b35', border: '1px solid rgba(255,255,255,0.15)' }}>{toast}</div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">🏪 Suppliers & Purchase Orders</span>
          </div>
          <button onClick={load} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#1E6FFF,#00C864)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'suppliers', label: `🏪 Suppliers (${suppliers.length})` },
            { id: 'pos',       label: `📋 Purchase Orders (${pos.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? 'linear-gradient(135deg,#1E6FFF,#00C864)' : 'rgba(255,255,255,0.06)',
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === t.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SUPPLIERS TAB ── */}
        {tab === 'suppliers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">{suppliers.length} suppliers registered</p>
              <button onClick={openAddSupplier}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#1E6FFF,#00C864)' }}>
                <Plus size={16} /> Add Supplier
              </button>
            </div>

            {suppliers.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-5xl">🏪</span>
                <p className="text-white/20 text-sm mt-3">No suppliers yet</p>
                <button onClick={openAddSupplier}
                  className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#1E6FFF,#00C864)' }}>
                  Add First Supplier
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map(s => (
                  <div key={s.id} className="rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ background: 'linear-gradient(135deg,#1E6FFF,#00C864)' }}>
                        {s.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditSupplier(s)} className="text-blue-400/70 hover:text-blue-400 p-1">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteSupplier(s.id)} className="text-red-400/60 hover:text-red-400 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-white font-bold text-sm mb-1">{s.name}</p>
                    {s.contact_person && <p className="text-white/50 text-xs mb-2">👤 {s.contact_person}</p>}
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs">📱 {s.phone}</p>
                      {s.email && <p className="text-white/60 text-xs">✉️ {s.email}</p>}
                      {s.gst_number && <p className="text-white/40 text-xs">GST: {s.gst_number}</p>}
                      {s.address && <p className="text-white/40 text-xs truncate">📍 {s.address}</p>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/8">
                      <button onClick={() => { setTab('pos'); openAddPO(s.id) }}
                        className="w-full py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all">
                        + Create Purchase Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PURCHASE ORDERS TAB ── */}
        {tab === 'pos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">{pos.length} purchase orders</p>
              <button onClick={() => openAddPO()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg,#00C864,#1E6FFF)' }}>
                <Plus size={16} /> New PO
              </button>
            </div>

            {pos.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-5xl">📋</span>
                <p className="text-white/20 text-sm mt-3">No purchase orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pos.map(po => {
                  const isOpen = expandedPO === po.id
                  const supName = po.supplier_details?.name || suppliers.find(s => s.id === po.supplier)?.name || `Supplier #${po.supplier}`
                  return (
                    <div key={po.id} className="rounded-2xl border border-white/10 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {/* PO Row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-white/40 font-mono text-xs w-12">#{po.id}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{supName}</p>
                          <p className="text-white/40 text-xs">
                            {po.order_date ? new Date(po.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                            {' · '}{po.items?.length || 0} item(s)
                          </p>
                        </div>
                        <span className="text-white font-bold text-sm">₹{parseFloat(po.total_amount || 0).toLocaleString('en-IN')}</span>
                        <Badge val={po.status} />
                        <div className="flex gap-1 items-center">
                          {po.status === 'Pending' && (
                            <>
                              <button onClick={() => markReceived(po.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                                style={{ background: '#00C864' }}>
                                <CheckCircle size={12} /> Received
                              </button>
                              <button onClick={() => cancelPO(po.id)}
                                className="px-2 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10">
                                Cancel
                              </button>
                            </>
                          )}
                          <button onClick={() => setExpandedPO(isOpen ? null : po.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Items */}
                      {isOpen && (
                        <div className="border-t border-white/8 px-4 py-3">
                          {po.notes && (
                            <p className="text-white/40 text-xs mb-3 italic">📝 {po.notes}</p>
                          )}
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-white/30 uppercase tracking-wider">
                                <th className="text-left pb-2">Product</th>
                                <th className="text-right pb-2">Crates</th>
                                <th className="text-right pb-2">Bottles</th>
                                <th className="text-right pb-2">Cost/Bottle</th>
                                <th className="text-right pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(po.items || []).map((item, i) => (
                                <tr key={i} className="border-t border-white/5">
                                  <td className="py-2 text-white/80">
                                    {item.product_details?.product_name || `Product #${item.product}`}
                                    <span className="text-white/30 ml-1">({item.product_details?.brand})</span>
                                  </td>
                                  <td className="py-2 text-right text-white/60">{item.quantity_crates}</td>
                                  <td className="py-2 text-right text-white/60">{item.quantity_bottles}</td>
                                  <td className="py-2 text-right text-white/60">₹{parseFloat(item.cost_per_bottle).toFixed(2)}</td>
                                  <td className="py-2 text-right text-white font-semibold">₹{parseFloat(item.item_total || 0).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="rounded-2xl p-6 w-full border border-white/15 max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d1b35', maxWidth: modal.type === 'add-po' ? '560px' : '420px' }}>

            {/* ── Add / Edit Supplier ── */}
            {(modal.type === 'add-supplier' || modal.type === 'edit-supplier') && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-base">
                    {modal.type === 'edit-supplier' ? '✏️ Edit Supplier' : '🏪 Add Supplier'}
                  </h3>
                  <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Supplier Name *', val: fName, set: (v) => { setFName(v); setFormErrs(p=>({...p,fName:''})) }, placeholder: 'e.g. Hindustan Beverages', errKey: 'fName' },
                    { label: 'Contact Person',  val: fContact, set: setFContact, placeholder: 'e.g. Ramesh Patil', errKey: '' },
                    { label: 'Phone *',         val: fPhone, set: (v) => { setFPhone(v); setFormErrs(p=>({...p,fPhone:''})) }, placeholder: '9876543210', errKey: 'fPhone' },
                    { label: 'Email',           val: fEmail, set: (v) => { setFEmail(v); setFormErrs(p=>({...p,fEmail:''})) }, placeholder: 'supplier@email.com', errKey: 'fEmail' },
                    { label: 'Address',         val: fAddr,  set: (v) => { setFAddr(v);  setFormErrs(p=>({...p,fAddr:''}))  }, placeholder: 'Full address', errKey: 'fAddr' },
                    { label: 'GST Number',      val: fGst,   set: setFGst, placeholder: '27XXXXX', errKey: '' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${f.errKey && formErrs[f.errKey] ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                      {f.errKey && formErrs[f.errKey] && <p className="text-red-400 text-xs mt-1">⚠ {formErrs[f.errKey]}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-xl text-white/50 text-sm border border-white/15 hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={saveSupplier} disabled={saving}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#1E6FFF,#00C864)' }}>
                    {saving ? 'Saving...' : modal.type === 'edit-supplier' ? 'Update' : 'Add Supplier'}
                  </button>
                </div>
              </>
            )}

            {/* ── New Purchase Order ── */}
            {modal.type === 'add-po' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-base">📋 New Purchase Order</h3>
                  <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
                </div>

                {/* Supplier select */}
                <div className="mb-3">
                  <label className="text-white/50 text-xs mb-1 block">Supplier *</label>
                  <select value={fPoSup} onChange={e => { setFPoSup(e.target.value); setFormErrs(p=>({...p,fPoSup:''})) }}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${formErrs.fPoSup ? '#C00000' : 'rgba(255,255,255,0.12)'}` }}>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {formErrs.fPoSup && <p className="text-red-400 text-xs mt-1">⚠ {formErrs.fPoSup}</p>}
                </div>

                {/* Items */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white/50 text-xs">Products *</label>
                    <button onClick={addPoItem}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {poItems.map((it, idx) => {
                      const selProd = products.find(p => String(p.id) === String(it.product))
                      const itemBottles = (parseInt(it.quantity_crates) || 0) * (selProd?.crate_size || 0) + (parseInt(it.quantity_bottles) || 0)
                      const itemTotal = itemBottles * (parseFloat(it.cost_per_bottle) || 0)
                      return (
                        <div key={idx} className="rounded-xl p-3 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/40 text-xs">Item {idx + 1}</span>
                            {poItems.length > 1 && (
                              <button onClick={() => removePoItem(idx)} className="text-red-400/60 hover:text-red-400">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          {/* Product */}
                          <select value={it.product} onChange={e => updatePoItem(idx, 'product', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none mb-2"
                            style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${formErrs[`prod_${idx}`] ? '#C00000' : 'rgba(255,255,255,0.12)'}` }}>
                            <option value="">Select product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name} — {p.brand} ({p.bottle_size})</option>)}
                          </select>
                          {formErrs[`prod_${idx}`] && <p className="text-red-400 text-xs mb-2">⚠ {formErrs[`prod_${idx}`]}</p>}

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">Crates</label>
                              <input type="number" min="0" value={it.quantity_crates}
                                onChange={e => updatePoItem(idx, 'quantity_crates', e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg text-white text-sm focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${formErrs[`qty_${idx}`] ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                            </div>
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">Bottles</label>
                              <input type="number" min="0" value={it.quantity_bottles}
                                onChange={e => updatePoItem(idx, 'quantity_bottles', e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg text-white text-sm focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                            </div>
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">₹/Bottle</label>
                              <input type="number" min="0" step="0.01" value={it.cost_per_bottle}
                                onChange={e => updatePoItem(idx, 'cost_per_bottle', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 rounded-lg text-white text-sm focus:outline-none"
                                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${formErrs[`price_${idx}`] ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                            </div>
                          </div>
                          {formErrs[`qty_${idx}`] && <p className="text-red-400 text-xs mt-1">⚠ {formErrs[`qty_${idx}`]}</p>}
                          {formErrs[`price_${idx}`] && <p className="text-red-400 text-xs mt-1">⚠ {formErrs[`price_${idx}`]}</p>}
                          {selProd && itemTotal > 0 && (
                            <p className="text-white/30 text-xs mt-2 text-right">
                              {itemBottles} bottles × ₹{it.cost_per_bottle} = <span className="text-white/60 font-semibold">₹{itemTotal.toLocaleString('en-IN')}</span>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-3">
                  <label className="text-white/50 text-xs mb-1 block">Notes</label>
                  <textarea value={fPoNotes} onChange={e => setFPoNotes(e.target.value)}
                    rows={2} placeholder="Optional notes..."
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                </div>

                {/* Total preview */}
                {poTotal > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-4"
                    style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)' }}>
                    <span className="text-white/50 text-xs">Estimated Total</span>
                    <span className="text-green-400 font-bold text-sm">₹{poTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-xl text-white/50 text-sm border border-white/15 hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={addPO} disabled={saving}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#00C864,#1E6FFF)' }}>
                    {saving ? 'Creating...' : 'Create PO'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
