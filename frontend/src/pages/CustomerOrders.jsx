import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, ArrowLeft, Package, RefreshCw, Phone, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react'
import api from '../utils/api'
import { useTranslation } from 'react-i18next'
import { toast } from '../components/Toast'

const STEPS = [
  { key:'Order Placed',     label:'Order Placed',     icon:'📋', desc:'Your order has been received' },
  { key:'Order Confirmed',  label:'Confirmed',         icon:'✅', desc:'Order confirmed by agency' },
  { key:'Processing',       label:'Processing',        icon:'⚙️', desc:'Being packed & prepared' },
  { key:'Out for Delivery', label:'Out for Delivery',  icon:'🚚', desc:'Driver is on the way' },
  { key:'Delivered',        label:'Delivered',         icon:'🎉', desc:'Successfully delivered' },
]

const STATUS_COLOR = {
  'Order Placed':     '#F5B400',
  'Order Confirmed':  '#1E6FFF',
  'Processing':       '#7C3AED',
  'Out for Delivery': '#00D4FF',
  'Delivered':        '#00C864',
  'Cancelled':        '#C00000',
}

const PAY_COLOR = { Paid:'#00C864', Partial:'#F5B400', Pending:'#ff6b6b' }

export default function CustomerOrders() {
  const { t } = useTranslation()
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]     = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const pollRef = useRef(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = useCallback(async (silent = false) => {
    if (!token) { navigate('/login'); return }
    if (!silent) setLoading(true)
    try {
      const r = await api.get('/api/orders/customer/my-orders/')
      setOrders(r.data.results || r.data || [])
      setLastUpdated(new Date())
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token, navigate])

  const downloadInvoice = async (orderId) => {
    try {
      const res = await api.get(`/api/billing/invoices/by-order/${orderId}/download/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-order-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch (e) {
      if (e.response?.status === 404) {
        toast.warning('Invoice not found. It is generated after order confirmation.')
      } else {
        toast.error('Could not download invoice. Please try again.')
      }
    }
  }

  const cancelOrder = async (orderId) => {
    if (!window.confirm(`Cancel Order #${orderId}? Stock will be restored.`)) return
    setCancelling(orderId)
    try {
      await api.post(`/api/orders/customer/cancel/${orderId}/`)
      toast.success(`Order #${orderId} cancelled successfully.`)
      await load(true)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not cancel order. Please try again.')
    } finally {
      setCancelling(null)
    }
  }

  // Auto-poll: 15s when tab visible, pauses when hidden
  useEffect(() => {
    load()
    const INTERVAL = 15000
    const startPoll = () => {
      pollRef.current = setInterval(() => load(true), INTERVAL)
    }
    const stopPoll = () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    const onVisibility = () => {
      if (document.hidden) stopPoll()
      else { load(true); startPoll() }
    }
    startPoll()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopPoll()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  const filters = ['All', 'Active', 'Out for Delivery', 'Delivered', 'Cancelled']
  const filtered = orders.filter(o => {
    if (filter === 'All') return true
    if (filter === 'Active') return !['Delivered','Cancelled'].includes(o.delivery_status)
    return o.delivery_status === filter
  })

  const getStepIndex = (status) => STEPS.findIndex(s => s.key === status)

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
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('orders.title')}</span>
          </div>
          <span className="ml-auto text-white/40 text-xs">{orders.length} {t('orders.title').toLowerCase()}</span>
          {lastUpdated && (
            <span className="text-white/25 text-xs hidden sm:block">
              🔄 {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => { setLoading(true); load() }} className="text-white/40 hover:text-white transition-colors"><RefreshCw size={16} /></button>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF)' }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5" style={{ scrollbarWidth:'none' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: filter===f ? 'linear-gradient(135deg,#1E6FFF,#7C3AED)' : 'rgba(255,255,255,0.06)',
                color: filter===f ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${filter===f ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              }}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/40 text-lg mb-2">{t('orders.noOrders')}</p>
            <Link to="/catalog" className="inline-block mt-4 px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
              {t('orders.shopNow')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const statusColor = STATUS_COLOR[order.delivery_status] || '#F5B400'
              const payColor = PAY_COLOR[order.payment_status] || '#ff6b6b'
              const isOpen = expanded === order.id
              const stepIdx = getStepIndex(order.delivery_status)
              const isCancelled = order.delivery_status === 'Cancelled'
              const isDelivered = order.delivery_status === 'Delivered'
              const hasDriver = order.delivery_driver || order.delivery_driver_phone

              return (
                <div key={order.id} className="rounded-2xl border overflow-hidden transition-all"
                  style={{ background:'rgba(255,255,255,0.04)', borderColor: isOpen ? `${statusColor}40` : 'rgba(255,255,255,0.1)' }}>

                  {/* Order Header — click to expand */}
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : order.id)}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background:`${statusColor}20` }}>
                      {isCancelled ? '❌' : isDelivered ? '🎉' : order.delivery_status === 'Out for Delivery' ? '🚚' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-white font-bold text-sm">Order #{order.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background:`${statusColor}20`, color: statusColor }}>
                          {order.delivery_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-white/40 text-xs flex-wrap">
                        <span>{new Date(order.order_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                        <span>·</span>
                        <span style={{ color: payColor }}>{order.payment_status}</span>
                        <span>·</span>
                        <span className="text-white/60 font-semibold">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-white/30">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isOpen && (
                    <div className="border-t border-white/8 px-4 pb-4 pt-4 space-y-4">

                      {/* ── DELIVERY TRACKING TIMELINE ── */}
                      {!isCancelled && (
                        <div className="rounded-xl p-4 border border-white/8" style={{ background:'rgba(255,255,255,0.03)' }}>
                          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">{t('orders.deliveryTracking')}</p>
                          <div className="relative">
                            {STEPS.map((step, i) => {
                              const done = i <= stepIdx
                              const active = i === stepIdx
                              const color = done ? STATUS_COLOR[step.key] || '#00C864' : 'rgba(255,255,255,0.15)'
                              return (
                                <div key={step.key} className="flex items-start gap-3 mb-3 last:mb-0">
                                  {/* Circle + line */}
                                  <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                                      style={{
                                        background: done ? `${color}25` : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${done ? color : 'rgba(255,255,255,0.1)'}`,
                                        boxShadow: active ? `0 0 12px ${color}60` : 'none',
                                      }}>
                                      {done ? <span>{step.icon}</span> : <span className="text-white/20 text-xs">{i+1}</span>}
                                    </div>
                                    {i < STEPS.length - 1 && (
                                      <div className="w-0.5 h-6 mt-1 rounded-full transition-all"
                                        style={{ background: i < stepIdx ? color : 'rgba(255,255,255,0.08)' }} />
                                    )}
                                  </div>
                                  {/* Text */}
                                  <div className="pt-1">
                                    <p className="text-xs font-semibold" style={{ color: done ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                      {step.label}
                                      {active && <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background:`${color}25`, color }}>Current</span>}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: done ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)' }}>
                                      {step.desc}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── DRIVER INFO ── */}
                      {hasDriver && (
                        <div className="rounded-xl p-4 border" style={{ background:'rgba(0,212,255,0.06)', borderColor:'rgba(0,212,255,0.2)' }}>
                          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">{t('orders.deliveryDriver')}</p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                style={{ background:'linear-gradient(135deg,#00D4FF,#1E6FFF)' }}>
                                {order.delivery_driver?.[0]?.toUpperCase() || '🚚'}
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm">{order.delivery_driver || 'Driver Assigned'}</p>
                                {order.delivery_driver_phone && (
                                  <p className="text-white/50 text-xs">📱 {order.delivery_driver_phone}</p>
                                )}
                                {order.delivery_vehicle && (
                                  <p className="text-white/40 text-xs">🚗 {order.delivery_vehicle}</p>
                                )}
                              </div>
                            </div>
                            {/* Call + WhatsApp buttons */}
                            {order.delivery_driver_phone && (
                              <div className="flex gap-2 flex-shrink-0">
                                <a href={`tel:${order.delivery_driver_phone}`}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                                  style={{ background:'linear-gradient(135deg,#00C864,#00a050)' }}>
                                  <Phone size={13} /> {t('orders.call')}
                                </a>
                                <a href={`https://wa.me/${order.delivery_driver_phone.replace(/[^0-9]/g,'').replace(/^0/,'91')}`}
                                  target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                                  style={{ background:'linear-gradient(135deg,#25D366,#128C7E)' }}>
                                  💬 WhatsApp
                                </a>
                              </div>
                            )}
                          </div>
                          {order.delivery_notes && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <p className="text-white/40 text-xs">📝 Note: <span className="text-white/70">{order.delivery_notes}</span></p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── OUT FOR DELIVERY — no driver yet ── */}
                      {order.delivery_status === 'Out for Delivery' && !hasDriver && (
                        <div className="rounded-xl p-3 border border-yellow-500/20 text-center" style={{ background:'rgba(245,180,0,0.06)' }}>
                          <p className="text-yellow-400/80 text-xs">🚚 {t('orders.outForDelivery')}</p>
                        </div>
                      )}

                      {/* ── ESTIMATED DELIVERY ── */}
                      {order.estimated_delivery && !isDelivered && !isCancelled && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8" style={{ background:'rgba(255,255,255,0.03)' }}>
                          <Clock size={14} className="text-white/40 flex-shrink-0" />
                          <p className="text-white/60 text-xs">
                            {t('orders.estimatedDelivery')}: <span className="text-white font-semibold">
                              {new Date(order.estimated_delivery).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* ── ACTUAL DELIVERY ── */}
                      {order.actual_delivery && isDelivered && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-500/20" style={{ background:'rgba(0,200,100,0.06)' }}>
                          <CheckCircle size={14} style={{ color:'#00C864' }} className="flex-shrink-0" />
                          <p className="text-white/60 text-xs">
                            {t('orders.deliveredOn')}: <span className="text-white font-semibold">
                              {new Date(order.actual_delivery).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* ── ORDER ITEMS ── */}
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">{t('orders.itemsOrdered')}</p>
                        <div className="space-y-2">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/8"
                              style={{ background:'rgba(255,255,255,0.03)' }}>
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {item.product_details?.product_name || item.product_name || `Product #${item.product}`}
                                </p>
                                <p className="text-white/40 text-xs mt-0.5">
                                  {item.quantity_crates > 0 ? `${item.quantity_crates} crate${item.quantity_crates>1?'s':''}` : ''}
                                  {item.quantity_crates > 0 && item.quantity_bottles > 0 ? ' + ' : ''}
                                  {item.quantity_bottles > 0 ? `${item.quantity_bottles} bottle${item.quantity_bottles>1?'s':''}` : ''}
                                  {' · ₹'}{parseFloat(item.price).toFixed(0)}/btl
                                </p>
                              </div>
                              <p className="text-white font-semibold text-sm">₹{parseFloat(item.item_total || 0).toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── ORDER TOTAL + PAY NOW ── */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/8">
                        <div>
                          <p className="text-white/40 text-xs">{t('orders.totalAmount')}</p>
                          <p className="text-white font-bold text-lg">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {order.payment_status !== 'Paid' && (
                            <Link to="/pay-now"
                              className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                              style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                              💳 {t('dashboard.payNow')}
                            </Link>
                          )}
                          <button
                            onClick={() => downloadInvoice(order.id)}
                            className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                            style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
                            {t('orders.invoice')}
                          </button>
                          {isDelivered && (
                            <Link to="/returns"
                              className="px-4 py-2 rounded-xl text-white/60 text-xs font-semibold border border-white/15 hover:bg-white/10 transition-all">
                              {t('orders.return')}
                            </Link>
                          )}
                          {['Order Placed', 'Order Confirmed'].includes(order.delivery_status) && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={cancelling === order.id}
                              className="px-4 py-2 rounded-xl text-white/70 text-xs font-semibold border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                              style={{ color: '#ff6b6b' }}>
                              {cancelling === order.id ? '...' : '✕ Cancel'}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
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
