import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import api from '../utils/api'

export default function AdminCredits() {
  const [data, setData]       = useState({ summary:{}, customers:[] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    if (!token) { navigate('/login'); return }
    api.get('/api/credit/')
      .then(res => setData(res.data || { summary:{}, customers:[] }))
      .catch(e => {
        if (e.response?.status === 401) { navigate('/login') }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = (data.customers || []).filter(c =>
    !search ||
    c.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#F5B400,#e0a000)' }}>
        <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    </div>
  )

  const s = data.summary || {}

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">💳 Credits & Udhari</span>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
              className="pl-3 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-44"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            <button onClick={() => { setLoading(true); load() }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#F5B400,#e0a000)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:'Total Customers',   value: s.total_customers ?? 0,                                    color:'#74b9ff', bg:'rgba(30,111,255,0.15)' },
            { label:'Exceeded Limit',    value: s.exceeded_count ?? 0,                                     color:'#ff6b6b', bg:'rgba(192,0,0,0.15)' },
            { label:'Total Outstanding', value:`₹${((s.total_outstanding ?? 0)/1000).toFixed(1)}K`,        color:'#fdcb6e', bg:'rgba(245,180,0,0.15)' },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-4 border border-white/10" style={{ background: c.bg }}>
              <p className="text-white/50 text-xs mb-1">{c.label}</p>
              <p className="font-bold text-2xl" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  {['Shop','Owner','Phone','Credit Limit','Used','Outstanding','%','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center">
                    <span className="text-4xl">💳</span>
                    <p className="text-white/20 text-sm mt-3">No credit data found</p>
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.customer_id} className={`border-b border-white/5 hover:bg-white/5 transition-all ${c.exceeded ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3"><p className="text-white font-medium">{c.shop_name}</p></td>
                    <td className="px-4 py-3 text-white/60">{c.owner_name}</td>
                    <td className="px-4 py-3 text-white/60">{c.phone}</td>
                    <td className="px-4 py-3 text-white/70">₹{parseFloat(c.credit_limit||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-white/70">₹{parseFloat(c.used_credit||0).toFixed(0)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: c.outstanding > 0 ? '#ff6b6b' : '#55efc4' }}>
                      ₹{parseFloat(c.outstanding||0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.1)' }}>
                          <div className="h-1.5 rounded-full" style={{ width:`${Math.min(c.utilisation_pct||0,100)}%`, background: c.exceeded ? '#ff6b6b' : '#00C864' }} />
                        </div>
                        <span className="text-white/40">{c.utilisation_pct||0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: c.exceeded ? 'rgba(192,0,0,0.15)' : 'rgba(0,200,100,0.15)', color: c.exceeded ? '#ff6b6b' : '#00C864' }}>
                        {c.exceeded ? '⚠️ Over' : '✅ OK'}
                      </span>
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
