import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../utils/api'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VILLAGE_COORDS = {
  // Fallback coords — replace with actual village lat/lng for your area
  'Unknown': [18.5204, 73.8567],
}

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

function FitBounds({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.pos))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [markers, map])
  return null
}

const PRIORITY_STYLE = {
  high:   { bg: 'rgba(192,0,0,0.15)',   color: '#ff6b6b',  border: 'rgba(192,0,0,0.3)' },
  medium: { bg: 'rgba(245,180,0,0.15)', color: '#F5B400',  border: 'rgba(245,180,0,0.3)' },
  low:    { bg: 'rgba(0,200,100,0.15)', color: '#00C864',  border: 'rgba(0,200,100,0.3)' },
}

const PRIORITY_COLOR = { high: '#ff6b6b', medium: '#F5B400', low: '#00C864' }

export default function AdminRoutes() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'map'
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/analytics/route-optimization/')
      .then(r => setData(r.data))
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
      .finally(() => setLoading(false))
  }, [token, navigate])

  // Build map markers: geocode village names via Nominatim (free, no key needed)
  const [markers, setMarkers] = useState([])
  useEffect(() => {
    if (!data?.routes?.length) return
    const geocode = async () => {
      const results = []
      for (const route of data.routes) {
        const cached = VILLAGE_COORDS[route.village]
        if (cached) { results.push({ ...route, pos: cached }); continue }
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(route.village + ', Maharashtra, India')}&format=json&limit=1`)
          const j = await r.json()
          if (j[0]) {
            const pos = [parseFloat(j[0].lat), parseFloat(j[0].lon)]
            VILLAGE_COORDS[route.village] = pos
            results.push({ ...route, pos })
          } else {
            results.push({ ...route, pos: [18.5204 + Math.random() * 0.5, 73.8567 + Math.random() * 0.5] })
          }
        } catch {
          results.push({ ...route, pos: [18.5204 + Math.random() * 0.5, 73.8567 + Math.random() * 0.5] })
        }
      }
      setMarkers(results)
    }
    geocode()
  }, [data])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#1E6FFF,#0099FF)' }}>
          <span className="text-2xl">🗺️</span>
        </div>
        <p className="text-white font-bold text-sm">Planning Routes...</p>
      </div>
    </div>
  )

  const routes = data?.routes || []

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin-dashboard')} className="text-white/60 hover:text-white transition-colors text-lg">←</button>
            <span className="text-white font-bold text-sm">🗺️ Delivery Route Optimization</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-white/30 text-xs hidden sm:block">{data?.total_pending_orders} pending · {data?.total_villages} villages</div>
            <div className="flex rounded-xl overflow-hidden border border-white/15">
              <button onClick={() => setView('list')} className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: view === 'list' ? 'rgba(30,111,255,0.3)' : 'transparent', color: view === 'list' ? '#74b9ff' : '#ffffff60' }}>
                📋 List
              </button>
              <button onClick={() => setView('map')} className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: view === 'map' ? 'rgba(30,111,255,0.3)' : 'transparent', color: view === 'map' ? '#74b9ff' : '#ffffff60' }}>
                🗺️ Map
              </button>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#1E6FFF,#00C864,#F5B400)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Pending Orders', value: data?.total_pending_orders || 0, icon: '📦', color: '#74b9ff' },
            { label: 'Villages to Cover', value: data?.total_villages || 0, icon: '🏘️', color: '#a29bfe' },
            { label: 'High Priority Routes', value: routes.filter(r => r.priority === 'high').length, icon: '🔴', color: '#ff6b6b' },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{c.icon}</span>
                <span className="text-white/50 text-xs">{c.label}</span>
              </div>
              <p className="font-bold text-2xl" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: '480px' }}>
            {markers.length === 0 ? (
              <div className="h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-white/40 text-sm">Loading map markers...</p>
              </div>
            ) : (
              <MapContainer center={[18.5204, 73.8567]} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds markers={markers} />
                {markers.map((route, i) => (
                  <Marker key={i} position={route.pos} icon={makeIcon(PRIORITY_COLOR[route.priority] || '#74b9ff')}>
                    <Popup>
                      <div style={{ minWidth: '180px', fontFamily: 'sans-serif' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>📍 {route.village}</p>
                        <p style={{ fontSize: '12px', color: '#555' }}>{route.order_count} orders · {route.customer_count} shops</p>
                        <p style={{ fontSize: '12px', color: '#555' }}>{route.total_crates} crates · ₹{route.total_amount?.toFixed(0)}</p>
                        <span style={{
                          display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '999px',
                          fontSize: '11px', fontWeight: 'bold',
                          background: route.priority === 'high' ? '#ffe0e0' : route.priority === 'medium' ? '#fff8e0' : '#e0ffe8',
                          color: PRIORITY_COLOR[route.priority],
                        }}>{route.priority} priority</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        )}

        {/* Legend */}
        {view === 'map' && (
          <div className="flex items-center gap-4 px-2">
            {[['high','#ff6b6b','High Priority'],['medium','#F5B400','Medium'],['low','#00C864','Low']].map(([k,c,l]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span className="text-white/50 text-xs">{l}</span>
              </div>
            ))}
          </div>
        )}

        {view === 'list' && routes.length === 0 && (
          <div className="rounded-2xl p-10 border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-4xl mb-3">✅</p>
            <p className="text-white font-bold">No pending deliveries</p>
            <p className="text-white/40 text-sm mt-1">All orders have been delivered!</p>
          </div>
        )}

        {/* Route Cards */}
        {view === 'list' && routes.map((route, i) => {
          const ps = PRIORITY_STYLE[route.priority]
          const isOpen = expanded === i
          return (
            <div key={i} className="rounded-2xl border overflow-hidden transition-all" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}>
              {/* Route Header */}
              <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all"
                onClick={() => setExpanded(isOpen ? null : i)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: `hsl(${i * 47 + 10},60%,35%)` }}>
                    {i + 1}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">📍 {route.village}</p>
                    <p className="text-white/40 text-xs">{route.order_count} orders · {route.customer_count} shops</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-white/70 text-xs">{route.total_crates} crates + {route.total_bottles} bottles</p>
                    <p className="text-white/40 text-xs">₹{route.total_amount.toFixed(0)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                    {route.priority}
                  </span>
                  <span className="text-white/30 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded Orders */}
              {isOpen && (
                <div className="border-t border-white/10 px-5 py-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Total Crates', value: route.total_crates, icon: '📦' },
                      { label: 'Total Bottles', value: route.total_bottles, icon: '🥤' },
                      { label: 'Collection', value: `₹${route.total_amount.toFixed(0)}`, icon: '💰' },
                    ].map((s, j) => (
                      <div key={j} className="rounded-xl p-3 text-center border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-lg">{s.icon}</p>
                        <p className="text-white font-bold text-sm">{s.value}</p>
                        <p className="text-white/40 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-white/50 text-xs font-semibold mb-2">DELIVERY STOPS</p>
                  {route.orders.map((order, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(192,0,0,0.4)' }}>{j + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{order.shop_name}</p>
                        <p className="text-white/40 text-xs">{order.owner_name} · 📞 {order.phone}</p>
                        <p className="text-white/30 text-xs mt-0.5">📍 {order.address}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white text-xs font-bold">₹{order.amount.toFixed(0)}</p>
                        <p className="text-white/40 text-xs">{order.crates}cr + {order.bottles}bt</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: order.payment_status === 'Paid' ? 'rgba(0,200,100,0.15)' : 'rgba(192,0,0,0.15)', color: order.payment_status === 'Paid' ? '#00C864' : '#ff6b6b' }}>
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* WhatsApp Route Share */}
                  <button
                    onClick={() => {
                      const msg = `🚚 *Delivery Route — ${route.village}*\n\n` +
                        route.orders.map((o, j) => `${j + 1}. ${o.shop_name}\n   📞 ${o.phone}\n   📍 ${o.address}\n   💰 ₹${o.amount.toFixed(0)} (${o.payment_status})\n   📦 ${o.crates} crates + ${o.bottles} bottles`).join('\n\n') +
                        `\n\n*Total: ${route.total_crates} crates · ₹${route.total_amount.toFixed(0)}*\n— Shree Ganesh Agency`
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    className="w-full py-2.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                    <span>📲</span> Share Route via WhatsApp
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
