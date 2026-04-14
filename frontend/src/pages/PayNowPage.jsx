import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, ArrowLeft, CheckCircle, Copy } from 'lucide-react'
import api from '../utils/api'
import { validateAmount, validateReference, validateSafeText } from '../utils/validators'
import { useTranslation } from 'react-i18next'
import { toast } from '../components/Toast'

export default function PayNowPage() {
  const { t } = useTranslation()
  const [upi, setUpi]           = useState(null)
  const [orders, setOrders]     = useState([])
  const [form, setForm]         = useState({ amount:'', reference_number:'', order_id:'', notes:'' })
  const [touched, setTouched]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)
  const [successData, setSuccessData] = useState(null)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setTouched(prev => ({ ...prev, [k]: true }))
  }
  const touch = (k) => () => setTouched(prev => ({ ...prev, [k]: true }))

  const fieldError = (k) => {
    if (!touched[k]) return ''
    switch (k) {
      case 'amount':           return validateAmount(form.amount)
      case 'reference_number': return validateReference(form.reference_number)
      case 'notes':            return form.notes ? validateSafeText(form.notes, 'Notes') : ''
      default: return ''
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([
      api.get('/api/billing/upi-config/'),
      api.get('/api/orders/customer/my-orders/'),
    ]).then(([u, o]) => {
      setUpi(u.data)
      const pending = (o.data.results || o.data || []).filter(x => x.payment_status !== 'Paid')
      setOrders(pending)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const copyUpi = () => {
    navigator.clipboard.writeText(upi?.upi_id || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate before submit
    const e1 = validateAmount(form.amount)
    const e2 = validateReference(form.reference_number)
    if (e1 || e2) {
      setTouched({ amount: true, reference_number: true })
      setError(e1 || e2)
      return
    }
    setSubmitting(true); setError('')
    try {
      const res = await api.post('/api/billing/pay-now/', {
        amount: parseFloat(form.amount),
        reference_number: form.reference_number,
        order_id: form.order_id || undefined,
        notes: form.notes,
      })
      setSuccessData(res.data)
      setSuccess(true)
      toast.success('Payment submitted successfully! 💳')
    } catch (err) {
      const msg = err.response?.data?.error || 'Payment submission failed.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

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
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('paynow.title')}</span>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {success ? (
          <div className="text-center py-16">
            <CheckCircle size={64} className="mx-auto mb-4" style={{ color:'#00C864' }} />
            <h2 className="text-white font-bold text-2xl mb-2">{t('paynow.success')} 🎉</h2>
            <p className="text-white/50 text-sm mb-2">{t('paynow.successMsg')}</p>

            {/* Verification status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold"
              style={{ background:'rgba(245,180,0,0.15)', color:'#F5B400', border:'1px solid rgba(245,180,0,0.3)' }}>
              ⏳ Payment pending admin verification
            </div>

            {/* Notification status */}
            <div className="inline-flex flex-col gap-1 text-left mb-5">
              {successData?.email_sent && <p className="text-xs" style={{ color:'#00C864' }}>✅ Confirmation email sent to you</p>}
              {successData?.whatsapp_sent && <p className="text-xs" style={{ color:'#00C864' }}>✅ WhatsApp message sent to you</p>}
              {successData?.sms_sent && <p className="text-xs" style={{ color:'#00C864' }}>✅ SMS sent to you</p>}
              {successData?.admin_notified && <p className="text-xs" style={{ color:'#00C864' }}>✅ Admin notified</p>}
            </div>

            {/* Admin WhatsApp button */}
            {successData?.admin_wa_link && (
              <div className="mb-5">
                <p className="text-white/40 text-xs mb-2">Notify admin on WhatsApp:</p>
                <a href={successData.admin_wa_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
                  style={{ background:'linear-gradient(135deg,#25D366,#128C7E)' }}>
                  Send to Admin on WhatsApp
                </a>
                <p className="text-white/25 text-xs mt-1">WhatsApp opens with payment details pre-filled</p>
              </div>
            )}

            <div className="flex gap-3 justify-center mt-2">
              <Link to="/payment-history" className="px-5 py-2 rounded-xl text-white text-sm font-bold" style={{ background:'#1E6FFF' }}>{t('paynow.viewHistory')}</Link>
              <Link to="/customer-dashboard" className="px-5 py-2 rounded-xl text-white/60 text-sm border border-white/20 hover:text-white transition-colors">{t('paynow.dashboard')}</Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* UPI QR Card */}
            <div className="rounded-2xl p-6 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
              <h3 className="text-white font-bold text-sm mb-4">{t('paynow.scanPay')}</h3>
              {/* Show uploaded QR or generate from UPI ID */}
              {upi?.qr_image_url ? (
                <img src={upi.qr_image_url} alt="UPI QR" className="w-52 h-52 mx-auto rounded-xl object-contain mb-4 bg-white p-2" />
              ) : upi?.upi_id ? (
                <div className="relative mx-auto mb-4" style={{ width:'208px', height:'208px' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upi.upi_id)}&pn=${encodeURIComponent(upi.upi_name || 'Shree Ganesh Agency')}&cu=INR`}
                    alt="UPI QR Code"
                    className="w-52 h-52 rounded-xl object-contain bg-white p-2"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                  />
                  <div className="w-52 h-52 rounded-xl items-center justify-center border border-white/10 absolute top-0 left-0" style={{ background:'rgba(255,255,255,0.06)', display:'none' }}>
                    <span className="text-5xl">📱</span>
                  </div>
                </div>
              ) : (
                <div className="w-52 h-52 mx-auto rounded-xl flex items-center justify-center mb-4 border border-white/10" style={{ background:'rgba(255,255,255,0.06)' }}>
                  <span className="text-5xl">📱</span>
                </div>
              )}
              <div className="text-center">
                <p className="text-white font-bold text-base mb-1">{upi?.upi_name || 'Shree Ganesh Agency'}</p>
                {upi?.bank_name && <p className="text-white/40 text-xs mb-3">{upi.bank_name}</p>}
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-white/10" style={{ background:'rgba(255,255,255,0.06)' }}>
                  <span className="text-white font-mono text-sm">{upi?.upi_id || '—'}</span>
                  <button onClick={copyUpi} className="text-white/40 hover:text-white transition-colors">
                    {copied ? <CheckCircle size={14} style={{ color:'#00C864' }} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-white/30 text-xs mt-2">Use PhonePe / GPay / Paytm</p>
              </div>
            </div>

            {/* Payment Form */}
            <div className="rounded-2xl p-6 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
              <h3 className="text-white font-bold text-sm mb-4">{t('paynow.submitDetails')}</h3>
              {error && <p className="text-red-400 text-xs mb-4 p-3 rounded-xl" style={{ background:'rgba(192,0,0,0.1)' }}>{error}</p>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('paynow.amount')}</label>
                  <input type="number" min="1" max="999999" step="0.01" value={form.amount}
                    onChange={set('amount')} onBlur={touch('amount')}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError('amount') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }}
                    placeholder="Enter amount" />
                  {fieldError('amount') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('amount')}</p>}
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('paynow.upiRef')}</label>
                  <input type="text" value={form.reference_number}
                    onChange={set('reference_number')} onBlur={touch('reference_number')}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError('reference_number') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }}
                    placeholder="e.g. 123456789012" />
                  {fieldError('reference_number') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('reference_number')}</p>}
                  <p className="text-white/25 text-xs mt-1">12-digit UTR number from your UPI app</p>
                </div>
                {orders.length > 0 && (
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5">{t('paynow.linkOrder')}</label>
                    <select value={form.order_id} onChange={e => setForm({...form, order_id:e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                      style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                      <option value="">{t('paynow.selectOrder')}</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>Order #{o.id} — ₹{parseFloat(o.total_amount).toFixed(0)} ({o.payment_status})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">{t('paynow.notes')}</label>
                  <input type="text" value={form.notes}
                    onChange={set('notes')} onBlur={touch('notes')}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError('notes') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }}
                    placeholder="Any additional info" maxLength={500} />
                  {fieldError('notes') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('notes')}</p>}
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                  style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                  {submitting ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : `💳 ${t('paynow.submit')}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
