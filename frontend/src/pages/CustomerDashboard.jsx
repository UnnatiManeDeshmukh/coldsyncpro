import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, RefreshCw, ShoppingCart, Package, BarChart2, LogOut, ChevronRight, TrendingUp, AlertCircle, Download, RotateCcw, Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../utils/api'
import NotificationBell from '../components/NotificationBell'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { toast } from '../components/Toast'
import { useTheme } from '../hooks/useTheme'

// Product image map for search suggestions
const PRODUCT_PHOTO = {
  'Thums Up 250ml':       '/CustomerShop/Thums Up 250ml.jfif',
  'Thums Up 300ml':       '/CustomerShop/THUMS UP 300ML.jfif',
  'Thums Up 600ml':       '/CustomerShop/THUMS UP 600ML.jfif',
  'Thums Up 750ml':       '/CustomerShop/Thums Up 750ml.jfif',
  'Thums Up 1L':          '/CustomerShop/THUMS UP 1L.jfif',
  'Thums Up 1.25L':       '/CustomerShop/THUMS UP 1.25L.jfif',
  'Thums Up 2L':          '/CustomerShop/THUMS UP 2L.jfif',
  'Sprite 250ml':         '/CustomerShop/Sprite 250ml.jfif',
  'Sprite 300ml':         '/CustomerShop/SPRITE 300ML.jfif',
  'Sprite 600ml':         '/CustomerShop/SPRITE 600ML.jfif',
  'Sprite 750ml':         '/CustomerShop/SPRITE 750 ML.jfif',
  'Sprite 1L':            '/CustomerShop/SPRITE 1L.jfif',
  'Sprite 1.25L':         '/CustomerShop/SPRITE 1.25L.jfif',
  'Sprite 2.25L':         '/CustomerShop/SPRITE 2.25L.jfif',
  'Maaza 250ml':          '/CustomerShop/MAAZA 250ML.jfif',
  'Maaza 300ml':          '/CustomerShop/MAAZA 300ML.jfif',
  'Maaza 600ml':          '/CustomerShop/MAAZA 600ML.jfif',
  'Maaza 1L':             '/CustomerShop/MAAZA 1L.jfif',
  'Maaza 1.25L':          '/CustomerShop/MAAZA 1.25L.jfif',
  'Maaza 2.25L':          '/CustomerShop/MAAZA 2.25L.jfif',
  'Mirinda 250ml':        '/CustomerShop/MIRINDA 250ML.jfif',
  'Mirinda 300ml':        '/CustomerShop/MIRINDA 300ML.jfif',
  'Mirinda 600ml':        '/CustomerShop/MIRINDA 600ML.jfif',
  'Mirinda 1L':           '/CustomerShop/Mirinda 1l.jfif',
  'Mirinda 1.25L':        '/CustomerShop/MRINDA 1.25L.jfif',
  'Mirinda 2.25L':        '/CustomerShop/MIRINDA 2.25L.jfif',
  'Frooti 250ml':         '/CustomerShop/frooti.jfif',
  'Fanta 250ml':          '/CustomerShop/fanta.jfif',
  'Bisleri 1L':           '/CustomerShop/BISLERI 1L.png',
  'Kinley Water 1L':      '/CustomerShop/KINELY WATER 1L.jpg',
  'Sting Red 250ml':      '/CustomerShop/Red sting 250ml.jfif',
  'Sting Blue 250ml':     '/CustomerShop/blue Sting 250ml.jfif',
  'Sting Yellow 250ml':   '/CustomerShop/Yellow Sting 250ml.jfif',
  'Red Bull Red 250ml':   '/CustomerShop/RED EDITION RED BLUE 250ML.jpg',
  'Red Bull Pink 250ml':  '/CustomerShop/Pink Red Blue 250ml.jfif',
  'Red Bull Blue 250ml':  '/CustomerShop/BLUE  RED BLUE 250ML.jfif',
  'Red Bull Green 250ml': '/CustomerShop/GREEN RED BLUE 250ML.jpg',
  'Red Bull Yellow 250ml':'/CustomerShop/YELLOW EDITION RED BLUE 250ML.jpg',
  'Monster 250ml':        '/CustomerShop/MONSTAR 250ML.webp',
  'Predator 250ml':       '/CustomerShop/Predator 250ml.jfif',
  'Java Coffee 250ml':    '/CustomerShop/JAVA COFFEE.avif',
}

