import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search } from 'lucide-react'
import api from '../utils/api'
import { validateProductName, validateBrand, validateRate, validateExpiryDate, validateCrateSize } from '../utils/validators'

const SIZES = ['125ml','150ml','200ml','250ml','300ml','500ml','600ml','750ml','1L','1.25L','1.5L','1.75L','2L','2.25L','2.5L']

// ── ProductModal defined OUTSIDE the main component to avoid hooks-in-render bug ──
function ProductModal({ item, onClose, onSaved }) {
  const [nm, setNm] = useState(item?.product_name || '')
  const [br, setBr] = useState(item?.brand || '')
  const [sz, setSz] = useState(item?.bottle_size || '600ml')
  const [cs, setCs] = useState(String(item?.crate_size || 24))
  const [rt, setRt] = useState(String(item?.rate_per_bottle || ''))
  const [ex, setEx] = useState(item?.expiry_date || '')
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(item?.image_url || null)
  const [errs, setErrs] = useState({})
  const [saving, setSaving] = useState(false)

  const inp = 'w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none'
  const sty = (k) => ({ background: 'rgba(255,255,255,0.08)', border: `1px solid ${errs[k] ? '#C00000' : 'rgba(255,255,255,0.15)'}` })

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setErrs(p => ({ ...p, img: '' }))
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    const e = {
      nm: validateProductName(nm),
      br: validateBrand(br),
      rt: validateRate(rt),
      ex: validateExpiryDate(ex),
      cs: validateCrateSize(cs),
    }
    setErrs(e)
    if (Object.values(e).some(Boolean)) return

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('product_name', nm)
      fd.append('brand', br)
      fd.append('bottle_size', sz)
      fd.append('crate_size', parseInt(cs))
      fd.append('rate_per_bottle', parseFloat(rt))
      fd.append('expiry_date', ex)
      if (imgFile) fd.append('image', imgFile)
      const config = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (item?.id) await api.patch(`/api/products/${item.id}/`, fd, config)
      else          await api.post('/api/products/', fd, config)
      onSaved(item?.id ? '✅ Product updated' : '✅ Product added')
    } catch (err) {
      const d = err.response?.data
      const msg = d?.detail || d?.image?.[0] || d?.bottle_size?.[0] || d?.product_name?.[0] || JSON.stringify(d) || 'Failed'
      onSaved('❌ ' + msg, true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/15 p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: '#0d1b35' }} onClick={e => e.stopPropagation()}>
        <p className="text-white font-bold text-sm mb-4">{item ? '✏️ Edit Product' : '🥤 Add Product'}</p>
        <div className="space-y-3">
          <div>
            <label className="text-white/50 text-xs block mb-1">Product Name *</label>
            <input value={nm} onChange={e => { setNm(e.target.value); setErrs(p => ({ ...p, nm: '' })) }}
              className={inp} style={sty('nm')} placeholder="e.g. Coca-Cola 600ml" />
            {errs.nm && <p className="text-red-400 text-xs mt-1">⚠ {errs.nm}</p>}
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Brand *</label>
            <input value={br} onChange={e => { setBr(e.target.value); setErrs(p => ({ ...p, br: '' })) }}
              className={inp} style={sty('br')} placeholder="e.g. Coca-Cola" />
            {errs.br && <p className="text-red-400 text-xs mt-1">⚠ {errs.br}</p>}
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Bottle Size *</label>
            <select value={sz} onChange={e => setSz(e.target.value)} className={inp} style={sty('')}>
              {SIZES.map(o => <option key={o} value={o} style={{ background: '#0d1b35' }}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Crate Size *</label>
            <select value={cs} onChange={e => { setCs(e.target.value); setErrs(p => ({ ...p, cs: '' })) }}
              className={inp} style={sty('cs')}>
              {['12', '24', '30', '48'].map(o => <option key={o} value={o} style={{ background: '#0d1b35' }}>{o}</option>)}
            </select>
            {errs.cs && <p className="text-red-400 text-xs mt-1">⚠ {errs.cs}</p>}
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Rate per Bottle (₹) *</label>
            <input type="number" value={rt} onChange={e => { setRt(e.target.value); setErrs(p => ({ ...p, rt: '' })) }}
              className={inp} style={sty('rt')} placeholder="e.g. 20" min="0" />
            {errs.rt && <p className="text-red-400 text-xs mt-1">⚠ {errs.rt}</p>}
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Expiry Date *</label>
            <input type="date" value={ex} onChange={e => { setEx(e.target.value); setErrs(p => ({ ...p, ex: '' })) }}
              className={inp} style={sty('ex')} />
            {errs.ex && <p className="text-red-400 text-xs mt-1">⚠ {errs.ex}</p>}
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1">Product Image (optional)</label>
            <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer hover:opacity-80 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', minHeight: '80px' }}>
              {imgPreview
                ? <img src={imgPreview} alt="preview" className="h-20 object-contain rounded-xl p-1" />
                : <div className="flex flex-col items-center py-3 gap-1"><span className="text-2xl">📷</span><span className="text-white/40 text-xs">Click to upload image</span></div>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            {imgPreview && (
              <button onClick={() => { setImgFile(null); setImgPreview(null) }}
                className="text-red-400/60 hover:text-red-400 text-xs mt-1">✕ Remove image</button>
            )}
            {errs.img && <p className="text-red-400 text-xs mt-1">⚠ {errs.img}</p>}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#5b21b6)' }}>
            {saving ? 'Saving...' : item ? '✓ Update' : '+ Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const [toast, setToast]       = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    if (!token) { navigate('/login'); return }
    api.get('/api/products/catalog/')
      .then(res => setProducts(res.data || []))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSaved = (msg, isError = false) => {
    showToast(msg)
    if (!isError) { setModal(null); load() }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this product?')) return
    try { await api.delete(`/api/products/${id}/`); showToast('✅ Deleted'); load() }
    catch { showToast('❌ Failed') }
  }

  const filtered = products.filter(p =>
    !search ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#5b21b6)' }}>
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#07091A' }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background: '#0d1b35', border: '1px solid rgba(255,255,255,0.15)' }}>{toast}</div>
      )}

      {modal && (
        <ProductModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <span className="text-white font-bold text-sm">🥤 Products</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={() => setModal({ item: null })}
              className="px-4 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#5b21b6)' }}>+ Add Product</button>
            <button onClick={() => { setLoading(true); load() }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#7C3AED,#5b21b6)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-4 text-center py-12">
              <span className="text-4xl">🥤</span>
              <p className="text-white/20 text-sm mt-3">No products found</p>
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all group"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="h-24 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.product_name} className="h-20 object-contain" />
                  : <span className="text-4xl">🥤</span>}
              </div>
              <div className="p-3">
                <p className="text-white/50 text-xs">{p.brand}</p>
                <p className="text-white font-semibold text-sm truncate">{p.product_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-white font-bold text-sm">₹{parseFloat(p.rate_per_bottle || 0).toFixed(0)}<span className="text-white/30 text-xs">/btl</span></span>
                  <span className="text-white/40 text-xs">{p.bottle_size}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-white/30 text-xs">Stock: {p.available_stock || 0}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal({ item: p })}
                      className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">✏️</button>
                    <button onClick={() => del(p.id)}
                      className="px-2 py-1 rounded-lg text-xs border border-red-500/30 text-red-400/60 hover:text-red-400 transition-all">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
