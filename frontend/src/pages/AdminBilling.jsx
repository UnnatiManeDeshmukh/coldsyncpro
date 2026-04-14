
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Search, CheckCircle, XCircle } from 'lucide-react'
import api from '../utils/api'
import { toast } from '../components/Toast'

export default function AdminBilling() {
  const [billing, setBilling] = useState({})
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState('invoices')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verifying, setVerifying] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/billing/summary/'),
      api.get('/api/billing/payments/?ordering=-payment_date'),
    ]).then(([summaryRes, paymentsRes]) => {
      const d = summaryRes.data || {}
      setBilling(d)
      setInvoices(d.invoices || [])
      setPayments(paymentsRes.data?.results || paymentsRes.data || [])
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    load()
  }, [token, navigate])

  const handleVerify = async (paymentId, action) => {
    setVerifying(paymentId)
    try {
      await api.post(`/api/billing/payments/${paymentId}/verify/`, { action })
      toast.success(`Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Action failed')
    } finally {
      setVerifying(null)
    }
  }

  const filteredInvoices = invoices.filter(i =>
    !search ||
    i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPayments = payments.filter(p =>
    !search ||
    p.customer_details?.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference_number?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = payments.filter(p => p.verification_status === 'pending' && p.payment_method === 'UPI').length

  const filtered = invoices.filter(i => 
    !search || 
    i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#F5B400,#FF8300)' }}>
          <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">Loading Billing...</p>
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
            <span className="text-white font-bold text-sm">🧾 Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            </div>
            <button onClick={load} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-2">
          {[
            { key:'invoices', label:'Invoices' },
            { key:'payments', label: pendingCount > 0 ? `UPI Payments (${pendingCount} pending)` : 'UPI Payments' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.key ? 'rgba(245,180,0,0.2)' : 'transparent',
                color: tab === t.key ? '#F5B400' : 'rgba(255,255,255,0.4)',
                border: tab === t.key ? '1px solid rgba(245,180,0,0.3)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#F5B400,#FF8300)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {billing.summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Total Invoices', value: billing.summary.total_invoices||0, color:'#74b9ff', bg:'rgba(30,111,255,0.15)' },
              { label:'Paid Total', value:`₹${((billing.summary.paid_total||0)/1000).toFixed(1)}K`, color:'#55efc4', bg:'rgba(0,200,100,0.15)' },
              { label:'Pending Total', value:`₹${((billing.summary.pending_total||0)/1000).toFixed(1)}K`, color:'#ff6b6b', bg:'rgba(192,0,0,0.15)' },
            ].map((c,i) => (
              <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background: c.bg }}>
                <p className="text-white/50 text-xs mb-1">{c.label}</p>
                <p className="font-bold text-2xl" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Invoices Tab */}
        {tab === 'invoices' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  {['Invoice #','Customer','Amount','GST','Method','Status','Date'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center">
                      <span className="text-4xl">🧾</span>
                      <p className="text-white/20 text-sm mt-3">No invoices found</p>
                    </td></tr>
                  ) : filteredInvoices.map(i => (
                    <tr key={i.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="px-4 py-3 text-white/50 font-mono">{i.invoice_number||'—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{i.customer_name||'—'}</p>
                        <p className="text-white/40 text-xs">{i.owner_name}</p>
                      </td>
                      <td className="px-4 py-3 text-white font-bold">₹{parseFloat(i.amount||i.total_amount||0).toFixed(0)}</td>
                      <td className="px-4 py-3 text-white/60">{i.gst_amount?`₹${parseFloat(i.gst_amount).toFixed(0)}`:'—'}</td>
                      <td className="px-4 py-3 text-white/60">{i.payment_method||'—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                          background: i.payment_status==='Paid'?'rgba(0,200,100,0.15)':i.payment_status==='Pending'?'rgba(245,180,0,0.15)':'rgba(192,0,0,0.15)',
                          color: i.payment_status==='Paid'?'#00C864':i.payment_status==='Pending'?'#F5B400':'#ff6b6b'
                        }}>{i.payment_status||'—'}</span>
                      </td>
                      <td className="px-4 py-3 text-white/40">{i.date ? new Date(i.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* UPI Payments Tab */}
        {tab === 'payments' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  {['#','Customer','Amount','Method','Reference','Verification','Date','Action'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center">
                      <span className="text-4xl">💳</span>
                      <p className="text-white/20 text-sm mt-3">No payments found</p>
                    </td></tr>
                  ) : filteredPayments.map(p => {
                    const vs = p.verification_status || 'pending'
                    const vsColor = vs==='verified'?'#00C864':vs==='rejected'?'#ff6b6b':'#F5B400'
                    const vsBg = vs==='verified'?'rgba(0,200,100,0.15)':vs==='rejected'?'rgba(192,0,0,0.15)':'rgba(245,180,0,0.15)'
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="px-4 py-3 text-white/40">#{p.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{p.customer_details?.shop_name || '—'}</p>
                          <p className="text-white/40">{p.customer_details?.owner_name}</p>
                        </td>
                        <td className="px-4 py-3 text-white font-bold">₹{parseFloat(p.amount||0).toFixed(0)}</td>
                        <td className="px-4 py-3 text-white/60">{p.payment_method}</td>
                        <td className="px-4 py-3 text-white/50 font-mono">{p.reference_number||'—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:vsBg, color:vsColor }}>
                            {vs === 'pending' ? '⏳ Pending' : vs === 'verified' ? '✅ Verified' : '❌ Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40">
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {vs === 'pending' && p.payment_method === 'UPI' ? (
                            <div className="flex gap-1">
                              <button
                                disabled={verifying === p.id}
                                onClick={() => handleVerify(p.id, 'verify')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                                style={{ background:'rgba(0,200,100,0.2)', color:'#00C864' }}>
                                <CheckCircle size={12} /> Verify
                              </button>
                              <button
                                disabled={verifying === p.id}
                                onClick={() => handleVerify(p.id, 'reject')}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                                style={{ background:'rgba(192,0,0,0.2)', color:'#ff6b6b' }}>
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