function SearchBar({ navigate }) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useState(null)
  const inputRef = { current: null }

  // Load all products once
  useEffect(() => {
    api.get('/api/products/catalog/').then(r => setAllProducts(r.data || [])).catch(() => {})
  }, [])

  // Filter locally on every keystroke
  useEffect(() => {
    if (!query.trim()) { setProducts([]); setOpen(false); return }
    const q = query.toLowerCase()
    const filtered = allProducts.filter(p =>
      p.product_name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    ).slice(0, 8)
    setProducts(filtered)
    setOpen(filtered.length > 0)
  }, [query, allProducts])

  const go = (p) => {
    navigate(`/catalog?search=${encodeURIComponent(p.product_name)}`)
    setQuery(''); setOpen(false)
  }

  const goSearch = () => {
    if (!query.trim()) return
    navigate(`/catalog?search=${encodeURIComponent(query.trim())}`)
    setQuery(''); setOpen(false)
  }

  return (
    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all"
        style={{ background:'rgba(255,255,255,0.04)', borderColor: open ? 'rgba(30,111,255,0.5)' : 'rgba(255,255,255,0.1)' }}>
        <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          ref={el => inputRef.current = el}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') goSearch(); if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          onFocus={() => { if (products.length > 0) setOpen(true) }}
          placeholder="Search products — Thums Up, Sprite, Sting... (Press Enter)"
          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-white/25"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
        {query && (
          <button onClick={goSearch}
            className="px-3 py-1 rounded-xl text-white text-xs font-bold flex-shrink-0 hover:opacity-90 transition-all"
            style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
            Search
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 overflow-hidden z-50 shadow-2xl"
          style={{ background:'rgba(13,27,53,0.98)', backdropFilter:'blur(20px)' }}>
          {products.map(p => {
            const img = p.image_url || PRODUCT_PHOTO[p.product_name]
            return (
              <button key={p.id} onMouseDown={() => go(p)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-all text-left border-b border-white/5 last:border-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.06)' }}>
                  {img
                    ? <img src={img} alt={p.product_name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    : <span className="text-lg">🥤</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.product_name}</p>
                  <p className="text-white/40 text-xs">{p.bottle_size} · ₹{parseFloat(p.rate_per_bottle).toFixed(0)}/btl</p>
                </div>
                <span className="text-white/30 text-xs flex-shrink-0">
                  {(p.available_stock || 0) > 0
                    ? <span style={{ color:'#00C864' }}>In Stock</span>
                    : <span style={{ color:'#ff6b6b' }}>Out of Stock</span>
                  }
                </span>
              </button>
            )
          })}
          <button onMouseDown={goSearch}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color:'#1E6FFF' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            See all results for "{query}"
          </button>
        </div>
      )}
    </div>
  )
}

