import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Droplet, Package, TrendingUp, Phone, Mail, MapPin,
  ChevronLeft, ChevronRight, Menu, X,
  Facebook, Twitter, Instagram, ShoppingCart,
  BarChart2, CreditCard, Truck
} from 'lucide-react'
import axios from 'axios'
import { validateContactName, validateEmail, validateMessage } from '../utils/validators'
import LanguageSwitcher from '../components/LanguageSwitcher'

const BRAND_META = [
  { color:'#F40009', label:'Coca-Cola',      img:'/colddrinkbrands/coca cola.jpg' },
  { color:'#0044AA', label:'Thums Up',       img:'/colddrinkbrands/thumps up.webp' },
  { color:'#00D664', label:'Sprite',         img:'/colddrinkbrands/Crystal-Cool Sprite – Refreshment Captured in every sip.jfif' },
  { color:'#FF8300', label:'Fanta',          img:'/colddrinkbrands/fanta.jfif' },
  { color:'#0099FF', label:'Kinley Water',   img:'/colddrinkbrands/kinley water.jpg' },
  { color:'#004B93', label:'Pepsi',          img:'/colddrinkbrands/Pepsi - El Hadaba Bottles.jfif' },
  { color:'#FF6600', label:'Mirinda',        img:'/colddrinkbrands/mirinda.webp' },
  { color:'#FFB300', label:'Maaza',          img:'/colddrinkbrands/maza.webp' },
  { color:'#FF9900', label:'Big Maza',       img:'/colddrinkbrands/big maza.jfif' },
  { color:'#FFD700', label:'Frooti',         img:'/colddrinkbrands/frooti.jfif' },
  { color:'#FF0066', label:'Sting',          img:'/colddrinkbrands/sting.webp' },
  { color:'#0066FF', label:'Sting Blue',     img:'/colddrinkbrands/blue sting.jpg' },
  { color:'#FFCC00', label:'Sting Yellow',   img:'/colddrinkbrands/yellow sting.avif' },
  { color:'#CC0000', label:'Red Bull',       img:'/colddrinkbrands/red red bull.jfif' },
  { color:'#0044CC', label:'Red Bull Blue',  img:'/colddrinkbrands/blue red bull.webp' },
  { color:'#FF69B4', label:'Red Bull Pink',  img:'/colddrinkbrands/pink red bull.jfif' },
  { color:'#FFD700', label:'Red Bull Gold',  img:'/colddrinkbrands/yellow red bull.jfif' },
  { color:'#00CC00', label:'Monster',        img:'/colddrinkbrands/monster.webp' },
  { color:'#00FF44', label:'Monster Energy', img:"/colddrinkbrands/Unleash the beast ⚡💚.jfif" },
  { color:'#FF4400', label:'Predator',       img:'/colddrinkbrands/predator.avif' },
  { color:'#FFD700', label:'Appy Fizz',      img:'/colddrinkbrands/appy fizz.webp' },
  { color:'#00AAFF', label:'Bisleri',        img:'/colddrinkbrands/bisleri.webp' },
  { color:'#00AA00', label:'7UP',            img:'/colddrinkbrands/Product Poster For 7up.jfif' },
  { color:'#D4A96A', label:'Lassi',          img:'/colddrinkbrands/lassi.avif' },
  { color:'#6F4E37', label:'Coffee',         img:'/colddrinkbrands/cofee_1.avif' },
]

const languages = []
// Language feature removed

const FEATURES = [
  { icon:Package,      tKey:'landing.features.inventory' },
  { icon:ShoppingCart, tKey:'landing.features.orders' },
  { icon:BarChart2,    tKey:'landing.features.analytics' },
  { icon:CreditCard,   tKey:'landing.features.credit' },
  { icon:Truck,        tKey:'landing.features.delivery' },
  { icon:TrendingUp,   tKey:'landing.features.reports' },
]

const QUICK_REPLIES = ['Products 🥤', 'Price 💰', 'Order 📦', 'Contact 📞', 'Delivery 🚚', 'Payment 💳']
// eslint-disable-next-line no-unused-vars
const _QUICK_REPLIES = QUICK_REPLIES

const VIDEOS = [
  '/videos/vecteezy_cocktail-with-ice-orange-slice-lime-and-cherry-splashing_72741146.mp4',
  '/videos/vecteezy_a-can-of-soda-with-water-droplets-on-it_50735766.mp4',
  '/videos/13737095-uhd_2160_3840_24fps.mp4',
  '/videos/14461052-uhd_2160_3840_25fps.mp4',
  '/videos/14565419_1920_1080_24fps.mp4',
  '/videos/4070180-hd_720_1280_24fps.mp4',
  '/videos/4752391-hd_1066_1920_25fps.mp4',
  '/videos/56-135731406.mp4',
  '/videos/6304139-hd_720_1080_16fps.mp4',
  '/videos/79637-570129423.mp4',
]

