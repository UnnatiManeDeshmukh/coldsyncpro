import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Droplet, ArrowLeft, ShoppingCart, Plus, Minus, X, CheckCircle, Search } from 'lucide-react'
import api from '../utils/api'
import { useTranslation } from 'react-i18next'
import { toast } from '../components/Toast'

// Brand map — DB brand key → display info with exact public/CustomerShop filenames
const BRAND_MAP = {
  ThumbsUp:     { color:'#0044AA', label:'Thums Up',       img:'/CustomerShop/Thums Up 250ml.jfif' },
  Sprite:       { color:'#00D664', label:'Sprite',         img:'/CustomerShop/Sprite 250ml.jfif' },
  Maaza:        { color:'#FFB300', label:'Maaza',          img:'/CustomerShop/MAAZA 600ML.jfif' },
  Mirinda:      { color:'#FF6600', label:'Mirinda',        img:'/CustomerShop/MIRINDA 250ML.jfif' },
  Frooti:       { color:'#FFD700', label:'Frooti',         img:'/CustomerShop/frooti.jfif' },
  Fanta:        { color:'#FF8300', label:'Fanta',          img:'/CustomerShop/fanta.jfif' },
  Bisleri:      { color:'#00AAFF', label:'Bisleri',        img:'/CustomerShop/BISLERI 1L.png' },
  Kinley:       { color:'#0099FF', label:'Kinley Water',   img:'/CustomerShop/KINELY WATER 1L.jpg' },
  Sting:        { color:'#FF0066', label:'Sting Red',      img:'/CustomerShop/Red sting 250ml.jfif' },
  StingBlue:    { color:'#0066FF', label:'Sting Blue',     img:'/CustomerShop/blue Sting 250ml.jfif' },
  StingYellow:  { color:'#FFCC00', label:'Sting Yellow',   img:'/CustomerShop/Yellow Sting 250ml.jfif' },
  RedBull:      { color:'#CC0000', label:'Red Bull',       img:'/CustomerShop/RED EDITION RED BLUE 250ML.jpg' },
  RedBullPink:  { color:'#FF69B4', label:'Red Bull Pink',  img:'/CustomerShop/Pink Red Blue 250ml.jfif' },
  RedBullBlue:  { color:'#0044CC', label:'Red Bull Blue',  img:'/CustomerShop/BLUE  RED BLUE 250ML.jfif' },
  RedBullGreen: { color:'#00AA44', label:'Red Bull Green', img:'/CustomerShop/GREEN RED BLUE 250ML.jpg' },
  RedBullYellow:{ color:'#FFD700', label:'Red Bull Yellow',img:'/CustomerShop/YELLOW EDITION RED BLUE 250ML.jpg' },
  Monster:      { color:'#00CC00', label:'Monster',        img:'/CustomerShop/MONSTAR 250ML.webp' },
  Predator:     { color:'#FF4400', label:'Predator',       img:'/CustomerShop/Predator 250ml.jfif' },
  Java:         { color:'#6F4E37', label:'Java Coffee',    img:'/CustomerShop/JAVA COFFEE.avif' },
}

// Per-product photo — exact public/CustomerShop filenames
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

// All brands for showcase grid
const ALL_BRANDS_SHOWCASE = Object.entries(BRAND_MAP).map(([key, val]) => ({ ...val, dbKey: key }))

function getBrand(brandKey) {
  if (!brandKey) return { color:'#1E6FFF', label: brandKey, img: null }
  if (BRAND_MAP[brandKey]) return BRAND_MAP[brandKey]
  return { color:'#1E6FFF', label: brandKey, img: null }
}

