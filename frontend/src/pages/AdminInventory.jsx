import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search } from 'lucide-react'
import api from '../utils/api'


export default function AdminInventory() {
  const [inventory, setInventory] = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/inventory/'),
      api.get('/api/products/catalog/'),
    ]).then(([inv, prod]) => {
      setInventory(inv.data.results || inv.data || [])
      setProducts(prod.data || [])
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const updateStock = async (id, payload) => {
    setSaving(true)
    try {
      await api.patch(`/api/inventory/${id}/`, payload)
      showToast('✅ Stock updated'); setModal(null); load()
    } catch { showToast('❌ Failed') } finally { setSaving(false) }
  }

  const addStock = async (payload) => {
    setSaving(true)
    try {
      await api.post('/api/inventory/', payload)
      showToast('✅ Stock added'); setModal(null); load()
    } catch (e) { showToast('❌ ' + (e.response?.data?.detail || 'Failed')) } finally { setSaving(false) }
  }

  const filtered = inventory.filter(s =>
    !search ||
    s.product_details?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.product_details?.brand?.toLowerCase().includes(search.toLowerCase()) ||
    s.warehouse_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#00C864,#00a050)' }}>
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl" style={{ background:'#0d1b35', border:'1px solid rgba(255,255,255,0.15)' }}>{toast}</div>}

      {/* Edit Stock Modal */}
      {modal?.type==='edit' && (() => {
        const [cr, setCr] = React.useState(modal.item.total_crates||0)
        const [bt, setBt] = React.useState(modal.item.total_bottles||0)
        const [errs, setErrs] = React.useState({})
        const validate = () => {
          const e = {}
          if (isNaN(parseInt(cr)) || parseInt(cr) < 0) e.cr = 'Crates must be 0 or more'
          if (parseInt(cr) > 10000) e.cr = 'Crates cannot exceed 10,000'
          if (isNaN(parseInt(bt)) || parseInt(bt) < 0) e.bt = 'Bottles must be 0 or more'
          if (parseInt(bt) > 100000) e.bt = 'Bottles cannot exceed 1,00,000'
          setErrs(e)
          return Object.keys(e).length === 0
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative w-full max-w-sm rounded-2xl border border-white/15 p-5" style={{ background:'#0d1b35' }} onClick={e=>e.stopPropagation()}>
              <p className="text-white font-bold text-sm mb-1">🏭 Update Stock</p>
              <p className="text-white/40 text-xs mb-4">{modal.item.product_details?.product_name} · {modal.item.warehouse_name}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs block mb-1">Total Crates</label>
                  <input type="number" value={cr} onChange={e=>{setCr(parseInt(e.target.value)||0);setErrs(p=>({...p,cr:''}))}} min="0"
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.cr ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {errs.cr && <p className="text-red-400 text-xs mt-1">⚠ {errs.cr}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Total Bottles (loose)</label>
                  <input type="number" value={bt} onChange={e=>{setBt(parseInt(e.target.value)||0);setErrs(p=>({...p,bt:''}))}} min="0"
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.bt ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {errs.bt && <p className="text-red-400 text-xs mt-1">⚠ {errs.bt}</p>}
                </div>
                <button onClick={() => { if (validate()) updateStock(modal.item.id, {total_crates:cr, total_bottles:bt}) }} disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50" style={{ background:'#00C864' }}>
                  {saving ? 'Saving...' : '✓ Update Stock'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add Stock Modal */}
      {modal?.type==='add' && (() => {
        const [pid, setPid] = React.useState('')
        const [wh, setWh]   = React.useState('Main Warehouse')
        const [cr, setCr]   = React.useState('0')
        const [bt, setBt]   = React.useState('0')
        const [errs, setErrs] = React.useState({})
        const validate = () => {
          const e = {}
          if (!pid) e.pid = 'Please select a product'
          if (!wh.trim() || wh.trim().length < 2) e.wh = 'Warehouse name is required'
          if (isNaN(parseInt(cr)) || parseInt(cr) < 0) e.cr = 'Crates must be 0 or more'
          if (parseInt(cr) > 10000) e.cr = 'Crates cannot exceed 10,000'
          if (isNaN(parseInt(bt)) || parseInt(bt) < 0) e.bt = 'Bottles must be 0 or more'
          if (parseInt(bt) > 100000) e.bt = 'Bottles cannot exceed 1,00,000'
          setErrs(e)
          return Object.keys(e).length === 0
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative w-full max-w-sm rounded-2xl border border-white/15 p-5" style={{ background:'#0d1b35' }} onClick={e=>e.stopPropagation()}>
              <p className="text-white font-bold text-sm mb-4">🏭 Add New Stock</p>
              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs block mb-1">Product *</label>
                  <select value={pid} onChange={e=>{setPid(e.target.value);setErrs(p=>({...p,pid:''}))}}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.pid ? '#C00000' : 'rgba(255,255,255,0.15)'}` }}>
                    <option value="" style={{ background:'#0d1b35' }}>— Select Product —</option>
                    {products.map(p=><option key={p.id} value={p.id} style={{ background:'#0d1b35' }}>{p.brand} — {p.product_name} ({p.bottle_size})</option>)}
                  </select>
                  {errs.pid && <p className="text-red-400 text-xs mt-1">⚠ {errs.pid}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Warehouse</label>
                  <input value={wh} onChange={e=>{setWh(e.target.value);setErrs(p=>({...p,wh:''}))}}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.wh ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {errs.wh && <p className="text-red-400 text-xs mt-1">⚠ {errs.wh}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Crates</label>
                  <input type="number" value={cr} onChange={e=>{setCr(e.target.value);setErrs(p=>({...p,cr:''}))}} min="0"
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.cr ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {errs.cr && <p className="text-red-400 text-xs mt-1">⚠ {errs.cr}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Bottles (loose)</label>
                  <input type="number" value={bt} onChange={e=>{setBt(e.target.value);setErrs(p=>({...p,bt:''}))}} min="0"
                    className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${errs.bt ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {errs.bt && <p className="text-red-400 text-xs mt-1">⚠ {errs.bt}</p>}
                </div>
                <button onClick={() => { if (validate()) addStock({product:parseInt(pid), warehouse_name:wh, total_crates:parseInt(cr), total_bottles:parseInt(bt)}) }} disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50" style={{ background:'linear-gradient(135deg,#00C864,#00a050)' }}>
                  {saving ? 'Saving...' : '+ Add Stock'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <span className="text-white font-bold text-sm">🏭 Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={() => setModal({type:'add'})} className="px-4 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'linear-gradient(135deg,#00C864,#00a050)' }}>+ Add Stock</button>
            <button onClick={() => { setLoading(true); load() }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"><RefreshCw size={16} /></button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#00C864,#00a050)' }} />
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
              {['Product','Brand','Warehouse','Crates','Bottles','Status','Action'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center"><span className="text-4xl">🏭</span><p className="text-white/20 text-sm mt-3">No inventory data</p></td></tr>
              ) : filtered.map(s => {
                const low = s.total_crates <= 5
                return (
                  <tr key={s.id} className={`border-b border-white/5 hover:bg-white/5 transition-all ${low?'bg-red-500/5':''}`}>
                    <td className="px-4 py-3 text-white font-medium">{s.product_details?.product_name||'—'}</td>
                    <td className="px-4 py-3 text-white/60">{s.product_details?.brand||'—'}</td>
                    <td className="px-4 py-3 text-white/60">{s.warehouse_name||'Main'}</td>
                    <td className="px-4 py-3 text-white font-bold">{s.total_crates}</td>
                    <td className={`px-4 py-3 font-medium ${s.total_bottles < 0 ? 'text-red-400' : 'text-white/70'}`}>{s.total_bottles}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:low?'rgba(192,0,0,0.15)':'rgba(0,200,100,0.15)', color:low?'#ff6b6b':'#00C864' }}>{low?'⚠️ Low':'✅ OK'}</span></td>
                    <td className="px-4 py-3"><button onClick={() => setModal({type:'edit', item:s})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">✏️ Update</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