function getLocalReply(msg) {
  const m = msg.toLowerCase()
  if (m.match(/hello|hi|namaskar|namaste|hey/)) return '👋 Hello! Shree Ganesh Agency madhe swagat ahe! Kashi madad karu?'
  if (m.match(/product|brand|drink|coca|sprite|fanta|thums|limca|kinley/)) return '🥤 Amhi vikto: Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley\n\nSagle brands available ahet! Login karun catalog paha.'
  if (m.match(/price|rate|kimat|bhav|cost/)) return '💰 Prices products var depend kartat.\n\n• Coca-Cola 200ml - ₹20\n• Sprite 600ml - ₹45\n• Fanta 2L - ₹95\n\nLogin karun current rates paha.'
  if (m.match(/order|kharedi|buy|purchase/)) return '📦 Order place karnyasathi:\n1. Login kara\n2. Customer Dashboard la ja\n3. Products select kara\n4. Order submit kara\n\nDelivery same day milel!'
  if (m.match(/address|location|kuth|where|modnimb/)) return '📍 Shree Ganesh Agency\nModnimb, Solapur District\nMaharashtra - 413226\n\nGoogle Maps: maps.google.com/?q=Modnimb'
  if (m.match(/phone|contact|number|call/)) return '📱 Phone: +91 8329412277\n📧 Email: shreeganeshagency1517@gmail.com\n⏰ Mon-Sat, 9 AM - 7 PM'
  if (m.match(/time|hours|vel|open|close/)) return '⏰ Business Hours:\nMonday to Saturday\n9:00 AM - 7:00 PM\n\nSunday: Closed'
  if (m.match(/payment|pay|upi|gpay|phonepe/)) return '💳 Payment Methods:\n• Cash\n• UPI (PhonePe/GPay/Paytm)\n• Bank Transfer\n• Cheque\n\nUPI ID: 9960991017@ybl'
  if (m.match(/delivery|deliver|dispatch/)) return '🚚 Delivery Info:\n• Same day delivery available\n• Driver assigned after order\n• Real-time tracking in dashboard\n• Free delivery on bulk orders'
  if (m.match(/stock|available|inventory|crate/)) return '📦 Stock Info:\nLogin karun Inventory section check kara. Real-time stock levels available ahet.'
  if (m.match(/register|signup|account|new/)) return '📝 Register Steps:\n1. Sign Up button click kara\n2. Shop name, owner name, phone dya\n3. Address & village dya\n4. Username & password set kara\n5. Submit - Done!'
  if (m.match(/login|signin|password/)) return '🔐 Login karnyasathi:\n1. Login button click kara\n2. Username & password enter kara\n3. Sign In click kara\n\nNew user? Sign Up kara!'
  if (m.match(/about|agency|company|shree|ganesh/)) return '🏢 Shree Ganesh Agency\n\nAuthorized Coca-Cola distributor since 2010. Maharashtra madhe 500+ customers serve karto.\n\nColdSync Pro - Our digital management system.'
  if (m.match(/offer|discount|sale|scheme/)) return '🎁 Current Offers:\n• Bulk order discount available\n• Festival special schemes\n• Loyalty customer benefits\n\nLogin karun Offers section check kara!'
  return '🤔 Mala nit samajle nahi. Krupaya:\n📱 Call: +91 8329412277\n📧 Email: shreeganeshagency1517@gmail.com\n\nYa Contact form use kara!'
}

