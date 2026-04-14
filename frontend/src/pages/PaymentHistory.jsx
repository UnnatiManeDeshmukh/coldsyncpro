import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, ArrowLeft, CreditCard, TrendingUp, AlertCircle, Share2 } from 'lucide-react'
import api from '../utils/api'
import { useTranslation } from 'react-i18next'

export default function PaymentHistory() {
  const { t } = useTranslation()
  const [payments, setPayments]   = useState([])
  const [creditHistory, setCreditHistory] = useState(null)
  const [stats, setStats]         = useState(null)
  const [tab, setTab]             = useState('payments')
  const [loading, setLoading]     = useState(true)
  const [sharing, setSharing]     = useState(null)
  // Filters
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterFrom, setFilterFrom]     = useState('')
  const [filterTo, setFilterTo]         = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const shareInvoice = async (orderId) => {
    if (!orderId) return
    setSharing(orderId)
    try {
      const invRes = await api.get(`/api/billing/invoices/?order=${orderId}`)
      const invoices = invRes.data.results || invRes.data || []
      if (!invoices.length) { alert('No invoice found for this order.'); return }
      const inv = invoices[0]
      const shareRes = await api.get(`/api/billing/invoices/${inv.id}/share/`)
      window.open(shareRes.data.whatsapp_url, '_blank')
    } catch {
      alert('Could not load invoice share link.')
    } finally {
      setSharing(null)
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/billing/payments/'),
      api.get('/api/credit/my-history/'),
      api.get('/api/analytics/customer/dashboard/'),
    ]).then(([p, c, s]) => {
      setPayments(p.data.results || p.data || [])
      setCreditHistory(c.data)
      setStats(s.data)
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }, [])

  const METHOD_ICONS = { Cash:'💵', UPI:'📱', 'Bank Transfer':'🏦', Cheque:'📄', Credit:'💳' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <svg className="animate-spin w-10 h-10" style={{ color:'#1E6FFF' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('paymentHistory.title')}</span>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Credit summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t('paymentHistory.creditLimit'), value:`₹${(creditHistory?.credit_limit||0).toLocaleString('en-IN')}`,  color:'#00C864', icon:TrendingUp },
            { label: t('paymentHistory.outstanding'),  value:`₹${(creditHistory?.outstanding||0).toLocaleString('en-IN')}`,   color:'#C00000', icon:AlertCircle },
            { label: t('paymentHistory.totalPaid'),    value:`₹${(creditHistory?.total_paid||0).toLocaleString('en-IN')}`,    color:'#1E6FFF', icon:CreditCard },
          ].map(({ label, value, color, icon:Icon }) => (
            <div key={label} className="rounded-2xl p-4 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color }} />
                <p className="text-white/50 text-xs">{label}</p>
              </div>
              <p className="font-bold text-base" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[['payments', t('paymentHistory.payments')],['credits', t('paymentHistory.credits')]].map(([key,lbl]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === key ? 'linear-gradient(135deg,#1E6FFF,#7C3AED)' : 'rgba(255,255,255,0.06)',
                color: tab === key ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === key ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── FILTERS ── */}
        {tab === 'payments' && (
          <div className="flex flex-wrap gap-2 mb-5 p-3 rounded-2xl border border-white/8" style={{ background:'rgba(255,255,255,0.03)' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl text-white text-xs focus:outline-none"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
              <option value="All">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="px-3 py-2 rounded-xl text-white text-xs focus:outline-none"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', colorScheme:'dark' }}
              placeholder="From date" />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="px-3 py-2 rounded-xl text-white text-xs focus:outline-none"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', colorScheme:'dark' }}
              placeholder="To date" />
            {(filterStatus !== 'All' || filterFrom || filterTo) && (
              <button onClick={() => { setFilterStatus('All'); setFilterFrom(''); setFilterTo('') }}
                className="px-3 py-2 rounded-xl text-white/50 text-xs hover:text-white transition-colors border border-white/10">
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-3">
            {(() => {
              const filtered = payments.filter(p => {
                if (filterStatus !== 'All' && p.payment_method !== filterStatus) return false
                if (filterFrom && new Date(p.payment_date) < new Date(filterFrom)) return false
                if (filterTo && new Date(p.payment_date) > new Date(filterTo + 'T23:59:59')) return false
                return true
              })
              if (filtered.length === 0) return (
                <div className="text-center py-16">
                  <CreditCard size={40} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/40">{payments.length === 0 ? t('paymentHistory.noPayments') : 'No payments match your filters.'}</p>
                </div>
              )
              return filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:'rgba(0,200,100,0.15)' }}>
                  {METHOD_ICONS[p.payment_method] || '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{p.payment_method}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {new Date(p.payment_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    {p.reference_number && ` • Ref: ${p.reference_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-green-400 font-bold text-sm">+₹{parseFloat(p.amount).toLocaleString('en-IN')}</p>
                  {p.order && (
                    <button
                      onClick={() => shareInvoice(p.order)}
                      disabled={sharing === p.order}
                      title="Share Invoice via WhatsApp"
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}>
                      {sharing === p.order
                        ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        : <Share2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))
            })()}
          </div>
        )}

        {tab === 'credits' && (
          <div className="space-y-3">
            {/* Outstanding progress bar */}
            {creditHistory && (
              <div className="p-4 rounded-2xl border border-white/10 mb-4" style={{ background:'rgba(255,255,255,0.04)' }}>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{t('paymentHistory.creditUsed')}</span>
                  <span style={{ color: creditHistory.outstanding > creditHistory.credit_limit ? '#C00000' : '#F5B400' }}>
                    ₹{(creditHistory.total_due||0).toLocaleString('en-IN')} / ₹{(creditHistory.credit_limit||0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.1)' }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(creditHistory.credit_limit > 0 ? (creditHistory.total_due / creditHistory.credit_limit) * 100 : 0, 100)}%`,
                      background: creditHistory.outstanding > creditHistory.credit_limit ? '#C00000' : 'linear-gradient(90deg,#1E6FFF,#7C3AED)',
                    }} />
                </div>
              </div>
            )}

            {/* Transaction list */}
            {(creditHistory?.transactions || []).length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle size={40} className="mx-auto mb-3 text-white/20" />
                <p className="text-white/40">{t('paymentHistory.noCredits')}</p>
              </div>
            ) : (creditHistory?.transactions || []).map(tx => {
              const statusColor = tx.status === 'Paid' ? '#00C864' : tx.status === 'Partial' ? '#F5B400' : '#ff6b6b'
              return (
                <div key={tx.id} className="p-4 rounded-2xl border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {tx.invoice_number || `Credit #${tx.id}`}
                        {tx.order_id && <span className="text-white/40 text-xs ml-2">Order #{tx.order_id}</span>}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">{tx.created_at}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                      style={{ background: statusColor + '22', color: statusColor }}>{tx.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div className="p-2 rounded-xl text-center" style={{ background:'rgba(255,255,255,0.05)' }}>
                      <p className="text-white/40 mb-0.5">{t('paymentHistory.due')}</p>
                      <p className="text-white font-bold">₹{tx.amount_due.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-2 rounded-xl text-center" style={{ background:'rgba(0,200,100,0.08)' }}>
                      <p className="text-white/40 mb-0.5">{t('paymentHistory.paid')}</p>
                      <p className="font-bold" style={{ color:'#00C864' }}>₹{tx.amount_paid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-2 rounded-xl text-center" style={{ background:'rgba(255,107,107,0.08)' }}>
                      <p className="text-white/40 mb-0.5">{t('paymentHistory.remaining')}</p>
                      <p className="font-bold" style={{ color:'#ff6b6b' }}>₹{tx.remaining.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  {tx.payment_date && (
                    <p className="text-white/30 text-xs mt-2">💳 {t('paymentHistory.paidOn')}: {tx.payment_date}</p>
                  )}
                  {tx.notes && (
                    <p className="text-white/30 text-xs mt-1">📝 {tx.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
