import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../utils/api'

export default function DeliverySlip() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const printRef = useRef()

  useEffect(() => {
    if (!orderId) { setError('No order ID provided'); setLoading(false); return }
    api.get(`/api/orders/list/${orderId}/`)
      .then(r => setOrder(r.data))
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false))
  }, [orderId])

  const handlePrint = () => window.print()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-gray-500">Loading delivery slip...</p>
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
        <Link to="/admin-dashboard" className="text-blue-600 underline">← Back to Dashboard</Link>
      </div>
    </div>
  )

  const items = order.items || []
  const totalBottles = items.reduce((s, i) => s + (i.quantity_crates * (i.product_details?.crate_size || 24) + i.quantity_bottles), 0)

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print flex gap-3 p-4 bg-gray-100 border-b">
        <button onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          🖨️ Print Slip
        </button>
        <Link to="/admin-dashboard"
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
          ← Back
        </Link>
      </div>

      {/* Printable slip */}
      <div ref={printRef} className="delivery-slip bg-white max-w-2xl mx-auto p-8 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shree Ganesh Agency</h1>
            <p className="text-sm text-gray-600">Modnimb, Solapur District, Maharashtra - 413226</p>
            <p className="text-sm text-gray-600">📱 +91 9822851017</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-800">DELIVERY SLIP</p>
            <p className="text-2xl font-bold text-blue-700">Order #{order.id}</p>
            <p className="text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
          </div>
        </div>

        {/* Customer + Delivery Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deliver To</p>
            <p className="font-bold text-gray-900 text-lg">{order.customer_details?.shop_name || '—'}</p>
            <p className="text-gray-700">{order.customer_details?.owner_name}</p>
            <p className="text-gray-600 text-sm">📱 {order.customer_details?.phone}</p>
            <p className="text-gray-600 text-sm mt-1">📍 {order.customer_details?.address}</p>
            {order.customer_details?.village && (
              <p className="text-gray-600 text-sm">🏘️ {order.customer_details.village}</p>
            )}
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery Details</p>
            {order.delivery_driver && (
              <>
                <p className="text-sm"><span className="font-semibold">Driver:</span> {order.delivery_driver}</p>
                {order.delivery_driver_phone && <p className="text-sm">📱 {order.delivery_driver_phone}</p>}
                {order.delivery_vehicle && <p className="text-sm">🚗 {order.delivery_vehicle}</p>}
              </>
            )}
            {order.estimated_delivery && (
              <p className="text-sm mt-1"><span className="font-semibold">ETA:</span> {new Date(order.estimated_delivery).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
            )}
            <p className="text-sm mt-1"><span className="font-semibold">Status:</span> {order.delivery_status}</p>
            <p className="text-sm"><span className="font-semibold">Payment:</span> {order.payment_status}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-3 py-2 text-left text-sm">#</th>
              <th className="px-3 py-2 text-left text-sm">Product</th>
              <th className="px-3 py-2 text-center text-sm">Crates</th>
              <th className="px-3 py-2 text-center text-sm">Bottles</th>
              <th className="px-3 py-2 text-right text-sm">Rate/Btl</th>
              <th className="px-3 py-2 text-right text-sm">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const bottles = item.quantity_crates * (item.product_details?.crate_size || 24) + item.quantity_bottles
              const amount = bottles * parseFloat(item.price || 0)
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-sm text-gray-900">{item.product_details?.product_name || `Product #${item.product}`}</p>
                    <p className="text-xs text-gray-500">{item.product_details?.brand} · {item.product_details?.bottle_size}</p>
                  </td>
                  <td className="px-3 py-2 text-center text-sm font-bold">{item.quantity_crates}</td>
                  <td className="px-3 py-2 text-center text-sm">{item.quantity_bottles}</td>
                  <td className="px-3 py-2 text-right text-sm">₹{parseFloat(item.price || 0).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">₹{amount.toFixed(0)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800 bg-gray-100">
              <td colSpan={2} className="px-3 py-2 font-bold text-sm">TOTAL</td>
              <td className="px-3 py-2 text-center font-bold text-sm">{items.reduce((s,i)=>s+i.quantity_crates,0)} crates</td>
              <td className="px-3 py-2 text-center font-bold text-sm">{items.reduce((s,i)=>s+i.quantity_bottles,0)} btl</td>
              <td></td>
              <td className="px-3 py-2 text-right font-bold text-lg">₹{parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes + Signature */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            {order.delivery_notes && (
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{order.delivery_notes}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="border-t-2 border-gray-800 pt-2 mt-8 inline-block w-48">
              <p className="text-xs text-gray-500">Customer Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Shree Ganesh Agency · ColdSync Pro · Generated {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .delivery-slip { max-width: 100%; padding: 20px; }
        }
      `}</style>
    </>
  )
}
