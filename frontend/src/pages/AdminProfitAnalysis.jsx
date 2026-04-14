import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function AdminProfitAnalysis() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort]     = useState('profit_per_crate')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/analytics/profit-per-product/')
      .then(r => setData(r.data))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }, [token, navigate])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background:'linear-gradient(135deg,#F5B400,#ff6b6b)' }}>
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-white font-bold text-sm">Calculating Profit...</p>
      </div>
    </div>
  )

  const products  = [...(data?.products || [])].sort((a, b) => b[sort] - a[sort])
  const summary   = data?.summary || {}
  const maxProfit = Math.max(...products.map(p => p.profit_per_crate), 1)

  return (
    <div className="min-h-screen" style={{ background:'#07091A', fontFamily:'system-ui,sans-serif' }}>
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors text-lg">←</button>
            <span className="text-white font-bold text-sm">📊 Profit Per Crate Analysis</span>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#F5B400,#C00000,#00C864)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label:'Total Revenue', value:`₹${((summary.total_revenue||0)/1000).toFixed(1)}K`, color:'#00C864', icon:'💰' },
            { label:'Total Cost',    value:`₹${((summary.total_cost||0)/1000).toFixed(1)}K`,    color:'#ff6b6b', icon:'💸' },
            { label:'Total Profit',  value:`₹${((summary.total_profit||0)/1000).toFixed(1)}K`,  color:'#F5B400', icon:'📈' },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-1"><span>{c.icon}</span><span className="text-white/50 text-xs">{c.label}</span></div>
              <p className="font-bold text-2xl" style={{ color:c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-white/40 text-xs self-center">Sort by:</span>
          {[['profit_per_crate','📊 Profit/Crate'],['margin_percent','📉 Margin %'],['revenue','💰 Revenue'],['crates_sold','📦 Crates Sold']].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={sort===val ? {background:'#C00000',color:'#fff'} : {background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>
              {label}
            </button>
          ))}
        </div>

        {products.length > 0 && (
          <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
            <h3 className="text-white font-bold text-sm mb-4">Profit Per Crate — Visual</h3>
            <div className="space-y-3">
              {products.slice(0,10).map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70 font-medium">{p.brand} {p.bottle_size}</span>
                    <span className="text-white/50">₹{p.profit_per_crate.toFixed(0)}/crate · {p.margin_percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                    <div className="h-2 rounded-full" style={{
                      width:`${Math.max((p.profit_per_crate/maxProfit)*100,2)}%`,
                      background: p.profit_per_crate>0 ? `hsl(${i*35+100},65%,50%)` : '#ff6b6b',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.05)' }}>
                  {['Product','Brand','Size','Sell Price','Cost Price','Crates Sold','Revenue','Cost','Profit','Profit/Crate','Margin'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-white/50 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={11} className="text-center text-white/20 py-10">No sales data. Add purchase orders to see cost analysis.</td></tr>
                )}
                {products.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="px-3 py-3 text-white font-semibold">{p.product_name}</td>
                    <td className="px-3 py-3 text-white/70">{p.brand}</td>
                    <td className="px-3 py-3 text-white/50">{p.bottle_size}</td>
                    <td className="px-3 py-3 text-white/70">₹{p.selling_price}</td>
                    <td className="px-3 py-3 text-white/50">{p.avg_cost_price>0 ? `₹${p.avg_cost_price.toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-3 text-white/70">{p.crates_sold.toFixed(1)}</td>
                    <td className="px-3 py-3 font-semibold" style={{ color:'#00C864' }}>₹{(p.revenue/1000).toFixed(1)}K</td>
                    <td className="px-3 py-3" style={{ color:'#ff6b6b' }}>{p.total_cost>0 ? `₹${(p.total_cost/1000).toFixed(1)}K` : '—'}</td>
                    <td className="px-3 py-3 font-bold" style={{ color:p.profit>=0?'#F5B400':'#ff6b6b' }}>₹{(p.profit/1000).toFixed(1)}K</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full font-bold" style={{
                        background: p.profit_per_crate>0?'rgba(245,180,0,0.15)':'rgba(192,0,0,0.15)',
                        color: p.profit_per_crate>0?'#F5B400':'#ff6b6b',
                      }}>₹{p.profit_per_crate.toFixed(0)}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold" style={{ color:p.margin_percent>=15?'#00C864':p.margin_percent>=5?'#F5B400':'#ff6b6b' }}>
                      {p.margin_percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-white/20 text-xs text-center">Cost price is derived from purchase orders.</p>
      </div>
    </div>
  )
}
