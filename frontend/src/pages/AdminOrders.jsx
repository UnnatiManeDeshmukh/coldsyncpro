import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search } from 'lucide-react'
import api from '../utils/api'
import { validatePhone } from '../utils/validators'
const PAY_ST = ['Pending','Partial','Paid']
const DEL_ST = ['Order Placed','Order Confirmed','Processing','Out for Delivery','Delivered','Cancelled']

export default function AdminOrders() {
  const [orders, setOrders]   = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkFile, setBulkFile]   = useState(null)
  const [bulkResult, setBulkResult] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/orders/list/?ordering=-order_date'),
      api.get('/api/orders/drivers/'),
    ]).then(([ord, drv]) => {
      setOrders(ord.data.results || ord.data || [])
      setDrivers(drv.data || [])
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleBulkImport = async () => {
    if (!bulkFile) return
    setBulkLoading(true)
    setBulkResult(null)
    const form = new FormData()
    form.append('file', bulkFile)
    try {
      const res = await api.post('/api/orders/bulk-import/', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBulkResult(res.data)
      if (res.data.created > 0) { load(); showToast(`✅ ${res.data.created} orders imported`) }
    } catch (e) {
      setBulkResult({ created: 0, errors: [e.response?.data?.error || 'Import failed'] })
    } finally { setBulkLoading(false) }
  }

  const updatePay = async (id, payment_status) => {
    setSaving(true)
    try {
      await api.post(`/api/orders/list/${id}/update_payment_status/`, { payment_status })
      setOrders(o => o.map(x => x.id === id ? { ...x, payment_status } : x))
      showToast('? Payment updated')
      setModal(null)
    } catch (e) {
      showToast('? ' + (e.response?.data?.error || 'Failed'))
    } finally { setSaving(false) }
  }

  const assignDriver = async (id, payload) => {
    setSaving(true)
    try {
      const res = await api.patch(`/api/orders/delivery/${id}/assign/`, payload)
      setOrders(o => o.map(x => x.id === id ? {
        ...x,
        delivery_status:       res.data.delivery_status,
        delivery_driver:       res.data.delivery_driver,
        delivery_driver_phone: res.data.delivery_driver_phone,
        delivery_vehicle:      res.data.delivery_vehicle,
      } : x))
      showToast('? Driver assigned & status updated')
      setModal(null)
    } catch (e) {
      showToast('? ' + (e.response?.data?.error || 'Failed'))
    } finally { setSaving(false) }
  }

  const filtered = orders.filter(o =>
    !search ||
    o.customer_details?.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_details?.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(o.id).includes(search)
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background:'#0d1b35', border:'1px solid rgba(255,255,255,0.15)' }}>
          {toast}
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBulkModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/15 p-5"
            style={{ background:'#0d1b35' }} onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-sm mb-1">📥 Bulk Import Orders</p>
            <p className="text-white/40 text-xs mb-4">Upload a CSV file to create multiple orders at once.</p>
            <div className="rounded-xl p-3 mb-4 text-xs" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white/60 font-semibold mb-1">Required CSV columns:</p>
              <p className="text-white/40 font-mono">customer_phone, product_id, quantity_crates, quantity_bottles, price, payment_status</p>
            </div>
            <input type="file" accept=".csv"
              onChange={e => { setBulkFile(e.target.files[0]); setBulkResult(null) }}
              className="w-full text-white/60 text-xs mb-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:text-white"
              style={{ '--file-bg':'rgba(192,0,0,0.3)' }} />
            {bulkResult && (
              <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: bulkResult.created > 0 ? 'rgba(0,200,100,0.1)' : 'rgba(192,0,0,0.1)', border:`1px solid ${bulkResult.created > 0 ? 'rgba(0,200,100,0.3)' : 'rgba(192,0,0,0.3)'}` }}>
                <p style={{ color: bulkResult.created > 0 ? '#00C864' : '#ff6b6b' }}>
                  ✅ {bulkResult.created} orders created
                </p>
                {bulkResult.errors?.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {bulkResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-red-400">⚠ {e}</p>
                    ))}
                    {bulkResult.errors.length > 5 && <p className="text-white/30">...and {bulkResult.errors.length - 5} more errors</p>}
                  </div>
                )}
              </div>
            )}
            <button onClick={handleBulkImport} disabled={!bulkFile || bulkLoading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
              {bulkLoading ? '⏳ Importing...' : '📥 Import Orders'}
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {modal?.type === 'pay' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-xs rounded-2xl border border-white/15 p-5" style={{ background:'#0d1b35' }} onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-sm mb-4">?? Payment � Order #{modal.id}</p>
            <div className="space-y-2">
              {PAY_ST.map(s => (
                <button key={s} onClick={() => updatePay(modal.id, s)} disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{ background: s==='Paid'?'#00C864':s==='Partial'?'#F5B400':'rgba(255,255,255,0.1)' }}>
                  {saving ? '...' : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delivery + Driver Assignment Modal */}
      {modal?.type === 'del' && (() => {
        const order = orders.find(o => o.id === modal.id) || {}
        const [driverId, setDriverId]     = React.useState('')
        const [driverName, setDriverName] = React.useState(order.delivery_driver || '')
        const [driverPhone, setDriverPhone] = React.useState(order.delivery_driver_phone || '')
        const [vehicle, setVehicle]       = React.useState(order.delivery_vehicle || '')
        const [delStatus, setDelStatus]   = React.useState(order.delivery_status || 'Order Placed')
        const [notes, setNotes]           = React.useState(order.delivery_notes || '')
        const [delErrs, setDelErrs]       = React.useState({})

        const onDriverSelect = (id) => {
          setDriverId(id)
          if (id) {
            const d = drivers.find(d => String(d.id) === String(id))
            if (d) {
              setDriverName(d.name)
              setDriverPhone(d.phone)
              setVehicle(d.vehicle_number || '')
            }
          }
        }

        const inp = 'w-full px-3 py-2 rounded-xl text-white text-xs focus:outline-none'
        const sty = { background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)' }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative w-full max-w-sm rounded-2xl border border-white/15 p-5 max-h-[90vh] overflow-y-auto"
              style={{ background:'#0d1b35' }} onClick={e => e.stopPropagation()}>
              <p className="text-white font-bold text-sm mb-1">?? Assign Delivery � Order #{modal.id}</p>
              <p className="text-white/40 text-xs mb-4">{order.customer_details?.shop_name} � ?{parseFloat(order.total_amount||0).toFixed(0)}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs block mb-1">Delivery Status</label>
                  <select value={delStatus} onChange={e => setDelStatus(e.target.value)} className={inp} style={sty}>
                    {DEL_ST.map(s => <option key={s} value={s} style={{ background:'#0d1b35' }}>{s}</option>)}
                  </select>
                </div>
                {drivers.length > 0 && (
                  <div>
                    <label className="text-white/50 text-xs block mb-1">Select Saved Driver</label>
                    <select value={driverId} onChange={e => onDriverSelect(e.target.value)} className={inp} style={sty}>
                      <option value="" style={{ background:'#0d1b35' }}>� Manual Entry �</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id} style={{ background:'#0d1b35' }}>
                          {d.name} — {d.phone}{d.vehicle_number ? ` — ${d.vehicle_number}` : ''} {d.is_available ? '✅' : '⚠️'} ({d.active_orders ?? 0} active)
                        </option>
                      ))}
                    </select>
                    {driverId && (() => {
                      const sel = drivers.find(d => String(d.id) === String(driverId))
                      return sel ? (
                        <p className="text-xs mt-1" style={{ color: sel.is_available ? '#00C864' : '#F5B400' }}>
                          {sel.is_available ? `✅ Available — ${sel.active_orders} active orders` : `⚠️ Busy — ${sel.active_orders} active orders`}
                        </p>
                      ) : null
                    })()}
                  </div>
                )}
                <div>
                  <label className="text-white/50 text-xs block mb-1">Driver Name</label>
                  <input value={driverName} onChange={e => { setDriverName(e.target.value); setDelErrs(p=>({...p,name:''})) }} placeholder="e.g. Ramesh Patil" className={inp} style={sty} />
                  {delErrs.name && <p className="text-red-400 text-xs mt-1">⚠ {delErrs.name}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Driver Phone</label>
                  <input value={driverPhone} onChange={e => { setDriverPhone(e.target.value); setDelErrs(p=>({...p,phone:''})) }} placeholder="e.g. 9876543210" className={inp} style={{ ...sty, border: `1px solid ${delErrs.phone ? '#C00000' : 'rgba(255,255,255,0.15)'}` }} />
                  {delErrs.phone && <p className="text-red-400 text-xs mt-1">⚠ {delErrs.phone}</p>}
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Vehicle Number</label>
                  <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="e.g. MH 12 AB 1234" className={inp} style={sty} />
                </div>
                <div>
                  <label className="text-white/50 text-xs block mb-1">Notes (optional)</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery instructions..." className={inp} style={sty} />
                </div>
                <button
                  onClick={() => {
                    const e = {}
                    if (driverPhone && validatePhone(driverPhone)) e.phone = validatePhone(driverPhone)
                    if (driverName && /^\d+$/.test(driverName.trim())) e.name = 'Driver name cannot be only numbers'
                    setDelErrs(e)
                    if (Object.keys(e).length) return
                    assignDriver(modal.id, {
                      driver_id:       driverId || undefined,
                      driver_name:     driverName,
                      driver_phone:    driverPhone,
                      vehicle_number:  vehicle,
                      delivery_status: delStatus,
                      delivery_notes:  notes,
                    })
                  }}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  style={{ background:'linear-gradient(135deg,#7C3AED,#5b21b6)' }}>
                  {saving ? 'Saving...' : '? Assign & Update'}
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
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">?? Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={() => { setLoading(true); load() }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => { setBulkModal(true); setBulkResult(null); setBulkFile(null) }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/10">
              📥 Bulk Import
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF,#7C3AED)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  {['#','Customer','Amount','Payment','Delivery','Driver','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center">
                    <span className="text-4xl">??</span>
                    <p className="text-white/20 text-sm mt-3">No orders found</p>
                  </td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-4 py-3 text-white/50 font-mono">#{o.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{o.customer_details?.shop_name || '�'}</p>
                      <p className="text-white/40">{o.customer_details?.owner_name}</p>
                    </td>
                    <td className="px-4 py-3 text-white font-bold">?{parseFloat(o.total_amount||0).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: o.payment_status==='Paid'?'rgba(0,200,100,0.15)':o.payment_status==='Partial'?'rgba(245,180,0,0.15)':'rgba(192,0,0,0.15)',
                        color: o.payment_status==='Paid'?'#00C864':o.payment_status==='Partial'?'#F5B400':'#ff6b6b'
                      }}>{o.payment_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: o.delivery_status==='Delivered'?'rgba(0,200,100,0.15)':o.delivery_status==='Cancelled'?'rgba(192,0,0,0.15)':o.delivery_status==='Out for Delivery'?'rgba(124,58,237,0.15)':'rgba(30,111,255,0.15)',
                        color: o.delivery_status==='Delivered'?'#00C864':o.delivery_status==='Cancelled'?'#ff6b6b':o.delivery_status==='Out for Delivery'?'#a78bfa':'#74b9ff'
                      }}>{o.delivery_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.delivery_driver ? (
                        <div>
                          <p className="text-white/70 font-medium">{o.delivery_driver}</p>
                          <p className="text-white/30">{o.delivery_driver_phone}</p>
                        </div>
                      ) : <span className="text-white/20">�</span>}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {o.order_date ? new Date(o.order_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '�'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setModal({type:'pay', id:o.id})}
                          className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all"
                          title="Update Payment">??</button>
                        <button onClick={() => setModal({type:'del', id:o.id})}
                          className="px-2 py-1 rounded-lg text-xs border border-purple-500/40 text-purple-400/70 hover:text-purple-300 transition-all"
                          title="Assign Driver">??</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
