import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Zap, Package, AlertTriangle } from 'lucide-react'
import api from '../utils/api'

export default function AdminReplenishment() {
  const [alerts, setAlerts] = useState([])
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [threshold, setThreshold] = useState(5)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const loadAlerts = async () => {
    try {
      const [a, p] = await Promise.all([
        api.get('/api/inventory/alerts/'),
        api.get('/api/suppliers/purchase-orders/?ordering=-order_date&limit=20'),
      ])
      setAlerts(a.data?.alerts || [])
      setPos(p.data?.results || p.data || [])
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAlerts() }, [])

  const runAutoReplenish = async () => {
    setRunning(true)
    setResult(null)
    try {
      const r = await api.post('/api/inventory/auto-replenish/', { threshold_crates: threshold })
      setResult(r.data)
      loadAlerts()
    } catch (e) {
      setResult({ error: e.response?.data?.error || 'Failed to run auto-replenishment' })
    } finally { setRunning(false) }
  }

  const markReceived = async (poId) => {
    try {
      await api.post(`/api/suppliers/purchase-orders/${poId}/mark_received/`)
      loadAlerts()
    } catch { alert('Failed to mark received') }
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')

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
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">⚡ Stock Replenishment</span>
          </div>
          <button onClick={loadAlerts} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw size={15} />
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#C00000,#F5B400,#00C864)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Critical / Out of Stock', value: criticalAlerts.length, color: '#ff6b6b', icon: '🔴' },
            { label: 'Low Stock Warnings', value: warningAlerts.length, color: '#F5B400', icon: '🟡' },
            { label: 'Total Alerts', value: alerts.length, color: '#74b9ff', icon: '📦' },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{c.icon}</span>
                <span className="text-white/50 text-xs">{c.label}</span>
              </div>
              <p className="font-bold text-2xl" style={{ color: c.color, fontFamily: "'Poppins',sans-serif" }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Auto Replenish Control */}
        <div className="rounded-2xl p-5 border border-white/15 space-y-4" style={{ background: 'rgba(255,215,0,0.04)', borderColor: 'rgba(245,180,0,0.3)' }}>
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color: '#F5B400' }} />
            <p className="text-white font-bold text-sm">Auto Purchase Order Generator</p>
          </div>
          <p className="text-white/50 text-xs">Scans all products below threshold and auto-creates Purchase Orders from their last known supplier.</p>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">Threshold (crates)</label>
              <input type="number" min="1" max="50" value={threshold}
                onChange={e => setThreshold(+e.target.value)}
                className="w-24 px-3 py-2 rounded-xl text-white text-sm border border-white/15 outline-none text-center"
                style={{ background: '#0d1b35' }} />
            </div>
            <div className="flex-1" />
            <button onClick={runAutoReplenish} disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#F5B400,#C00000)' }}>
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
              {running ? 'Running...' : 'Run Auto-Replenish'}
            </button>
          </div>

          {result && !result.error && (
            <div className="rounded-xl p-4 border space-y-2" style={{ background: 'rgba(0,200,100,0.08)', borderColor: 'rgba(0,200,100,0.3)' }}>
              <p className="text-sm font-bold" style={{ color: '#00C864' }}>✅ {result.pos_created} Purchase Order(s) Created</p>
              {result.skipped_no_supplier?.length > 0 && (
                <p className="text-xs" style={{ color: '#F5B400' }}>⚠️ Skipped (no supplier): {result.skipped_no_supplier.join(', ')}</p>
              )}
              {(result.purchase_orders || []).map((po, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-white/70 border-t border-white/10 pt-2">
                  <span>PO #{po.po_id} — {po.product}</span>
                  <span>{po.supplier} · {po.crates_ordered} crates</span>
                  <span style={{ color: '#ff6b6b' }}>was {po.current_stock} crates</span>
                </div>
              ))}
            </div>
          )}
          {result?.error && (
            <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(192,0,0,0.15)', color: '#ff6b6b' }}>{result.error}</p>
          )}
        </div>

        {/* Alert List */}
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <AlertTriangle size={15} style={{ color: '#F5B400' }} />
            <p className="text-white font-bold text-sm">Stock Alerts</p>
          </div>
          {alerts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-white/40 text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-all">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.severity === 'critical' ? '#ff6b6b' : '#F5B400' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{a.product_name} <span className="text-white/40 font-normal">· {a.brand}</span></p>
                    <p className="text-white/40 text-xs">{a.message}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/50 text-xs">{a.warehouse}</p>
                    <p className="text-xs font-semibold" style={{ color: a.severity === 'critical' ? '#ff6b6b' : '#F5B400' }}>
                      {a.current_crates} crates
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchase Orders */}
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <Package size={15} style={{ color: '#74b9ff' }} />
            <p className="text-white font-bold text-sm">Recent Purchase Orders</p>
          </div>
          {pos.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-8">No purchase orders yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {pos.slice(0, 15).map((po, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold">PO #{po.id} — {po.supplier_name || po.supplier}</p>
                    <p className="text-white/40 text-xs">{po.notes?.slice(0, 60) || 'Purchase order'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white/50 text-xs">₹{parseFloat(po.total_amount || 0).toFixed(0)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: po.status === 'Received' ? 'rgba(0,200,100,0.15)' : po.status === 'Cancelled' ? 'rgba(192,0,0,0.15)' : 'rgba(245,180,0,0.15)',
                        color: po.status === 'Received' ? '#00C864' : po.status === 'Cancelled' ? '#ff6b6b' : '#F5B400',
                      }}>{po.status}</span>
                    {po.status === 'Pending' && (
                      <button onClick={() => markReceived(po.id)}
                        className="px-2 py-0.5 rounded-lg text-xs border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                        Mark Received
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
