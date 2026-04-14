import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { CheckCircle, Package, ArrowRight, RotateCcw } from 'lucide-react'

export default function OrderConfirmed() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const order = state?.order

  // If no order data, redirect to orders page
  useEffect(() => {
    if (!order) navigate('/customer-orders', { replace: true })
  }, [order, navigate])

  if (!order) return null

  const items = order.items || []
  const totalBottles = items.reduce((s, i) =>
    s + (i.quantity_crates * (i.product_details?.crate_size || 24)) + i.quantity_bottles, 0)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background:'#07091A' }}>
      <div className="w-full max-w-lg">

        {/* Success animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background:'rgba(0,200,100,0.15)', border:'3px solid #00C864' }}>
            <CheckCircle size={48} style={{ color:'#00C864' }} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2"
            style={{ fontFamily:"'Poppins',sans-serif" }}>
            Order Placed! 🎉
          </h1>
          <p className="text-white/50 text-sm">
            Your order has been received. We'll process it shortly.
          </p>
        </div>

        {/* Order card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden mb-5"
          style={{ background:'rgba(255,255,255,0.04)' }}>

          {/* Order header */}
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background:'rgba(0,200,100,0.06)' }}>
            <div>
              <p className="text-white font-bold text-lg">Order #{order.id}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {new Date(order.order_date).toLocaleString('en-IN', {
                  day:'2-digit', month:'short', year:'numeric',
                  hour:'2-digit', minute:'2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-xl">
                ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background:'rgba(245,180,0,0.2)', color:'#F5B400' }}>
                {order.delivery_status}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-4">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
              Items Ordered ({totalBottles} bottles)
            </p>
            <div className="space-y-2">
              {items.map((item, i) => {
                const bottles = item.quantity_crates * (item.product_details?.crate_size || 24) + item.quantity_bottles
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {item.product_details?.product_name || `Product #${item.product}`}
                      </p>
                      <p className="text-white/40 text-xs">
                        {item.quantity_crates > 0 && `${item.quantity_crates} crate${item.quantity_crates > 1 ? 's' : ''}`}
                        {item.quantity_crates > 0 && item.quantity_bottles > 0 && ' + '}
                        {item.quantity_bottles > 0 && `${item.quantity_bottles} bottle${item.quantity_bottles > 1 ? 's' : ''}`}
                        {' · '}₹{parseFloat(item.price).toFixed(0)}/btl
                      </p>
                    </div>
                    <p className="text-white font-semibold text-sm">
                      ₹{(bottles * parseFloat(item.price)).toFixed(0)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* What's next */}
          <div className="px-5 py-4 border-t border-white/8"
            style={{ background:'rgba(30,111,255,0.05)' }}>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">What's Next</p>
            <div className="space-y-2">
              {[
                { icon:'✅', text:'Order confirmed by agency', done: true },
                { icon:'⚙️', text:'Being packed & prepared', done: false },
                { icon:'🚚', text:'Out for delivery', done: false },
                { icon:'🎉', text:'Delivered to your shop', done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base">{step.icon}</span>
                  <p className="text-xs" style={{ color: step.done ? '#00C864' : 'rgba(255,255,255,0.4)' }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link to="/customer-orders"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
            style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
            <Package size={15} /> Track Order
          </Link>
          <Link to="/catalog"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
            style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
            <RotateCcw size={15} /> Shop More
          </Link>
        </div>

        <Link to="/customer-dashboard"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white/40 text-xs hover:text-white hover:bg-white/8 transition-all border border-white/8">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
