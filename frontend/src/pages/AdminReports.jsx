import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import api from '../utils/api'

export default function AdminReports() {
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/analytics/dashboard/'),
      api.get('/api/analytics/revenue-chart/'),
      api.get('/api/analytics/top-customers/'),
      api.get('/api/analytics/brand-sales/'),
    ]).then(([dashboard, revenue, topCust, brandSales]) => {
      setReports({
        summary: dashboard.data,
        revenue: revenue.data?.revenue_chart || [],
        topCust: topCust.data?.top_customers || [],
        brandSales: brandSales.data?.brand_sales || [],
      })
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }, [token, navigate])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#00D4FF,#0099FF)' }}>
          <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">Loading Reports...</p>
      </div>
    </div>
  )

  const maxRev = Math.max(...(reports.revenue||[]).map(r => r.revenue), 1)
  const maxBrand = Math.max(...(reports.brandSales||[]).map(b => b.total_revenue), 1)

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">📈 Reports</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin-report-builder')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
              🔧 Builder
            </button>
            <button onClick={() => {
              setLoading(true)
              Promise.all([
                api.get('/api/analytics/dashboard/'),
                api.get('/api/analytics/revenue-chart/'),
                api.get('/api/analytics/top-customers/'),
                api.get('/api/analytics/brand-sales/'),
              ]).then(([dashboard, revenue, topCust, brandSales]) => {
                setReports({
                  summary: dashboard.data,
                  revenue: revenue.data?.revenue_chart || [],
                  topCust: topCust.data?.top_customers || [],
                  brandSales: brandSales.data?.brand_sales || [],
                })
              }).finally(() => setLoading(false))
            }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#00D4FF,#0099FF)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
          <h3 className="text-white font-bold text-sm mb-4">📈 Revenue — Last 6 Months</h3>
          <div className="flex items-end gap-2 h-48">
            {(reports.revenue||[]).length === 0 ? (
              <p className="text-white/20 text-sm">No revenue data yet</p>
            ) : (reports.revenue||[]).map((r,i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-white/40 text-xs opacity-0 group-hover:opacity-100 transition-opacity">₹{(r.revenue/1000).toFixed(1)}K</span>
                <div className="w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer relative"
                  style={{ height:`${Math.max((r.revenue/maxRev)*160,4)}px`, background:'linear-gradient(180deg,#C00000,#8B0000)' }}>
                  <div className="absolute inset-0 rounded-t-lg opacity-30" style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.3),transparent)' }} />
                </div>
                <span className="text-white/40 text-xs">{r.month?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
          <h3 className="text-white font-bold text-sm mb-4">🏆 Top Customers</h3>
          <div className="space-y-3">
            {(reports.topCust||[]).slice(0,5).map((c,i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background:`hsl(${i*60+10},65%,40%)` }}>{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{c.shop_name}</p>
                  <p className="text-white/40 text-xs">{c.total_orders} orders</p>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color:'#00C864' }}>₹{(c.total_spent/1000).toFixed(1)}K</span>
              </div>
            ))}
            {!(reports.topCust||[]).length && <p className="text-white/20 text-xs text-center py-6">No orders yet</p>}
          </div>
        </div>

        {/* Brand Sales */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
          <h3 className="text-white font-bold text-sm mb-4">🥤 Brand Sales</h3>
          <div className="space-y-3">
            {(reports.brandSales||[]).slice(0,6).map((b,i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70 font-medium">{b.brand}</span>
                  <span className="text-white/40">₹{(b.total_revenue/1000).toFixed(1)}K · {b.order_count} orders</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width:`${(b.total_revenue/maxBrand)*100}%`, background:`hsl(${i*40},70%,50%)` }} />
                </div>
              </div>
            ))}
            {!(reports.brandSales||[]).length && <p className="text-white/20 text-xs text-center py-6">No sales data yet</p>}
          </div>
        </div>

        {/* Quick Links to new tools */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/admin-report-builder')}
            className="rounded-2xl p-5 border border-white/10 text-left hover:border-white/25 transition-all group"
            style={{ background:'rgba(30,111,255,0.06)' }}>
            <p className="text-2xl mb-2">🔧</p>
            <p className="text-white font-bold text-sm">Custom Report Builder</p>
            <p className="text-white/40 text-xs mt-1">Custom date range · PDF · Excel</p>
          </button>
          <button onClick={() => navigate('/admin-replenishment')}
            className="rounded-2xl p-5 border border-white/10 text-left hover:border-white/25 transition-all group"
            style={{ background:'rgba(245,180,0,0.06)' }}>
            <p className="text-2xl mb-2">⚡</p>
            <p className="text-white font-bold text-sm">Stock Replenishment</p>
            <p className="text-white/40 text-xs mt-1">Auto-create purchase orders</p>
          </button>
        </div>
      </div>
    </div>
  )
}
