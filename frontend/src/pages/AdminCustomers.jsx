import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search } from 'lucide-react'
import api from '../utils/api'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/customers/?ordering=shop_name')
      .then(res => setCustomers(res.data.results || res.data || []))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }, [token, navigate])

  const filtered = customers.filter(c => 
    !search || 
    c.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
          <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">Loading Customers...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-bold text-sm">👥 Customers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={() => window.location.href = '/admin/customers/customer/add/'} className="px-4 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all" style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
              + Add Customer
            </button>
            <button onClick={() => {
              setLoading(true)
              api.get('/api/customers/?ordering=shop_name')
                .then(res => setCustomers(res.data.results || res.data || []))
                .finally(() => setLoading(false))
            }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#1E6FFF,#7C3AED,#E040FB)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <span className="text-4xl">👥</span>
              <p className="text-white/20 text-sm mt-3">No customers found</p>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all group" style={{ background:'rgba(255,255,255,0.03)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
                  {c.shop_name?.[0]?.toUpperCase()||'S'}
                </div>
                <a href={`/admin/customers/customer/${c.id}/change/`} target="_blank" className="text-xs text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100">Edit →</a>
              </div>
              <p className="text-white font-semibold text-sm">{c.shop_name}</p>
              <p className="text-white/50 text-xs">{c.owner_name}</p>
              <div className="flex items-center gap-3 mt-2 text-white/40 text-xs">
                <span>📱 {c.phone}</span>
                {c.village && <span>📍 {c.village}</span>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                <span className="text-white/40 text-xs">Credit Limit</span>
                <span className="text-white/70 text-xs font-bold">₹{parseFloat(c.credit_limit||0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
