import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const TREND_ICON = { rising: '📈', falling: '📉', stable: '➡️' }
const TREND_COLOR = { rising: '#00C864', falling: '#ff6b6b', stable: '#F5B400' }

export default function AdminForecast() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/analytics/demand-forecast/')
      .then(r => setData(r.data))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }, [token, navigate])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#C00000,#8B0000)' }}>
          <span className="text-2xl">🤖</span>
        </div>
        <p className="text-white font-bold text-sm">Running AI Forecast...</p>
      </div>
    </div>
  )

  const forecasts = data?.forecasts || []
  const filtered = filter === 'urgent'
    ? forecasts.filter(f => f.stock_needed > 0)
    : filter === 'rising'
    ? forecasts.filter(f => f.trend === 'rising')
    : forecasts

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors text-lg">←</button>
            <span className="text-white font-bold text-sm">🤖 AI Demand Forecast</span>
          </div>
          <div className="text-white/30 text-xs">{data?.forecast_month} · {data?.generated_at}</div>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#C00000,#F5B400,#00C864)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Products Tracked', value: forecasts.length, icon: '🥤', color: '#74b9ff' },
            { label: 'Need Restocking', value: forecasts.filter(f => f.stock_needed > 0).length, icon: '⚠️', color: '#ff6b6b' },
            { label: 'Rising Demand', value: forecasts.filter(f => f.trend === 'rising').length, icon: '📈', color: '#00C864' },
            { label: 'Falling Demand', value: forecasts.filter(f => f.trend === 'falling').length, icon: '📉', color: '#F5B400' },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{c.icon}</span>
                <span className="text-white/50 text-xs">{c.label}</span>
              </div>
              <p className="font-bold text-2xl" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[['all', 'All Products'], ['urgent', '⚠️ Needs Restock'], ['rising', '📈 Rising Demand']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === val
                ? { background: '#C00000', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Forecast Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {['Product', 'Brand', 'Size', 'Trend', 'Last 6 Months Sales', 'Predicted', 'In Stock', 'Need to Order', 'Crates to Buy'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-white/50 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-white/20 py-10">No forecast data available</td></tr>
                )}
                {filtered.map((f, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-3 py-3 text-white font-semibold">{f.product_name}</td>
                    <td className="px-3 py-3 text-white/70">{f.brand}</td>
                    <td className="px-3 py-3 text-white/50">{f.bottle_size}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1 font-semibold" style={{ color: TREND_COLOR[f.trend] }}>
                        {TREND_ICON[f.trend]} {f.trend}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-end gap-0.5 h-8">
                        {f.monthly_sales.map((s, j) => {
                          const max = Math.max(...f.monthly_sales, 1)
                          return (
                            <div key={j} className="flex-1 rounded-t"
                              style={{ height: `${Math.max((s / max) * 100, 4)}%`, background: j === 5 ? '#C00000' : 'rgba(255,255,255,0.2)' }}
                              title={`${s} bottles`} />
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold text-white">{f.predicted_demand}</td>
                    <td className="px-3 py-3">
                      <span style={{ color: f.current_stock < f.predicted_demand ? '#ff6b6b' : '#00C864' }}>
                        {f.current_stock}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {f.stock_needed > 0
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(192,0,0,0.2)', color: '#ff6b6b' }}>{f.stock_needed} bottles</span>
                        : <span className="text-white/30">OK</span>}
                    </td>
                    <td className="px-3 py-3">
                      {f.crates_to_order > 0
                        ? <span className="font-bold" style={{ color: '#F5B400' }}>{f.crates_to_order} crates</span>
                        : <span className="text-white/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-white/20 text-xs text-center">
          Forecast uses weighted moving average on last 6 months of sales data with seasonal adjustment.
        </p>
      </div>
    </div>
  )
}