export default function ShopCatalog() {
  const { t } = useTranslation()
  const [products, setProducts] = useState([])
  const [brands, setBrands]     = useState([])
  const [selBrand, setSelBrand] = useState('All')
  const [search, setSearch]     = useState('')
  const [cart, setCart]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '{}') } catch { return {} }
  })
  const [showCart, setShowCart] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [ordering, setOrdering] = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = localStorage.getItem('access')

  const loadData = useCallback(async () => {
    if (!token) { navigate('/login'); return }
    const urlBrand = searchParams.get('brand')
    const urlSearch = searchParams.get('search')
    if (urlBrand) setSelBrand(urlBrand)
    if (urlSearch) setSearch(urlSearch)
    Promise.all([
      api.get('/api/products/catalog/'),
      api.get('/api/products/brands/'),
      api.get('/api/cart/'),
    ]).then(([p, b, cartRes]) => {
      setProducts(p.data || [])
      const seen = new Set()
      const unique = []
      ;(b.data || []).forEach(br => { if (!seen.has(br.brand)) { seen.add(br.brand); unique.push(br) } })
      setBrands(unique)
      // Restore cart from DB (DB is source of truth)
      const dbItems = cartRes.data?.items || []
      if (dbItems.length > 0) {
        const dbCart = {}
        dbItems.forEach(item => { dbCart[item.product] = item.quantity })
        setCart(dbCart)
        localStorage.setItem('cart', JSON.stringify(dbCart))
      } else {
        // Sync localStorage cart to DB on first load
        const localCart = JSON.parse(localStorage.getItem('cart') || '{}')
        if (Object.keys(localCart).length > 0) {
          api.post('/api/cart/sync/', { items: localCart }).catch(() => {})
        }
      }
    }).catch(e => {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }).finally(() => setLoading(false))
  }, [token, navigate, searchParams])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Multi-tab cart sync — listen for localStorage changes from other tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'cart') {
        try { setCart(JSON.parse(e.newValue || '{}')) } catch { setCart({}) }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const dbBrandKeys = new Set(brands.map(b => b.brand))

  const filtered = products.filter(p => {
    const matchBrand = selBrand === 'All' || p.brand === selBrand
    const matchSearch = !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    return matchBrand && matchSearch
  })

  // Sync cart state to both localStorage and DB
  const syncCartToDB = async (newCart) => {
    try { await api.post('/api/cart/sync/', { items: newCart }) } catch { /* silent */ }
  }

  const addToCart = (id) => {
    setCart(c => {
      const n = { ...c, [id]: (c[id] || 0) + 1 }
      localStorage.setItem('cart', JSON.stringify(n))
      api.post('/api/cart/add/', { product_id: id, quantity: n[id] }).catch(() => {})
      return n
    })
    const p = products.find(x => x.id === parseInt(id))
    if (p) toast.success(`${p.product_name} added to cart`)
  }

  const removeFromCart = (id) => {
    setCart(c => {
      const n = { ...c }
      if (n[id] > 1) {
        n[id]--
        api.post(`/api/cart/update/${id}/`, { action: 'decrement' }).catch(() => {})
      } else {
        delete n[id]
        api.post(`/api/cart/update/${id}/`, { action: 'remove' }).catch(() => {})
      }
      localStorage.setItem('cart', JSON.stringify(n))
      return n
    })
  }

  const clearItem = (id) => {
    setCart(c => {
      const n = { ...c }
      delete n[id]
      localStorage.setItem('cart', JSON.stringify(n))
      api.post(`/api/cart/update/${id}/`, { action: 'remove' }).catch(() => {})
      return n
    })
  }

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(x => x.id === parseInt(id))
    return p ? { ...p, qty } : null
  }).filter(Boolean)

  const cartTotal = cartItems.reduce((s, i) => s + i.qty * parseFloat(i.rate_per_bottle), 0)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  const placeOrder = async () => {
    if (!cartItems.length) return
    setOrdering(true); setError('')
    try {
      const res = await api.post('/api/orders/customer/create/',
        { items: cartItems.map(i => ({ product_id: i.id, quantity: i.qty })) }
      )
      setCart({}); localStorage.removeItem('cart')
      api.delete('/api/cart/clear/').catch(() => {})
      toast.success('Order placed successfully! 🎉')
      navigate('/order-confirmed', { state: { order: res.data.order } })
    } catch (e) {
      const data = e.response?.data
      if (data?.available_credit !== undefined) {
        const msg = `Credit limit exceeded! Order: ₹${Math.round(data.order_total || cartTotal)} | Available: ₹${Math.round(data.available_credit)}`
        setError(msg)
        toast.error(msg)
      } else {
        const msg = data?.error || 'Order failed. Please try again.'
        setError(msg)
        toast.error(msg)
      }
    } finally { setOrdering(false) }
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

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors flex-shrink-0"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('shop.title')}</span>
          </div>
          <div className="flex-1 mx-2">
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('shop.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-white text-xs focus:outline-none"
                style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
            </div>
          </div>
          <button onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
            <ShoppingCart size={15} /> {t('shop.cart')}
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background:'#F5B400', color:'#000' }}>{cartCount}</span>
            )}
          </button>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF,#7C3AED)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* BRAND FILTER PILLS */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5" style={{ scrollbarWidth:'none' }}>
          <button onClick={() => setSelBrand('All')}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border"
            style={selBrand==='All' ? {background:'#1E6FFF',color:'#fff',borderColor:'transparent'} : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',borderColor:'rgba(255,255,255,0.1)'}}>
            🛍️ {t('shop.allProducts')}
          </button>
          {brands.map(b => {
            const meta = getBrand(b.brand)
            const active = selBrand === b.brand
            return (
              <button key={b.brand} onClick={() => setSelBrand(b.brand)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
                style={active ? {background:meta.color,color:'#fff',borderColor:'transparent'} : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',borderColor:'rgba(255,255,255,0.1)'}}>
                {meta.img && <img src={meta.img} alt={meta.label} className="w-5 h-5 rounded object-cover flex-shrink-0" onError={e=>e.target.style.display='none'} />}
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* AVAILABLE PRODUCTS */}
        {filtered.length > 0 && (
          <>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
              {selBrand === 'All' ? `All Products (${filtered.length})` : `${getBrand(selBrand).label} — ${filtered.length} products`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {filtered.map(p => {
                const meta = getBrand(p.brand)
                const qty = cart[p.id] || 0
                const inStock = (p.available_stock || 0) > 0
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/25 transition-all group"
                    style={{ background:'rgba(255,255,255,0.04)' }}>
                    <div className="relative h-36 overflow-hidden flex items-center justify-center"
                      style={{ background:`linear-gradient(135deg,${meta.color}30,${meta.color}10)` }}>
                      {(() => {
                        const productImg = p.image_url || PRODUCT_PHOTO[p.product_name]
                        const displayImg = productImg || meta.img
                        return displayImg ? (
                          <>
                            <img src={displayImg} alt={p.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex'}} />
                            <div className="hidden w-full h-full items-center justify-center text-5xl absolute inset-0" style={{background:`${meta.color}22`}}>🥤</div>
                          </>
                        ) : <span className="text-5xl">🥤</span>
                      })()}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold z-10" style={{background:meta.color,color:'#fff'}}>{p.bottle_size}</span>
                      {!inStock && (
                        <div className="absolute inset-0 flex items-center justify-center z-10" style={{background:'rgba(0,0,0,0.65)'}}>
                          <span className="text-white/80 text-xs font-bold px-3 py-1 rounded-full border border-white/30">{t('shop.outOfStock')}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold mb-0.5" style={{color:meta.color}}>{meta.label}</p>
                      <p className="text-white font-semibold text-sm leading-tight mb-2 truncate">{p.product_name}</p>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <p className="text-white font-bold text-lg leading-none">₹{parseFloat(p.rate_per_bottle).toFixed(0)}<span className="text-white/40 text-xs font-normal ml-1">/btl</span></p>
                          <p className="text-white/40 text-xs mt-0.5">₹{(parseFloat(p.rate_per_bottle)*p.crate_size).toFixed(0)} / crate ({p.crate_size} btl)</p>
                        </div>
                        {inStock && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:'rgba(0,200,100,0.15)',color:'#00C864'}}>{p.available_stock} btl</span>}
                      </div>
                      {inStock ? (
                        qty === 0 ? (
                          <button onClick={() => addToCart(p.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                            style={{background:`linear-gradient(135deg,${meta.color},${meta.color}cc)`}}>
                            <Plus size={13} /> {t('shop.addToCart')}
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <button onClick={() => removeFromCart(p.id)} className="flex-1 flex items-center justify-center py-2 rounded-xl text-white hover:opacity-80" style={{background:'rgba(255,255,255,0.1)'}}><Minus size={13} /></button>
                            <span className="text-white font-bold text-sm w-8 text-center">{qty}</span>
                            <button onClick={() => addToCart(p.id)} className="flex-1 flex items-center justify-center py-2 rounded-xl text-white hover:opacity-90" style={{background:meta.color}}><Plus size={13} /></button>
                          </div>
                        )
                      ) : (
                        <div className="w-full py-2 rounded-xl text-center text-white/30 text-xs border border-white/10">{t('shop.unavailable')}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {filtered.length === 0 && selBrand !== 'All' && (
          <div className="text-center py-10 mb-6">
            <p className="text-white/40 text-sm">No products available for this brand yet</p>
          </div>
        )}

        {/* ALL BRANDS SHOWCASE — Coming Soon for brands not in DB */}
        {selBrand === 'All' && (
          <div className="mt-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">All Brands</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {ALL_BRANDS_SHOWCASE.map((b, i) => {
                const hasProducts = dbBrandKeys.has(b.dbKey)
                return (
                  <button key={i}
                    onClick={() => { if (hasProducts) setSelBrand(b.dbKey) }}
                    className="group flex flex-col items-center rounded-2xl overflow-hidden border transition-all hover:scale-[1.04]"
                    style={{
                      background:`linear-gradient(160deg,${b.color}25,${b.color}10)`,
                      borderColor: hasProducts ? `${b.color}60` : 'rgba(255,255,255,0.08)',
                      boxShadow: hasProducts ? `0 2px 12px ${b.color}20` : 'none',
                      cursor: hasProducts ? 'pointer' : 'default',
                    }}>
                    <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center"
                      style={{background:`linear-gradient(135deg,${b.color}30,${b.color}10)`}}>
                      <img src={b.img} alt={b.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={e=>{e.target.onerror=null;e.target.style.display='none';e.target.nextSibling.style.display='flex'}} />
                      <div className="hidden w-full h-full items-center justify-center text-3xl absolute inset-0" style={{background:`${b.color}22`}}>🥤</div>
                      <div className="absolute top-0 left-0 right-0 h-1" style={{background:b.color}} />
                      {hasProducts && (
                        <div className="absolute bottom-1 right-1">
                          <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full" style={{background:b.color,fontSize:'9px'}}>Shop</span>
                        </div>
                      )}
                    </div>
                    <div className="w-full px-1 py-1.5 text-center" style={{background:'rgba(0,0,0,0.55)'}}>
                      <p className="text-white text-xs font-semibold leading-tight truncate" style={{fontSize:'10px'}}>{b.label}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-sm h-full flex flex-col border-l border-white/10" style={{background:'#0d1b35'}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-white" />
                <span className="text-white font-bold">{t('shop.cart')} ({cartCount})</span>
              </div>
              <button onClick={() => setShowCart(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            {success ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <CheckCircle size={56} style={{color:'#00C864'}} />
                <p className="text-white font-bold text-lg text-center">{t('shop.orderPlaced')}</p>
                <p className="text-white/50 text-sm text-center">{t('shop.orderSuccess')}</p>
                <Link to="/customer-orders" className="px-6 py-2 rounded-xl text-white text-sm font-bold" style={{background:'#1E6FFF'}}>{t('orders.title')}</Link>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                <span className="text-5xl">🛒</span>
                <p className="text-white/40 text-sm">{t('shop.cartEmpty')}</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cartItems.map(item => {
                    const meta = getBrand(item.brand)
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10" style={{background:'rgba(255,255,255,0.04)'}}>
                        {meta.img ? (
                          <img src={PRODUCT_PHOTO[item.product_name] || meta.img} alt={meta.label} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" onError={e=>e.target.style.display='none'} />
                        ) : <span className="text-2xl">🥤</span>}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{item.product_name}</p>
                          <p className="text-white/40 text-xs">{item.bottle_size} · ₹{parseFloat(item.rate_per_bottle).toFixed(0)}/btl</p>
                          <p className="text-xs font-bold mt-0.5" style={{color:meta.color}}>₹{(item.qty*parseFloat(item.rate_per_bottle)).toFixed(0)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{background:'rgba(255,255,255,0.1)'}}><Minus size={10} /></button>
                          <span className="text-white text-xs font-bold w-5 text-center">{item.qty}</span>
                          <button onClick={() => addToCart(item.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{background:'#1E6FFF'}}><Plus size={10} /></button>
                        </div>
                        <button onClick={() => clearItem(item.id)} className="text-white/30 hover:text-white/70 ml-1"><X size={14} /></button>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 border-t border-white/10">
                  {error && <p className="text-red-400 text-xs mb-3 text-center whitespace-pre-line">{error}</p>}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/60 text-sm">{t('shop.total')}</span>
                    <span className="text-white font-bold text-xl">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  <p className="text-white/30 text-xs mb-4">{cartCount} bottle{cartCount!==1?'s':''} selected</p>
                  <button onClick={placeOrder} disabled={ordering}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                    style={{background:'linear-gradient(135deg,#C00000,#8B0000)'}}>
                    {ordering ? (
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    ) : <>{t('shop.placeOrder')} · ₹{cartTotal.toFixed(0)}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