const BRAND_SHOWCASE = [
  { color:'#0044AA', label:'Thums Up',      dbKey:'ThumbsUp',     img:'/CustomerShop/Thums Up 250ml.jfif' },
  { color:'#00D664', label:'Sprite',        dbKey:'Sprite',       img:'/CustomerShop/Sprite 250ml.jfif' },
  { color:'#FFB300', label:'Maaza',         dbKey:'Maaza',        img:'/CustomerShop/MAAZA 600ML.jfif' },
  { color:'#FF6600', label:'Mirinda',       dbKey:'Mirinda',      img:'/CustomerShop/MIRINDA 250ML.jfif' },
  { color:'#FFD700', label:'Frooti',        dbKey:'Frooti',       img:'/CustomerShop/frooti.jfif' },
  { color:'#FF8300', label:'Fanta',         dbKey:'Fanta',        img:'/CustomerShop/fanta.jfif' },
  { color:'#00AAFF', label:'Bisleri',       dbKey:'Bisleri',      img:'/CustomerShop/BISLERI 1L.png' },
  { color:'#0099FF', label:'Kinley',        dbKey:'Kinley',       img:'/CustomerShop/KINELY WATER 1L.jpg' },
  { color:'#FF0066', label:'Sting Red',     dbKey:'Sting',        img:'/CustomerShop/Red sting 250ml.jfif' },
  { color:'#0066FF', label:'Sting Blue',    dbKey:'StingBlue',    img:'/CustomerShop/blue Sting 250ml.jfif' },
  { color:'#FFCC00', label:'Sting Yellow',  dbKey:'StingYellow',  img:'/CustomerShop/Yellow Sting 250ml.jfif' },
  { color:'#CC0000', label:'Red Bull',      dbKey:'RedBull',      img:'/CustomerShop/RED EDITION RED BLUE 250ML.jpg' },
  { color:'#FF69B4', label:'Red Bull Pink', dbKey:'RedBullPink',  img:'/CustomerShop/Pink Red Blue 250ml.jfif' },
  { color:'#0044CC', label:'Red Bull Blue', dbKey:'RedBullBlue',  img:'/CustomerShop/BLUE  RED BLUE 250ML.jfif' },
  { color:'#00CC00', label:'Red Bull Green',dbKey:'RedBullGreen', img:'/CustomerShop/GREEN RED BLUE 250ML.jpg' },
  { color:'#FFD700', label:'Red Bull Yellow',dbKey:'RedBullYellow',img:'/CustomerShop/YELLOW EDITION RED BLUE 250ML.jpg' },
  { color:'#00CC00', label:'Monster',       dbKey:'Monster',      img:'/CustomerShop/MONSTAR 250ML.webp' },
  { color:'#FF4400', label:'Predator',      dbKey:'Predator',     img:'/CustomerShop/Predator 250ml.jfif' },
  { color:'#6F4E37', label:'Java Coffee',   dbKey:'Java',         img:'/CustomerShop/JAVA COFFEE.avif' },
]

const STAT_KEYS = [
  { key:'totalOrders',    icon: ShoppingCart, grad:'135deg,#1E6FFF,#7C3AED', glow:'rgba(30,111,255,0.3)',  tKey:'dashboard.totalOrders' },
  { key:'pending',        icon: RefreshCw,    grad:'135deg,#F5B400,#FF8C00', glow:'rgba(245,180,0,0.3)',   tKey:'dashboard.pending' },
  { key:'completed',      icon: Package,      grad:'135deg,#00C864,#00a050', glow:'rgba(0,200,100,0.3)',   tKey:'dashboard.completed' },
  { key:'totalSpent',     icon: BarChart2,    grad:'135deg,#C00000,#8B0000', glow:'rgba(192,0,0,0.3)',     tKey:'dashboard.totalSpent' },
  { key:'outstanding',    icon: AlertCircle,  grad:'135deg,#7C3AED,#5B21B6', glow:'rgba(124,58,237,0.3)',  tKey:'dashboard.outstanding' },
  { key:'availableCredit',icon: TrendingUp,   grad:'135deg,#00D4FF,#0099CC', glow:'rgba(0,212,255,0.3)',   tKey:'dashboard.availableCredit' },
]

const QUICK_LINK_DEFS = [
  { tKey:'dashboard.offers',        icon:'🎁', to:'/offers',          grad:'135deg,#F5B400,#FF8C00', short:'Offers' },
  { tKey:'dashboard.payment',       icon:'💳', to:'/pay-now',         grad:'135deg,#00C864,#00a050', short:'Pay' },
  { tKey:'dashboard.tracking',      icon:'🚚', to:'/customer-orders', grad:'135deg,#1E6FFF,#7C3AED', short:'Track' },
  { tKey:'dashboard.orders',        icon:'📦', to:'/customer-orders', grad:'135deg,#C00000,#8B0000', short:'Orders' },
  { tKey:'dashboard.returns',       icon:'↩️', to:'/returns',         grad:'135deg,#7C3AED,#5B21B6', short:'Returns' },
  { tKey:'dashboard.shop',          icon:'🛍️', to:'/catalog',         grad:'135deg,#00D4FF,#0099CC', short:'Shop' },
  { tKey:'dashboard.subscriptions', icon:'🔄', to:'/subscriptions',   grad:'135deg,#FF6B6B,#C00000', short:'Subs' },
  { tKey:'dashboard.loyalty',       icon:'⭐', to:'/loyalty',         grad:'135deg,#FFD700,#FF8C00', short:'Loyalty' },
]

