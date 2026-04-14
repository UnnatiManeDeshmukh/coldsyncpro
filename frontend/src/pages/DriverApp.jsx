import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const STATUS_FLOW = [
  'Order Placed',
  'Order Confirmed',
  'Processing',
  'Out for Delivery',
  'Delivered',
]

const STATUS_COLOR = {
  'Order Placed':    { bg: 'rgba(116,185,255,0.15)', color: '#74b9ff' },
  'Order Confirmed': { bg: 'rgba(162,155,254,0.15)', color: '#a29bfe' },
  'Processing':      { bg: 'rgba(245,180,0,0.15)',   color: '#F5B400' },
  'Out for Delivery':{ bg: 'rgba(0,200,100,0.15)',   color: '#00C864' },
  'Delivered':       { bg: 'rgba(0,200,100,0.2)',    color: '#00C864' },
  'Cancelled':       { bg: 'rgba(192,0,0,0.15)',     color: '#ff6b6b' },
}

export default function DriverApp() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('active')
  const [expanded, setExpanded] = useState(null)
  const [driverName, setDriverName] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchOrders()
  }, [token])

  const fetchOrders = () => {
    setLoading(true)
    api.get('/api/orders/')
      .then(r => {
        const data = r.data?.results || r.data || []
        setOrders(data)
        // Try to get driver name from first assigned order
        const withDriver = data.find(o => o.delivery_driver || o.assigned_driver_details?.name)
        if (withDriver) {
          setDriverName(withDriver.delivery_driver || withDriver.assigned_driver_details?.name || '')
        }
      })
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId)
    try {
      await api.patch(`/api/orders/${orderId}/`, { delivery_status: newStatus })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_status: newStatus } : o))
    } catch (e) {
      alert('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  const shareRoute = (order) => {
    const msg =
      `🚚 *Delivery — Order #${order.id}*\n\n` +
      `🏪 Shop: ${order.customer_details?.shop_name || ''}\n` +
      `👤 Owner: ${order.customer_details?.owner_name || ''}\n` +
      `📞 Phone: ${order.customer_details?.phone || ''}\n` +
      `📍 Address: ${order.customer_details?.address || ''}, ${order.customer_details?.village || ''}\n\n` +
      `💰 Amount: ₹${order.total_amount} (${order.payment_status})\n` +
      `📦 Status: ${order.delivery_status}\n\n` +
      `— Shree Ganesh Agency`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const callCustomer = (phone) => {
    if (phone) window.open(`tel:${phone}`)
  }

  const filtered = orders.filter(o => {
    if (filter === 'active') return !['Delivered', 'Cancelled'].includes(o.delivery_status)
    if (filter === 'delivered') return o.delivery_status === 'Delivered'
    return true
  })

  const activeCount = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.delivery_status)).length
  const deliveredCount = orders.filter(o => o.delivery_status === 'Delivered').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg,#00C864,#00a050)' }}>
          <span className="text-2xl">🚚</span>
        </div>
        <p className="text-white font-bold text-sm">Loading deliveries...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')}
              className="text-white/60 hover:text-white transition-colors text-lg">←</button>
            <div>
              <p className="text-white font-bold text-sm">🚚 Driver App</p>
              {driverName && <p className="text-white/40 text-xs">{driverName}</p>}
            </div>
          </div>
          <button onClick={fetchOrders}
            className="text-white/50 hover:text-white text-xs px-3 py-1.5 rounded-xl border border-white/10 transition-all">
            ↻ Refresh
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#00C864,#1E6FFF,#F5B400)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', value: activeCount, color: '#F5B400', icon: '📦' },
            { label: 'Delivered', value: deliveredCount, color: '#00C864', icon: '✅' },
            { label: 'Total', value: orders.length, color: '#74b9ff', icon: '📋' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 border border-white/10 text-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-lg">{s.icon}</p>
              <p className="font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[['active', '📦 Active'], ['delivered', '✅ Delivered'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === val
                ? { background: '#00C864', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Order Cards */}
        {filtered.length === 0 && (
          <div className="rounded-2xl p-10 border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-white font-bold">No deliveries here</p>
            <p className="text-white/40 text-sm mt-1">
              {filter === 'active' ? 'All orders delivered!' : 'No orders found'}
            </p>
          </div>
        )}

        {filtered.map((order) => {
          const st = STATUS_COLOR[order.delivery_status] || STATUS_COLOR['Order Placed']
          const next = nextStatus(order.delivery_status)
          const isOpen = expanded === order.id
          const customer = order.customer_details || {}

          return (
            <div key={order.id} className="rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              {/* Card Header */}
              <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-all"
                onClick={() => setExpanded(isOpen ? null : order.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: 'rgba(0,200,100,0.2)', border: '1px solid rgba(0,200,100,0.3)' }}>
                    #{order.id}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{customer.shop_name || 'Shop'}</p>
                    <p className="text-white/40 text-xs">{customer.village || ''} · ₹{order.total_amount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: st.bg, color: st.color }}>
                    {order.delivery_status}
                  </span>
                  <span className="text-white/30 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded Details */}
              {isOpen && (
                <div className="border-t border-white/10 px-4 py-4 space-y-4">
                  {/* Customer Info */}
                  <div className="rounded-xl p-3 border border-white/8"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-white/50 text-xs font-semibold mb-2">CUSTOMER</p>
                    <p className="text-white text-sm font-semibold">{customer.shop_name}</p>
                    <p className="text-white/60 text-xs">{customer.owner_name}</p>
                    <p className="text-white/40 text-xs mt-1">📍 {customer.address}, {customer.village}</p>
                  </div>

                  {/* Items */}
                  {order.items?.length > 0 && (
                    <div>
                      <p className="text-white/50 text-xs font-semibold mb-2">ITEMS</p>
                      <div className="space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-white/70">
                              {item.product_details?.product_name} ({item.product_details?.brand})
                            </span>
                            <span className="text-white/50">
                              {item.quantity_crates > 0 && `${item.quantity_crates} crates`}
                              {item.quantity_crates > 0 && item.quantity_bottles > 0 && ' + '}
                              {item.quantity_bottles > 0 && `${item.quantity_bottles} btl`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Payment</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: order.payment_status === 'Paid' ? 'rgba(0,200,100,0.15)' : 'rgba(192,0,0,0.15)',
                        color: order.payment_status === 'Paid' ? '#00C864' : '#ff6b6b'
                      }}>
                      {order.payment_status} · ₹{order.total_amount}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => callCustomer(customer.phone)}
                      className="py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                      style={{ background: 'rgba(116,185,255,0.2)', border: '1px solid rgba(116,185,255,0.3)', color: '#74b9ff' }}>
                      📞 Call Customer
                    </button>
                    <button onClick={() => shareRoute(order)}
                      className="py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                      📲 WhatsApp
                    </button>
                  </div>

                  {/* Status Update */}
                  {next && order.delivery_status !== 'Cancelled' && (
                    <button
                      onClick={() => updateStatus(order.id, next)}
                      disabled={updating === order.id}
                      className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#00C864,#00a050)' }}>
                      {updating === order.id ? '⏳ Updating...' : `✅ Mark as "${next}"`}
                    </button>
                  )}

                  {order.delivery_status === 'Delivered' && (
                    <div className="text-center py-2">
                      <span className="text-green-400 text-sm font-semibold">✅ Delivered</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