export default function LandingPage() {
  const { t } = useTranslation()
  const [scrolled, setScrolled]         = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [brands, setBrands]             = useState([])
  const [footerStats, setFooterStats]   = useState(null)
  const [form, setForm]                 = useState({ name:'', email:'', message:'' })
  const [formSent, setFormSent]         = useState(false)
  const [formErrors, setFormErrors]     = useState({})
  const [chatOpen, setChatOpen]         = useState(false)
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [chatMsgs, setChatMsgs]         = useState([
    { role:'bot', text:'👋 Namaskar! Mi Shree Ganesh Agency cha assistant ahe.\n\nKashi madad karu shakto? Products, prices, orders, delivery - sab kahi vicharaa!' }
  ])
  const scrollRef   = useRef(null)
  const chatEndRef  = useRef(null)
  const videoRef    = useRef(null)
  const [currentVideo, setCurrentVideo] = useState(0)
  const [videoLoaded, setVideoLoaded]   = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    axios.get('/api/products/brands/').then(r => setBrands(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    axios.get('/api/public-stats/').then(r => setFooterStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (chatOpen) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }, [chatMsgs, chatOpen])

  const goTo  = (id) => { document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); setMobileOpen(false) }
  const slide = (d)  => { if (scrollRef.current) scrollRef.current.scrollLeft += d * 300 }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate contact form
    const errs = {}
    const ne = validateContactName(form.name)
    const ee = validateEmail(form.email)
    const me = validateMessage(form.message)
    if (ne) errs.name = ne
    if (ee) errs.email = ee
    if (me) errs.message = me
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    try {
      await axios.post('/api/contact/', form)
      setFormSent(true); setForm({ name:'', email:'', message:'' })
      setTimeout(() => setFormSent(false), 4000)
    } catch { alert('Failed to send. Please try again.') }
  }

  const sendChat = async (msgOverride) => {
    const msg = (msgOverride || chatInput).trim()
    if (!msg) return
    setChatMsgs(prev => [...prev, { role:'user', text: msg }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await axios.post('/api/chatbot/chat/', { message: msg })
      const reply = res.data.reply || res.data.response || getLocalReply(msg)
      setChatMsgs(prev => [...prev, { role:'bot', text: reply }])
    } catch {
      setChatMsgs(prev => [...prev, { role:'bot', text: getLocalReply(msg) }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleVideoEnd = () => {
    const next = (currentVideo + 1) % VIDEOS.length
    setCurrentVideo(next)
    setVideoLoaded(false)
  }

  const brandList = brands.length > 0
    ? brands
    : Object.entries(BRAND_META).map(([key, v]) => ({ brand: key, ...v }))

  return (
    <>
      <div style={{ background:'#0a1628' }} className="min-h-screen">

        {/* NAV */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'shadow-2xl' : ''}`}
          style={{ background: scrolled ? 'rgba(7,9,26,0.92)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
          {/* Top accent line */}
          {scrolled && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF,#7C3AED)' }} />}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button onClick={() => goTo('home')} className="flex items-center gap-2.5 hover:scale-105 transition-transform">
                <div className="p-2 rounded-xl" style={{ background:'linear-gradient(135deg,#C00000,#F5B400)', boxShadow:'0 4px 16px rgba(192,0,0,0.4)' }}>
                  <Droplet size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <span className="block text-white font-extrabold text-base leading-none" style={{ fontFamily:"'Poppins',sans-serif", letterSpacing:'-0.02em' }}>ColdSync Pro</span>
                  <span className="block text-white/40 text-xs leading-none mt-0.5">Shree Ganesh Agency</span>
                </div>
              </button>
              <div className="hidden md:flex items-center gap-1">
                {[['home', t('nav.home')],['about', t('nav.about')],['contact', t('nav.contact')],['find-us', t('nav.findUs')]].map(([id,lbl]) => (
                  <button key={id} onClick={() => goTo(id)}
                    className="text-white/70 hover:text-white text-sm font-medium transition-all px-4 py-2 rounded-xl hover:bg-white/8">
                    {lbl}
                  </button>
                ))}
                <div className="w-px h-5 bg-white/15 mx-2" />
                <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-all px-4 py-2 rounded-xl hover:bg-white/8">{t('nav.login')}</Link>
                <Link to="/register"
                  className="ml-1 font-bold px-5 py-2.5 rounded-xl text-sm hover:scale-105 active:scale-95 transition-all"
                  style={{ background:'linear-gradient(135deg,#F5B400,#FF8C00)', color:'#07091A', boxShadow:'0 4px 16px rgba(245,180,0,0.35)' }}>
                  {t('nav.signup')}
                </Link>
                <div className="ml-2"><LanguageSwitcher /></div>
              </div>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white p-2 rounded-xl hover:bg-white/10 transition-all">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
          {mobileOpen && (
            <div className="md:hidden border-t border-white/10" style={{ background:'rgba(7,9,26,0.98)', backdropFilter:'blur(20px)' }}>
              <div className="px-4 py-4 space-y-1">
                {[['home', t('nav.home')],['about', t('nav.about')],['contact', t('nav.contact')],['find-us', t('nav.findUs')]].map(([id,lbl]) => (
                  <button key={id} onClick={() => goTo(id)} className="block w-full text-left text-white/75 py-2.5 px-3 rounded-xl hover:bg-white/8 hover:text-white text-sm transition-all">{lbl}</button>
                ))}
                <div className="pt-2 border-t border-white/8 space-y-1">
                  <Link to="/login" className="block text-white/75 py-2.5 px-3 rounded-xl hover:bg-white/8 hover:text-white text-sm transition-all" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
                  <Link to="/register" className="block text-center font-bold py-2.5 px-3 rounded-xl text-sm transition-all" style={{ background:'linear-gradient(135deg,#F5B400,#FF8C00)', color:'#07091A' }} onClick={() => setMobileOpen(false)}>{t('nav.signup')}</Link>
                </div>
                <div className="pt-2"><LanguageSwitcher /></div>
              </div>
            </div>
          )}
        </nav>

        {/* HERO */}
        <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">

          {/* ── Background layers ── */}
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={{ background:'linear-gradient(135deg,#07091A 0%,#0d0a1e 40%,#0a1628 100%)', zIndex:0 }} />
            <video
              ref={videoRef}
              key={VIDEOS[currentVideo]}
              src={VIDEOS[currentVideo]}
              muted playsInline autoPlay
              onEnded={handleVideoEnd}
              onCanPlay={() => setVideoLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
              style={{ filter:'brightness(0.45) contrast(1.1) saturate(1.2)', opacity: videoLoaded ? 1 : 0, zIndex:1 }}
            />
            {/* Multi-layer gradient overlay */}
            <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom, rgba(7,9,26,0.6) 0%, rgba(7,9,26,0.2) 40%, rgba(7,9,26,0.7) 80%, #07091A 100%)', zIndex:2 }} />
            {/* Side vignettes */}
            <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center, transparent 40%, rgba(7,9,26,0.7) 100%)', zIndex:3 }} />
          </div>

          {/* ── Animated floating orbs ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex:4 }}>
            <div className="absolute rounded-full animate-pulse" style={{ width:500, height:500, top:'-10%', left:'-5%', background:'radial-gradient(circle, rgba(192,0,0,0.12) 0%, transparent 70%)', animationDuration:'4s' }} />
            <div className="absolute rounded-full animate-pulse" style={{ width:400, height:400, top:'20%', right:'-8%', background:'radial-gradient(circle, rgba(245,180,0,0.1) 0%, transparent 70%)', animationDuration:'6s', animationDelay:'1s' }} />
            <div className="absolute rounded-full animate-pulse" style={{ width:300, height:300, bottom:'15%', left:'10%', background:'radial-gradient(circle, rgba(30,111,255,0.08) 0%, transparent 70%)', animationDuration:'5s', animationDelay:'2s' }} />
          </div>

          {/* ── Floating particles ── */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex:4 }}>
            {[...Array(18)].map((_, i) => (
              <div key={i} className="absolute rounded-full animate-pulse"
                style={{
                  width: Math.random() * 4 + 2,
                  height: Math.random() * 4 + 2,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: ['#F5B400','#C00000','#1E6FFF','#00C864'][i % 4],
                  opacity: Math.random() * 0.5 + 0.2,
                  animationDuration: `${Math.random() * 3 + 2}s`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>

          {/* ── Main content ── */}
          <div className="relative text-center px-6 max-w-4xl mx-auto" style={{ zIndex:5 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold mb-8"
              style={{
                background:'rgba(245,180,0,0.12)',
                border:'1px solid rgba(245,180,0,0.35)',
                color:'#F5B400',
                backdropFilter:'blur(12px)',
                letterSpacing:'0.06em',
                boxShadow:'0 0 20px rgba(245,180,0,0.15)',
              }}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              🥤 Authorized Cold Drink Distributor Since 2010
            </div>

            {/* Heading */}
            <h1 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em', fontSize:'clamp(2.8rem,7vw,5.5rem)' }} className="mb-6">
              <span className="block text-white" style={{ textShadow:'0 4px 30px rgba(0,0,0,0.8)' }}>
                {t('landing.heroWelcome')}
              </span>
              <span className="block relative" style={{
                background:'linear-gradient(135deg, #F5B400 0%, #FF8C00 40%, #F5B400 80%)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                filter:'drop-shadow(0 4px 20px rgba(245,180,0,0.4))',
              }}>
                {t('landing.heroName')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/85 mb-3 mx-auto max-w-2xl" style={{ fontFamily:"'Inter',sans-serif", fontWeight:500, fontSize:'clamp(1rem,2.5vw,1.2rem)', lineHeight:1.7, textShadow:'0 2px 20px rgba(0,0,0,0.8)' }}>
              {t('landing.heroSubtitle')}
            </p>
            <p className="mb-10 mx-auto max-w-xl" style={{ fontFamily:"'Inter',sans-serif", fontWeight:400, fontSize:'clamp(0.85rem,1.8vw,1rem)', lineHeight:1.7, color:'rgba(255,255,255,0.6)', textShadow:'0 2px 16px rgba(0,0,0,0.8)' }}>
              {t('landing.heroDesc')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link to="/login"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full text-white font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                style={{ fontFamily:"'Poppins',sans-serif", fontSize:'clamp(0.95rem,2vw,1.05rem)', background:'linear-gradient(135deg,#C00000,#8B0000)', boxShadow:'0 8px 40px rgba(192,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)' }}>
                {t('hero.getStarted')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                style={{ fontFamily:"'Poppins',sans-serif", fontSize:'clamp(0.9rem,2vw,1rem)', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.25)', color:'#fff', backdropFilter:'blur(12px)', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
                {t('landing.signupFree')}
              </Link>
            </div>

            {/* ── Glassmorphism stats strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { num:'500+', label:'Happy Customers', icon:'👥', color:'#F5B400' },
                { num:'15+',  label:'Years of Trust',  icon:'🏆', color:'#1E6FFF' },
                { num:'25+',  label:'Brands',          icon:'🥤', color:'#00C864' },
                { num:'24/7', label:'Digital Access',  icon:'📱', color:'#7C3AED' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center py-3 px-2 rounded-2xl"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(16px)', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
                  <span className="text-xl mb-1">{s.icon}</span>
                  <span className="font-extrabold text-lg leading-none" style={{ color:s.color, fontFamily:"'Poppins',sans-serif" }}>{s.num}</span>
                  <span className="text-white/50 text-xs mt-0.5 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ zIndex:5 }}>
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1.5">
              <div className="w-1 h-3 bg-white/50 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20 relative overflow-hidden" style={{ background:'linear-gradient(180deg,#0a1628,#0d1b35)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background:'radial-gradient(circle,rgba(192,0,0,0.05),transparent 70%)' }} />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background:'rgba(192,0,0,0.12)', color:'#FF6666', border:'1px solid rgba(192,0,0,0.25)' }}>{t('landing.features.badge')}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3" style={{ fontFamily:"'Poppins',sans-serif" }}>{t('landing.features.title')} <span style={{ color:'#F5B400' }}>ColdSync Pro?</span></h2>
              <p className="text-white/50 text-base max-w-xl mx-auto" style={{ fontFamily:"'Inter',sans-serif" }}>{t('landing.features.desc')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <div key={i} className="p-6 rounded-2xl border border-white/10 hover:border-yellow-500/40 hover:bg-white/5 transition-all group" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background:'linear-gradient(135deg,#C00000,#F5B400)' }}>
                    <f.icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{t(`${f.tKey}.title`)}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{t(`${f.tKey}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS */}
        <section className="py-20 overflow-hidden relative" style={{ background:'linear-gradient(180deg,#0d1b35,#0a1628)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full" style={{ background:'radial-gradient(circle,rgba(245,180,0,0.05),transparent 70%)', transform:'translate(30%,-30%)' }} />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full" style={{ background:'radial-gradient(circle,rgba(30,111,255,0.05),transparent 70%)', transform:'translate(-30%,30%)' }} />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background:'rgba(245,180,0,0.12)', color:'#F5B400', border:'1px solid rgba(245,180,0,0.25)' }}>{t('landing.brands.badge')}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2" style={{ fontFamily:"'Poppins',sans-serif" }}>{t('landing.brands.title')}</h2>
              <p className="text-white/50 text-sm" style={{ fontFamily:"'Inter',sans-serif" }}>{t('landing.brands.desc')}</p>
            <div className="flex justify-center mt-6 mb-2">
              <a href="/catalog" className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all" style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {t('landing.brands.orderNow')}
              </a>
            </div>
            </div>
            <div className="relative">
              <button onClick={() => slide(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all" style={{zIndex:10}}><ChevronLeft size={20} /></button>
              <div ref={scrollRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-4 px-6" style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
                {BRAND_META.map((meta, i) => (
                  <div key={i} className="flex-shrink-0 w-40 rounded-2xl overflow-hidden cursor-pointer group relative"
                    style={{ minHeight:'220px', background:`linear-gradient(160deg,${meta.color}22,${meta.color}08)`, border:`1px solid ${meta.color}33`, boxShadow:`0 4px 24px ${meta.color}22` }}>
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl" style={{ background:`linear-gradient(160deg,${meta.color}18,${meta.color}06)`, boxShadow:`inset 0 0 30px ${meta.color}22` }} />
                    {/* Shine sweep */}
                    <div className="absolute inset-0 translate-x-[-150%] group-hover:translate-x-[200%] transition-transform duration-600 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 z-10 pointer-events-none" />
                    {/* Image fills card */}
                    <div className="absolute inset-0 flex items-end justify-center" style={{ paddingBottom:'44px' }}>
                      <img
                        src={meta.img}
                        alt={meta.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        style={{ objectPosition:'center', filter:'brightness(1.05) saturate(1.1)' }}
                        onError={e => { e.target.src = ''; e.target.style.display='none' }}
                      />
                    </div>
                    {/* Bottom gradient + name */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-3 z-20" style={{ background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}>
                      <p className="text-white font-bold text-xs text-center leading-tight">{meta.label}</p>
                    </div>
                    {/* Color accent top bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 z-20" style={{ background: meta.color }} />
                  </div>
                ))}
              </div>
              <button onClick={() => slide(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all" style={{zIndex:10}}><ChevronRight size={20} /></button>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-20 relative overflow-hidden" style={{ background:'linear-gradient(180deg,#0a1628 0%,#0d1b35 50%,#0a1628 100%)' }}>
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background:'radial-gradient(circle,rgba(245,180,0,0.06),transparent 70%)', transform:'translateY(-50%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background:'rgba(245,180,0,0.12)', color:'#F5B400', border:'1px solid rgba(245,180,0,0.25)' }}>{t('landing.about.badge')}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3" style={{ fontFamily:"'Poppins',sans-serif" }}>{t('landing.about.title')}</h2>
              <p className="text-white/50 text-base max-w-xl mx-auto" style={{ fontFamily:"'Inter',sans-serif" }}>{t('landing.about.desc')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                {num:'500+', tKey:'landing.about.stats.customers', color:'#F5B400'},
                {num:'15+',  tKey:'landing.about.stats.years',     color:'#1E6FFF'},
                {num:'17+',  tKey:'landing.about.stats.brands',    color:'#00C864'},
                {num:'100%', tKey:'landing.about.stats.digital',   color:'#7C3AED'},
              ].map((s,i) => (
                <div key={i} className="text-center p-5 rounded-2xl border border-white/8 hover:border-white/20 transition-all" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <p className="text-3xl font-extrabold mb-1" style={{ color:s.color }}>{s.num}</p>
                  <p className="text-white/50 text-xs font-medium">{t(s.tKey)}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2 p-6 rounded-2xl border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                <h3 className="text-lg font-bold text-white mb-3">{t('landing.about.whoWeAre')}</h3>
                <p className="text-white/65 text-sm leading-relaxed mb-4">{t('landing.about.whoDesc')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {icon:'📦', tKey:'landing.about.features.inventory'},
                    {icon:'🚚', tKey:'landing.about.features.delivery'},
                    {icon:'💳', tKey:'landing.about.features.credit'},
                    {icon:'📊', tKey:'landing.about.features.billing'},
                    {icon:'📱', tKey:'landing.about.features.whatsapp'},
                    {icon:'🤖', tKey:'landing.about.features.ai'},
                  ].map((item,i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-white/65 text-xs">{t(item.tKey)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-2xl border border-yellow-500/20" style={{ background:'linear-gradient(135deg,rgba(245,180,0,0.08),rgba(245,180,0,0.03))' }}>
                <h3 className="text-base font-bold text-white mb-4">{t('landing.about.quickInfo')}</h3>
                <div className="space-y-3">
                  {[{icon:'📍',label:'Modnimb, Solapur, MH'},{icon:'📱',label:'+91 8329412277'},{icon:'✉️',label:'shreeganeshagency1517@gmail.com'},{icon:'⏰',label:'Mon–Sat: 9 AM – 7 PM'},{icon:'💳',label:'UPI: 9960991017@ybl'}].map(({icon,label},i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                      <span className="text-white/70 text-xs leading-relaxed">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-1">
                  {['Coca-Cola','Sprite','Fanta','Pepsi','Red Bull','Monster','Sting','Maaza','+8 more'].map(b => (
                    <span key={b} className="px-2 py-0.5 rounded-full text-xs text-white/55 border border-white/10" style={{ background:'rgba(255,255,255,0.05)' }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4" style={{ background:'linear-gradient(135deg,rgba(192,0,0,0.08),rgba(245,180,0,0.04))' }}>
              <p className="text-white font-semibold text-sm">{t('landing.about.readyMsg')}</p>
              <div className="flex gap-3">
                <Link to="/register" className="px-5 py-2 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all" style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>{t('landing.about.registerNow')}</Link>
                <button onClick={() => goTo('contact')} className="px-5 py-2 rounded-xl text-white font-semibold text-sm hover:bg-white/10 transition-all border border-white/20">{t('landing.about.contactUs')}</button>
              </div>
            </div>
          </div>
        </section>
        {/* CONTACT */}
        <section id="contact" className="py-20 relative overflow-hidden" style={{ background:'linear-gradient(180deg,#0a1628,#0d1b35)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full" style={{ background:'radial-gradient(circle,rgba(0,200,100,0.05),transparent 70%)', transform:'translate(-40%,-50%)' }} />
            <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full" style={{ background:'radial-gradient(circle,rgba(124,58,237,0.05),transparent 70%)', transform:'translate(40%,-50%)' }} />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background:'rgba(0,200,100,0.12)', color:'#00C864', border:'1px solid rgba(0,200,100,0.25)' }}>{t('landing.contact.badge')}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2" style={{ fontFamily:"'Poppins',sans-serif" }}>{t('landing.contact.title')}</h2>
              <p className="text-white/50 text-sm">{t('landing.contact.desc')}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-2xl p-6 border border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                <h3 className="text-xl font-bold text-white mb-1">{t('landing.contact.sendMsg')}</h3>
                <p className="text-white/40 text-xs mb-5">{t('landing.contact.replyTime')}</p>
                {formSent && (
                  <div className="mb-4 p-3 rounded-xl text-sm text-white flex items-center gap-2" style={{ background:'rgba(0,200,100,0.15)', border:'1px solid rgba(0,200,100,0.3)' }}>
                    <span>✅</span> {t('landing.contact.sentMsg')}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {[
                    {key:'name',  labelKey:'landing.contact.yourName', type:'text',  ph:'Ramesh Patil'},
                    {key:'email', labelKey:'contact.email',             type:'email', ph:'ramesh@gmail.com'},
                  ].map(({key,labelKey,type,ph}) => (
                    <div key={key}>
                      <label className="block text-white/60 text-xs mb-1.5">{t(labelKey)}</label>
                      <input type={type} value={form[key]} onChange={e => { setForm({...form,[key]:e.target.value}); setFormErrors(fe => ({...fe,[key]:''})) }} placeholder={ph}
                        className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${formErrors[key] ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                      {formErrors[key] && <p className="text-red-400 text-xs mt-1">⚠ {formErrors[key]}</p>}
                    </div>
                  ))}
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5">{t('contact.message')}</label>
                    <textarea value={form.message} onChange={e => { setForm({...form,message:e.target.value}); setFormErrors(fe => ({...fe,message:''})) }} placeholder="How can we help you? (min 10 characters)"
                      className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all resize-none"
                      style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${formErrors.message ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} rows={3} maxLength={1000} />
                    {formErrors.message && <p className="text-red-400 text-xs mt-1">⚠ {formErrors.message}</p>}
                    <p className="text-white/20 text-xs mt-1">{form.message.length}/1000</p>
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                    style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>{t('landing.contact.sendBtn')}</button>
                </form>
              </div>
              <div className="space-y-3">
                {[
                  {icon:Phone,  labelKey:'landing.contact.callUs',   value:'+91 8329412277',                        href:'tel:+918329412277',                                    color:'#00C864',bg:'rgba(0,200,100,0.1)',  bd:'rgba(0,200,100,0.2)'},
                  {icon:Mail,   labelKey:'landing.contact.emailUs',  value:'shreeganeshagency1517@gmail.com',        href:'mailto:shreeganeshagency1517@gmail.com',               color:'#1E6FFF',bg:'rgba(30,111,255,0.1)',bd:'rgba(30,111,255,0.2)'},
                  {icon:MapPin, labelKey:'landing.contact.visitUs',  value:'Modnimb, Solapur District, MH - 413226',href:'https://maps.google.com/?q=Modnimb',                   color:'#F5B400',bg:'rgba(245,180,0,0.1)', bd:'rgba(245,180,0,0.2)'},
                ].map(({icon:Icon,labelKey,value,href,color,bg,bd},i) => (
                  <a key={i} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                    style={{ background:bg, border:`1px solid ${bd}` }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${color}22` }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-0.5">{t(labelKey)}</p>
                      <p className="text-white font-semibold text-sm">{value}</p>
                    </div>
                  </a>
                ))}
                <a href="https://wa.me/919822851017" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                  style={{ background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.25)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(37,211,102,0.15)' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882a.5.5 0 0 0 .606.61l6.198-1.63A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.373l-.36-.214-3.724.979.995-3.63-.234-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs mb-0.5">WhatsApp</p>
                    <p className="text-green-400 font-semibold text-sm">{t('landing.contact.whatsappChat')}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FIND US */}
        <section id="find-us" className="py-16 relative" style={{ background:'linear-gradient(180deg,#0d1b35,#0a1628)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background:'rgba(30,111,255,0.12)', color:'#74b9ff', border:'1px solid rgba(30,111,255,0.25)' }}>{t('landing.findUs.badge')}</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2" style={{ fontFamily:"'Poppins',sans-serif" }}>{t('landing.findUs.title')}</h2>
              <p className="text-white/50 text-sm" style={{ fontFamily:"'Inter',sans-serif" }}>Modnimb, Solapur District, Maharashtra - 413226</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {/* Info cards */}
              <div className="space-y-4">
                {[
                  { icon:'📍', tKey:'landing.findUs.address',  value:'Modnimb, Solapur District, Maharashtra - 413226', color:'#F5B400' },
                  { icon:'📱', tKey:'landing.findUs.phone',    value:'+91 8329412277',                                  color:'#00C864' },
                  { icon:'⏰', tKey:'landing.findUs.hours',    value:t('landing.findUs.hoursVal'),                      color:'#1E6FFF' },
                  { icon:'💳', tKey:'landing.findUs.upi',      value:'9960991017@ybl',                                  color:'#7C3AED' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                    style={{ background:'rgba(255,255,255,0.04)' }}>
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: item.color }}>{t(item.tKey)}</p>
                      <p className="text-white/70 text-sm whitespace-pre-line">{item.value}</p>
                    </div>
                  </div>
                ))}
                <a
                  href="https://maps.google.com/?q=Modnimb,Solapur,Maharashtra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-sm hover:opacity-90 transition-all"
                  style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                  <MapPin size={16} /> {t('landing.findUs.openMaps')}
                </a>
              </div>
              {/* Map embed */}
              <div className="md:col-span-2 rounded-2xl overflow-hidden border border-white/10" style={{ height:'380px' }}>
                <iframe
                  title="Shree Ganesh Agency - Find Us"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30276!2d75.65!3d17.68!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc5c0000000001%3A0x1!2sModnimb%2C+Maharashtra!5e0!3m2!1sen!2sin!4v1"
                  width="100%"
                  height="100%"
                  style={{ border:0, display:'block', filter:'invert(90%) hue-rotate(180deg)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background:'linear-gradient(180deg,#07091A 0%,#050710 100%)', borderTop:'1px solid rgba(255,255,255,0.08)' }} className="pt-14 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Top grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 pb-10" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>

              {/* Brand col */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2 rounded-xl"><Droplet size={20} className="text-white" /></div>
                  <div>
                    <p className="text-white font-bold text-base">ColdSync Pro</p>
                    <p className="text-white/40 text-xs">Shree Ganesh Agency</p>
                  </div>
                </div>
                <p className="text-white/40 text-sm leading-relaxed mb-5">{t('landing.footer.tagline')}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {BRAND_META.slice(0,6).map(b => (
                    <span key={b.label} className="px-2 py-0.5 rounded-full text-xs font-medium text-white/60 border border-white/10" style={{ background:'rgba(255,255,255,0.05)' }}>{b.label}</span>
                  ))}
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white/40 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>+12 more</span>
                </div>
                <div className="flex gap-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/40 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 transition-all"><Facebook size={15} /></a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/40 hover:text-white hover:border-sky-400 hover:bg-sky-400/10 transition-all"><Twitter size={15} /></a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/40 hover:text-white hover:border-pink-500 hover:bg-pink-500/10 transition-all"><Instagram size={15} /></a>
                  <a href="https://wa.me/919822851017" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/40 hover:text-green-400 hover:border-green-500 hover:bg-green-500/10 transition-all">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.882a.5.5 0 0 0 .606.61l6.198-1.63A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.373l-.36-.214-3.724.979.995-3.63-.234-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-5 flex items-center gap-2">
                  <span className="w-4 h-0.5 rounded" style={{background:'#F5B400'}} />{t('landing.footer.quickLinks')}
                </h4>
                <ul className="space-y-3">
                  {[
                    { tKey:'landing.footer.links.home',     action: () => goTo('home') },
                    { tKey:'landing.footer.links.about',    action: () => goTo('about') },
                    { tKey:'landing.footer.links.ourBrands',action: () => goTo('about') },
                    { tKey:'landing.footer.links.contact',  action: () => goTo('contact') },
                    { tKey:'landing.footer.links.login',    to: '/login' },
                    { tKey:'landing.footer.links.register', to: '/register' },
                  ].map(item => (
                    <li key={item.tKey}>
                      {item.to
                        ? <Link to={item.to} className="text-white/45 hover:text-yellow-400 text-sm transition-colors flex items-center gap-2 group">
                            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-yellow-400 transition-colors" />{t(item.tKey)}
                          </Link>
                        : <button onClick={item.action} className="text-white/45 hover:text-yellow-400 text-sm transition-colors flex items-center gap-2 group text-left">
                            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-yellow-400 transition-colors" />{t(item.tKey)}
                          </button>
                      }
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Agency Stats */}
              <div>
                <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-5 flex items-center gap-2">
                  <span className="w-4 h-0.5 rounded" style={{background:'#1E6FFF'}} />{t('landing.footer.liveStats')}
                </h4>
                <div className="space-y-3">
                  {[
                    { icon:'📦', tKey:'landing.footer.stats.orders',    key:'total_orders',     color:'#74b9ff' },
                    { icon:'🚚', tKey:'landing.footer.stats.delivered',  key:'delivered_orders', color:'#00C864' },
                    { icon:'👥', tKey:'landing.footer.stats.customers',  key:'total_customers',  color:'#a29bfe' },
                    { icon:'🥤', tKey:'landing.footer.stats.products',   key:'total_products',   color:'#F5B400' },
                    { icon:'🏷️', tKey:'landing.footer.stats.brands',    key:'total_brands',     color:'#ff6b6b' },
                    { icon:'💰', tKey:'landing.footer.stats.revenue',    key:'total_revenue',    color:'#00C864', prefix:'₹', isK:true },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-white/45 text-xs flex items-center gap-1.5">
                        <span>{s.icon}</span>{t(s.tKey)}
                      </span>
                      <span className="font-bold text-xs" style={{ color: s.color }}>
                        {footerStats
                          ? s.isK
                            ? `${s.prefix || ''}${((footerStats[s.key] || 0) / 1000).toFixed(1)}K`
                            : `${s.prefix || ''}${(footerStats[s.key] || 0).toLocaleString('en-IN')}`
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-white/20 text-xs mt-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  {t('landing.footer.liveData')}
                </p>
              </div>

              {/* Contact */}
              <div className="min-w-0 lg:col-span-2">
                <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-5 flex items-center gap-2">
                  <span className="w-4 h-0.5 rounded" style={{background:'#00C864'}} />{t('landing.footer.contactUs')}
                </h4>
                <div className="space-y-3">
                  <a href="tel:+918329412277" className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{background:'rgba(245,180,0,0.12)'}}>
                      <Phone size={14} style={{color:'#F5B400'}} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/30 text-xs">Phone</p>
                      <p className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">+91 8329412277</p>
                    </div>
                  </a>
                  <a href="mailto:shreeganeshagency1517@gmail.com" className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{background:'rgba(245,180,0,0.12)'}}>
                      <Mail size={14} style={{color:'#F5B400'}} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/30 text-xs">Email</p>
                      <p className="text-white/70 text-sm font-medium group-hover:text-white transition-colors break-all">shreeganeshagency1517@gmail.com</p>
                    </div>
                  </a>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:'rgba(245,180,0,0.12)'}}>
                      <MapPin size={14} style={{color:'#F5B400'}} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/30 text-xs">Address</p>
                      <p className="text-white/70 text-sm">Modnimb, Solapur District,<br/>Maharashtra - 413226</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:'rgba(245,180,0,0.12)'}}>
                      <span className="text-xs" style={{color:'#F5B400'}}>⏰</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/30 text-xs">Hours</p>
                      <p className="text-white/70 text-sm whitespace-nowrap">Mon–Sat: 9 AM – 7 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white/25 text-xs">
                <Droplet size={12} style={{color:'#F5B400'}} />
                <span>© {new Date().getFullYear()} ColdSync Pro — Shree Ganesh Agency. {t('landing.footer.allRights')}</span>
              </div>
              <div className="flex items-center gap-4 text-white/25 text-xs">
                <button onClick={() => goTo('home')} className="hover:text-white transition-colors">Home</button>
                <span className="text-white/10">|</span>
                <button onClick={() => goTo('about')} className="hover:text-white transition-colors">About</button>
                <span className="text-white/10">|</span>
                <button onClick={() => goTo('contact')} className="hover:text-white transition-colors">Contact</button>
                <span className="text-white/10">|</span>
                <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                <span className="text-white/10">|</span>
                <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              </div>
            </div>
          </div>
        </footer>

      </div>

    </>
  )
}