export default function CustomerDashboard() {
  const { t } = useTranslation()
  const STAT_CONFIG = STAT_KEYS.map(s => ({ ...s, label: t(s.tKey) }))
  const QUICK_LINKS = QUICK_LINK_DEFS.map(l => ({ ...l, label: t(l.tKey) }))
  const [stats, setStats]           = useState(null)
  const [profile, setProfile]       = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reordering, setReordering] = useState(false)
  const { theme, toggle: toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  const load = async (silent = false) => {
    if (!token) { navigate('/login'); return }
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [s, p, o, tr] = await Promise.all([
        api.get('/api/analytics/customer/dashboard/'),
        api.get('/api/customers/profile/'),
        api.get('/api/orders/customer/my-orders/'),
        api.get('/api/analytics/customer/trends/'),
      ])
      setStats(s.data)
      setProfile(p.data)
      const orders = o.data.results || o.data || []
      setRecentOrders(orders.slice(0, 3))
      setMonthlyTrends(tr.data.trends || [])
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const logout = () => { localStorage.clear(); navigate('/login') }

  // Reorder last order
  const handleReorder = async (orderId) => {
    setReordering(true)
    try {
      const res = await api.post(`/api/orders/customer/reorder/${orderId}/`)
      toast.success(`Reorder placed! New Order #${res.data.order?.id} 🎉`)
      await load(true)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Reorder failed. Please try again.')
    } finally { setReordering(false) }
  }

  // Download invoice for an order
  const handleInvoiceDownload = async (orderId) => {
    try {
      const res = await api.get(`/api/billing/invoices/by-order/${orderId}/download/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `invoice-order-${orderId}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch {
      toast.warning('Invoice not available yet. Generated after order confirmation.')
    }
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
  const hour = now.getHours()
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center animate-fadeInUp">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,#C00000,#F5B400)' }}>
          <Droplet size={28} className="text-white" />
        </div>
        <p className="text-white/50 text-sm" style={{ fontFamily:"'Inter',sans-serif" }}>{t('dashboard.loading')}</p>
      </div>
    </div>
  )

  const s = stats?.stats || {}
  const credit = stats?.credit || {}

  const statValues = [
    s.total_orders ?? 0,
    s.pending_orders ?? 0,
    s.completed_orders ?? 0,
    `₹${(s.total_spent ?? 0).toLocaleString('en-IN')}`,
    `₹${(s.pending_payments ?? 0).toLocaleString('en-IN')}`,
    `₹${(credit.available ?? 0).toLocaleString('en-IN')}`,
  ]

  const creditPct = credit.credit_limit > 0
    ? Math.min((credit.outstanding / credit.credit_limit) * 100, 100)
    : 0

  return (
    <div className="min-h-screen" style={{ background:'#07091A', fontFamily:"'Inter',sans-serif" }}>

      {/* ── TOPBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10"
        style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-3 h-14 flex items-center justify-between gap-2">
          {/* Logo — compact */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg">
              <Droplet size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-xs whitespace-nowrap" style={{ fontFamily:"'Poppins',sans-serif" }}>ColdSync Pro</span>
          </div>

          {/* Nav links — icon + short label, no overflow */}
          <div className="hidden md:flex items-center flex-1 min-w-0 justify-center">
            <div className="flex items-center gap-0.5">
              {QUICK_LINKS.map(l => (
                <Link key={l.short} to={l.to}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-all whitespace-nowrap flex-shrink-0"
                  style={{ fontSize:'11px', fontFamily:"'Inter',sans-serif", fontWeight:500 }}>
                  <span style={{ fontSize:'12px' }}>{l.icon}</span>
                  <span>{l.short}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right actions — compact, no wrap */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link to="/pay-now"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white font-bold hover:opacity-90 transition-all whitespace-nowrap flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#C00000,#8B0000)', fontSize:'11px' }}>
              💳 Pay Now
            </Link>
            <button onClick={() => load(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={toggleTheme}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
              title={isDark ? 'Light Mode' : 'Dark Mode'}>
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <LanguageSwitcher />
            <NotificationBell />
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)', fontSize:'11px' }}>
              {(profile?.full_name || profile?.owner_name || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF,#7C3AED,#E040FB)' }} />
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── PRODUCT SEARCH BAR ── */}
        <SearchBar navigate={navigate} />
        <div className="relative rounded-3xl overflow-hidden border border-white/10 animate-fadeInUp"
          style={{ background:'linear-gradient(135deg,rgba(30,111,255,0.15) 0%,rgba(124,58,237,0.1) 50%,rgba(192,0,0,0.08) 100%)' }}>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(245,180,0,0.08),transparent 70%)', transform:'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(30,111,255,0.08),transparent 70%)', transform:'translate(-30%,30%)' }} />

          <div className="relative p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                  style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)', boxShadow:'0 4px 20px rgba(30,111,255,0.4)' }}>
                  {(profile?.full_name || profile?.owner_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color:'#F5B400', fontFamily:"'Inter',sans-serif", letterSpacing:'0.05em' }}>
                    {greeting}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 flex items-center gap-2 flex-wrap"
                    style={{ fontFamily:"'Poppins',sans-serif", letterSpacing:'-0.02em' }}>
                    {profile?.full_name || profile?.owner_name || 'Customer'}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background:'rgba(245,180,0,0.15)', color:'#F5B400', border:'1px solid rgba(245,180,0,0.3)', fontFamily:"'Inter',sans-serif" }}>
                      ⭐ Customer
                    </span>
                  </h1>
                  <div className="flex flex-wrap gap-3 text-white/50 text-xs">
                    {profile?.shop_name && (
                      <span className="flex items-center gap-1">🏪 <span className="text-white/70">{profile.shop_name}</span></span>
                    )}
                    {profile?.phone && (
                      <span className="flex items-center gap-1">📱 <span className="text-white/70">{profile.phone}</span></span>
                    )}
                    {profile?.email && (
                      <span className="flex items-center gap-1 hidden sm:flex">✉️ <span className="text-white/70">{profile.email}</span></span>
                    )}
                    <span className="flex items-center gap-1">⭐ Member since <span className="text-white/70">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : dateStr}
                    </span></span>
                  </div>
                  <p className="text-white/25 text-xs mt-1.5">{dateStr}</p>
                </div>
              </div>
              <button onClick={() => navigate('/edit-profile')}
                className="px-4 py-2 rounded-xl text-white text-xs font-semibold border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all self-start flex-shrink-0"
                style={{ fontFamily:"'Inter',sans-serif" }}>
                ✏️ {t('dashboard.editProfile')}
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAT_CONFIG.map((cfg, i) => (
            <div key={i}
              className="rounded-2xl p-4 border border-white/8 hover:border-white/20 hover:scale-[1.02] transition-all cursor-default group"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background:`linear-gradient(${cfg.grad})`, boxShadow:`0 4px 16px ${cfg.glow}` }}>
                <cfg.icon size={16} className="text-white" />
              </div>
              {/* Value */}
              <p className="text-white font-extrabold text-xl mb-1 leading-none"
                style={{ fontFamily:"'Poppins',sans-serif" }}>
                {statValues[i]}
              </p>
              {/* Label */}
              <p className="text-white/40 text-xs font-medium" style={{ fontFamily:"'Inter',sans-serif" }}>
                {cfg.label}
              </p>
              {/* Bottom accent */}
              <div className="mt-3 h-0.5 rounded-full w-0 group-hover:w-full transition-all duration-500"
                style={{ background:`linear-gradient(${cfg.grad})` }} />
            </div>
          ))}
        </div>

        {/* ── PENDING BALANCE BANNER ── */}
        {(s.pending_payments ?? 0) > 0 && (
          <div className="rounded-2xl p-4 flex items-center justify-between border animate-fadeInUp"
            style={{ background:'linear-gradient(135deg,rgba(192,0,0,0.12),rgba(139,0,0,0.08))', borderColor:'rgba(192,0,0,0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(192,0,0,0.2)' }}>
                <AlertCircle size={18} style={{ color:'#ff6b6b' }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm" style={{ fontFamily:"'Poppins',sans-serif" }}>
                  {t('dashboard.pendingBalance')}
                </p>
                <p className="text-white/50 text-xs">{t('dashboard.clearOutstanding')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-bold text-lg" style={{ color:'#F5B400', fontFamily:"'Poppins',sans-serif" }}>
                ₹{(s.pending_payments ?? 0).toLocaleString('en-IN')}
              </span>
              <Link to="/pay-now"
                className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {t('dashboard.payNow')}
              </Link>
            </div>
          </div>
        )}

        {/* ── QUICK ACCESS ── */}
        <div>
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2"
            style={{ fontFamily:"'Poppins',sans-serif", letterSpacing:'0.05em' }}>
            <span className="w-1 h-4 rounded-full inline-block" style={{ background:'linear-gradient(180deg,#F5B400,#C00000)' }} />
            {t('dashboard.quickAccess').toUpperCase()}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {QUICK_LINKS.map(l => (
              <Link key={l.label} to={l.to}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-white/8 hover:border-white/25 transition-all group relative overflow-hidden"
                style={{ background:'rgba(255,255,255,0.04)' }}>
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                  style={{ background:`linear-gradient(135deg,${l.grad.split(',')[1]}15,transparent)` }} />
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300 relative z-10">{l.icon}</span>
                <span className="text-white/55 text-xs font-medium group-hover:text-white transition-colors relative z-10"
                  style={{ fontFamily:"'Inter',sans-serif" }}>
                  {l.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── SHOP BY BRAND ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-sm flex items-center gap-2"
                style={{ fontFamily:"'Poppins',sans-serif", letterSpacing:'0.05em' }}>
                <span className="w-1 h-4 rounded-full inline-block" style={{ background:'linear-gradient(180deg,#F5B400,#C00000)' }} />
                🥤 {t('dashboard.shopByBrand').toUpperCase()}
              </h2>
              <p className="text-white/35 text-xs mt-0.5 ml-3">Tap a brand to browse products</p>
            </div>
            <Link to="/catalog"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
              style={{ background:'linear-gradient(135deg,#C00000,#8B0000)', fontFamily:"'Inter',sans-serif" }}>
              🛒 {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2.5">
            {BRAND_SHOWCASE.map((b, i) => (
              <Link key={i} to={`/catalog?brand=${encodeURIComponent(b.dbKey || b.label)}`}
                className="group flex flex-col items-center rounded-2xl overflow-hidden border border-white/8 hover:border-white/30 transition-all hover:scale-[1.06] hover:shadow-lg"
                style={{ background:`linear-gradient(160deg,${b.color}22,${b.color}08)`, boxShadow:`0 2px 10px ${b.color}18` }}>
                <div className="w-full aspect-square overflow-hidden relative">
                  <img src={b.img} alt={b.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                  <div className="hidden w-full h-full items-center justify-center text-2xl absolute inset-0"
                    style={{ background:`${b.color}22` }}>🥤</div>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: b.color }} />
                </div>
                <div className="w-full px-1.5 py-1.5 text-center" style={{ background:'rgba(0,0,0,0.6)' }}>
                  <p className="text-white text-xs font-semibold leading-tight truncate"
                    style={{ fontFamily:"'Inter',sans-serif", fontSize:'0.65rem' }}>{b.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── BOTTOM GRID ── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Recent Orders — with reorder + invoice download */}
          <div className="rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all"
            style={{ background:'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"
                style={{ fontFamily:"'Poppins',sans-serif" }}>
                📋 {t('dashboard.recentOrders')}
              </h3>
              <Link to="/customer-orders"
                className="text-xs flex items-center gap-1 hover:text-white transition-colors"
                style={{ color:'#1E6FFF', fontFamily:"'Inter',sans-serif" }}>
                {t('dashboard.viewAll')} <ChevronRight size={12} />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background:'rgba(30,111,255,0.1)' }}>
                  <Package size={24} style={{ color:'#1E6FFF' }} />
                </div>
                <p className="text-white/40 text-sm mb-3">{t('dashboard.noOrders')}</p>
                <Link to="/catalog"
                  className="inline-block px-5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                  style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
                  {t('dashboard.browseProducts')}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(order => {
                  const statusColors = {
                    'Delivered':'#00C864','Cancelled':'#ff6b6b',
                    'Out for Delivery':'#00D4FF','Processing':'#7C3AED',
                    'Order Confirmed':'#1E6FFF','Order Placed':'#F5B400',
                  }
                  const sc = statusColors[order.delivery_status] || '#F5B400'
                  return (
                    <div key={order.id} className="p-3 rounded-xl border border-white/6"
                      style={{ background:'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white text-xs font-semibold">Order #{order.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background:`${sc}20`, color: sc }}>
                          {order.delivery_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-xs">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleInvoiceDownload(order.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/50 hover:text-white text-xs transition-all border border-white/10 hover:border-white/25">
                            <Download size={10} /> Invoice
                          </button>
                          {order.delivery_status === 'Delivered' && (
                            <button onClick={() => handleReorder(order.id)} disabled={reordering}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-50"
                              style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
                              <RotateCcw size={10} /> Reorder
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Link to="/customer-orders"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all mt-2"
                  style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
                  {t('orders.title')} <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Credit Account + Spending Chart */}
          <div className="space-y-4">
            {/* Spending Chart */}
            {monthlyTrends.length > 0 && (
              <div className="rounded-2xl p-5 border border-white/8"
                style={{ background:'rgba(255,255,255,0.04)' }}>
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"
                  style={{ fontFamily:"'Poppins',sans-serif" }}>
                  📊 Monthly Spending
                </h3>
                <div className="flex items-end gap-1.5 h-20">
                  {monthlyTrends.map((m, i) => {
                    const maxSpend = Math.max(...monthlyTrends.map(x => x.spending), 1)
                    const pct = Math.max((m.spending / maxSpend) * 100, 4)
                    const isLast = i === monthlyTrends.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-white/0 group-hover:text-white/60 text-xs transition-colors leading-none"
                          style={{ fontSize:'9px' }}>
                          ₹{m.spending > 999 ? `${(m.spending/1000).toFixed(1)}K` : m.spending}
                        </span>
                        <div className="w-full rounded-t-lg transition-all"
                          style={{
                            height:`${pct}%`,
                            background: isLast
                              ? 'linear-gradient(180deg,#F5B400,#FF8C00)'
                              : 'linear-gradient(180deg,#1E6FFF,#7C3AED)',
                            opacity: isLast ? 1 : 0.6,
                          }} />
                        <span className="text-white/30 leading-none" style={{ fontSize:'9px' }}>
                          {m.month}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-white/25 text-xs mt-2 text-right">
                  This month: ₹{(monthlyTrends[monthlyTrends.length-1]?.spending ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            )}

            {/* Credit Account */}
            <div className="rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily:"'Poppins',sans-serif" }}>
                💳 {t('dashboard.creditAccount')}
              </h3>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">{t('paymentHistory.creditUsed')}</span>
                  <span style={{ color: creditPct > 80 ? '#ff6b6b' : '#F5B400' }}>
                    {creditPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${creditPct}%`,
                      background: creditPct > 80
                        ? 'linear-gradient(90deg,#C00000,#ff6b6b)'
                        : 'linear-gradient(90deg,#1E6FFF,#7C3AED)',
                    }} />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: t('dashboard.creditLimit'),       val:`₹${(credit.credit_limit ?? 0).toLocaleString('en-IN')}`,  color:'#00C864' },
                  { label: t('dashboard.outstandingBal'),    val:`₹${(credit.outstanding ?? 0).toLocaleString('en-IN')}`,   color:'#ff6b6b' },
                  { label: t('dashboard.availableCreditBal'),val:`₹${(credit.available ?? 0).toLocaleString('en-IN')}`,     color:'#1E6FFF' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-white/6"
                    style={{ background:'rgba(255,255,255,0.03)' }}>
                    <span className="text-white/55 text-xs">{item.label}</span>
                    <span className="font-bold text-sm" style={{ color: item.color, fontFamily:"'Poppins',sans-serif" }}>{item.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white/40 text-xs hover:text-white hover:bg-white/8 transition-all border border-white/8"
                style={{ fontFamily:"'Inter',sans-serif" }}>
                <LogOut size={13} /> {t('dashboard.signOut')}
              </button>
            </div>
          </div>
        </div>

      </div>
      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 pb-safe"
        style={{ background:'rgba(7,9,26,0.98)', backdropFilter:'blur(16px)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { icon:'🛍️', label:'Shop',    to:'/catalog' },
            { icon:'📦', label:'Orders',  to:'/customer-orders' },
            { icon:'💳', label:'Pay',     to:'/pay-now', highlight: true },
            { icon:'↩️', label:'Returns', to:'/returns' },
            { icon:'⭐', label:'Loyalty', to:'/loyalty' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${item.highlight ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={item.highlight ? { background:'linear-gradient(135deg,#C00000,#8B0000)' } : {}}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-xs font-medium leading-none">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-20" />
    </div>
  )
}
