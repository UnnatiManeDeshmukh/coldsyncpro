import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import NotificationBell from '../components/NotificationBell'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import {
  validatePhone, validateEmail, validateName, validateSafeText,
  validateAmount, validateExpenseName, validateExpenseDate,
  validateProductName, validateBrand, validateCrateSize, validateRate, validateExpiryDate,
  validateSupplierName,
} from '../utils/validators'

const NAV_IDS = [
  { id:'dashboard',  icon:'📊' },
  { id:'orders',     icon:'📦' },
  { id:'delivery',   icon:'🚚' },
  { id:'customers',  icon:'👥' },
  { id:'inventory',  icon:'🏭' },
  { id:'products',   icon:'🥤' },
  { id:'billing',    icon:'🧾' },
  { id:'payments',   icon:'💰' },
  { id:'credits',    icon:'💳' },
  { id:'expenses',   icon:'💸' },
  { id:'suppliers',  icon:'🏪' },
  { id:'returns',    icon:'↩️' },
  { id:'offers',     icon:'🎁' },
  { id:'reports',    icon:'📈' },
  { id:'profit',     icon:'📉' },
  { id:'chatbot',    icon:'🤖' },
  { id:'notifs',     icon:'🔔' },
  { id:'users',      icon:'🔐' },
  { id:'audit',      icon:'🕵️' },
]

const safe = (res) => res.status === 'fulfilled' ? res.value.data : null

const PAYMENT_STATUSES  = ['Pending','Partial','Paid']
const DELIVERY_STATUSES = ['Order Placed','Processing','Out for Delivery','Delivered','Cancelled']
const EXPENSE_CATS      = ['Salary','Rent','Utilities','Maintenance','Transport','Other']

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ background:'#0d1b35' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0" style={{ background:'#0d1b35' }}>
          <p className="text-white font-bold text-sm">{title}</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Badge({ val }) {
  const map = {
    Paid:               { bg:'rgba(0,200,100,0.15)',  color:'#00C864' },
    Partial:            { bg:'rgba(245,180,0,0.15)',  color:'#F5B400' },
    Pending:            { bg:'rgba(192,0,0,0.15)',    color:'#ff6b6b' },
    Delivered:          { bg:'rgba(0,200,100,0.15)',  color:'#00C864' },
    Cancelled:          { bg:'rgba(192,0,0,0.15)',    color:'#ff6b6b' },
    'Order Placed':     { bg:'rgba(30,111,255,0.15)', color:'#74b9ff' },
    Processing:         { bg:'rgba(245,180,0,0.15)',  color:'#F5B400' },
    'Out for Delivery': { bg:'rgba(124,58,237,0.15)', color:'#a29bfe' },
    Approved:           { bg:'rgba(0,200,100,0.15)',  color:'#00C864' },
    Rejected:           { bg:'rgba(192,0,0,0.15)',    color:'#ff6b6b' },
    Completed:          { bg:'rgba(30,111,255,0.15)', color:'#74b9ff' },
    Received:           { bg:'rgba(0,200,100,0.15)',  color:'#00C864' },
    Active:             { bg:'rgba(0,200,100,0.15)',  color:'#00C864' },
  }
  const s = map[val] || { bg:'rgba(255,255,255,0.1)', color:'#aaa' }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={s}>{val}</span>
}

function Field({ label, value, set, type='text', options }) {
  return (
    <div>
      <label className="text-white/50 text-xs block mb-1">{label}</label>
      {options ? (
        <select value={value} onChange={e => set(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)' }}>
          {options.map(o => <option key={o} value={o} style={{ background:'#0d1b35' }}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => set(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)' }} />
      )}
    </div>
  )
}

function Btn({ onClick, disabled, color='#C00000', children, full }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${full?'w-full':'px-4'} py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50`}
      style={{ background: color }}>
      {children}
    </button>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const NAV = NAV_IDS.map(n => ({ ...n, label: t(`admin.nav.${n.id}`) }))
  const [data, setData]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')

  // Modal form state — all at top level to avoid hooks-in-render violation
  const [mDs, setMDs]       = useState('')
  const [mDn, setMDn]       = useState('')
  const [mDp, setMDp]       = useState('')
  const [mDv, setMDv]       = useState('')
  const [mNo, setMNo]       = useState('')
  const [mSd, setMSd]       = useState('')
  const [mCr, setMCr]       = useState(0)
  const [mBt, setMBt]       = useState(0)
  const [mNotes, setMNotes] = useState('')
  const [mName, setMName]   = useState('')
  const [mCat, setMCat]     = useState('Other')
  const [mAmt, setMAmt]     = useState('')
  const [mDt, setMDt]       = useState('')
  const [mNt, setMNt]       = useState('')
  const [mNm, setMNm]       = useState('')
  const [mCp, setMCp]       = useState('')
  const [mPh, setMPh]       = useState('')
  const [mEm, setMEm]       = useState('')
  const [mSelTxn, setMSelTxn] = useState('')
  const [mProdNm, setMProdNm] = useState('')
  const [mProdBr, setMProdBr] = useState('CocaCola')
  const [mProdSz, setMProdSz] = useState('600ml')
  const [mProdImg, setMProdImg] = useState(null)
  const [mProdImgPreview, setMProdImgPreview] = useState(null)
  const [mProdCs, setMProdCs] = useState('24')
  const [mProdRt, setMProdRt] = useState('')
  const [mProdEx, setMProdEx] = useState('')
  const [mStockPid, setMStockPid] = useState('')
  const [mStockWh, setMStockWh]   = useState('Main Warehouse')
  const [mStockCr, setMStockCr]   = useState('0')
  const [mStockBt, setMStockBt]   = useState('0')
  const [mPoSup, setMPoSup]   = useState('')
  const [mPoPid, setMPoPid]   = useState('')
  const [mPoQty, setMPoQty]   = useState('1')
  const [mPoPrice, setMPoPrice] = useState('')
  const [mOrdCust, setMOrdCust] = useState('')
  const [mOrdItems, setMOrdItems] = useState([{ product_id:'', qty:1 }])
  const [mOrdPay, setMOrdPay]   = useState('Pending')

  // Notification send form state
  const [mNotifTarget, setMNotifTarget] = useState('all')
  const [mNotifTitle, setMNotifTitle]   = useState('')
  const [mNotifMsg, setMNotifMsg]       = useState('')
  const [mNotifType, setMNotifType]     = useState('general')
  // Chat session detail
  const [chatMsgs, setChatMsgs] = useState([])
  // Offer form state
  const [mOfferTitle, setMOfferTitle]   = useState('')
  const [mOfferDesc, setMOfferDesc]     = useState('')
  const [mOfferTag, setMOfferTag]       = useState('')
  const [mOfferEmoji, setMOfferEmoji]   = useState('🎁')
  const [mOfferAccent, setMOfferAccent] = useState('gold')
  const [mOfferExp, setMOfferExp]       = useState('')
  const [mOfferActive, setMOfferActive] = useState(true)
  // Driver form state
  const [mDrvName, setMDrvName]   = useState('')
  const [mDrvPhone, setMDrvPhone] = useState('')
  const [mDrvEmail, setMDrvEmail] = useState('')
  const [mDrvVeh, setMDrvVeh]     = useState('')
  const [mDrvType, setMDrvType]   = useState('Truck')
  // UPI config state
  const [upiConfig, setUpiConfig] = useState(null)
  // UPI edit form state
  const [mUpiId, setMUpiId]     = useState('')
  const [mUpiName, setMUpiName] = useState('')
  const [mUpiBank, setMUpiBank] = useState('')
  const [mUpiImg, setMUpiImg]   = useState(null)
  const [mUpiImgPreview, setMUpiImgPreview] = useState(null)
  // Add customer form state
  const [mCustShop, setMCustShop]   = useState('')
  const [mCustOwner, setMCustOwner] = useState('')
  const [mCustPhone, setMCustPhone] = useState('')
  const [mCustVill, setMCustVill]   = useState('')
  const [mCustAddr, setMCustAddr]   = useState('')
  const [mCustCred, setMCustCred]   = useState('50000')
  // New feature state
  const [selectedOrders, setSelectedOrders] = useState(new Set())
  const [mBroadcastMsg, setMBroadcastMsg]   = useState('')
  const [mEditCredit, setMEditCredit]       = useState('')

  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  // Reset modal state when modal opens
  const openModal = (m) => {
    setModal(m)
    if (!m) return
    const item = m.item || {}
    if (m.type === 'del-status' || m.type === 'assign-driver') {
      setMDs(item.delivery_status || '')
      setMDn(item.delivery_driver || '')
      setMDp(item.delivery_driver_phone || '')
      setMDv(item.delivery_vehicle || '')
      setMNo(item.delivery_notes || '')
      setMSd('')
    }
    if (m.type === 'stock-edit') { setMCr(item.total_crates||0); setMBt(item.total_bottles||0) }
    if (m.type === 'return-approve' || m.type === 'return-reject') setMNotes('')
    if (m.type === 'add-expense') { setMName(''); setMCat('Other'); setMAmt(''); setMDt(new Date().toISOString().split('T')[0]); setMNt('') }
    if (m.type === 'add-supplier') { setMNm(''); setMCp(''); setMPh(''); setMEm('') }
    if (m.type === 'add-product') { setMProdNm(''); setMProdBr('CocaCola'); setMProdSz('600ml'); setMProdCs('24'); setMProdRt(''); setMProdEx(''); setMProdImg(null); setMProdImgPreview(null) }
    if (m.type === 'edit-product') { setMProdNm(item.product_name||''); setMProdBr(item.brand||'CocaCola'); setMProdSz(item.bottle_size||'600ml'); setMProdCs(String(item.crate_size||24)); setMProdRt(String(item.rate_per_bottle||'')); setMProdEx(item.expiry_date||''); setMProdImg(null); setMProdImgPreview(item.image_url||null) }
    if (m.type === 'add-stock') { setMStockPid(''); setMStockWh('Main Warehouse'); setMStockCr('0'); setMStockBt('0') }
    if (m.type === 'add-po') { setMPoSup(''); setMPoPid(''); setMPoQty('1'); setMPoPrice('') }
    if (m.type === 'add-order') { setMOrdCust(''); setMOrdItems([{product_id:'',qty:1}]); setMOrdPay('Pending') }
    if (m.type === 'credit-pay') { setMAmt('') }
    if (m.type === 'add-offer') { setMOfferTitle(''); setMOfferDesc(''); setMOfferTag(''); setMOfferEmoji('🎁'); setMOfferAccent('gold'); setMOfferExp(''); setMOfferActive(true) }
    if (m.type === 'edit-offer') { setMOfferTitle(item.title||''); setMOfferDesc(item.description||''); setMOfferTag(item.tag||''); setMOfferEmoji(item.emoji||'🎁'); setMOfferAccent(item.accent||'gold'); setMOfferExp(item.expires_at?.split('T')[0]||''); setMOfferActive(item.is_active!==false) }
    if (m.type === 'add-driver') { setMDrvName(''); setMDrvPhone(''); setMDrvEmail(''); setMDrvVeh(''); setMDrvType('Truck') }
    if (m.type === 'send-notif') { setMNotifTarget('all'); setMNotifTitle(''); setMNotifMsg(''); setMNotifType('general') }
    if (m.type === 'wa-broadcast') { setMBroadcastMsg('') }
    if (m.type === 'edit-credit') { setMEditCredit(String(m.item?.credit_limit || '')) }
    if (m.type === 'edit-upi') { setMUpiId(item.upi_id||''); setMUpiName(item.upi_name||''); setMUpiBank(item.bank_name||''); setMUpiImg(null); setMUpiImgPreview(item.qr_image_url||null) }
    if (m.type === 'add-customer') { setMCustShop(''); setMCustOwner(''); setMCustPhone(''); setMCustVill(''); setMCustAddr(''); setMCustCred('50000') }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Tab → which API calls are needed — useMemo so it doesn't recreate on every render
  const TAB_APIS = useMemo(() => ({
    dashboard: async () => {
      const r = await Promise.allSettled([
        api.get('/api/analytics/dashboard/'),
        api.get('/api/analytics/revenue-chart/'),
        api.get('/api/analytics/top-customers/'),
        api.get('/api/analytics/brand-sales/'),
        api.get('/api/analytics/profit/?period=month'),
        api.get('/api/analytics/expenses/summary/'),
        api.get('/api/inventory/alerts/'),
        api.get('/api/analytics/todays-orders/'),
      ])
      const [summary, revChart, topCust, brandSales, profit, expSummary, invAlerts, todaysOrders] = r
      if (summary.status === 'rejected' && summary.reason?.response?.status === 401) {
        localStorage.clear(); navigate('/login'); return {}
      }
      return {
        summary: safe(summary), revenue: safe(revChart)?.revenue_chart || [],
        topCust: safe(topCust)?.top_customers || [], brandSales: safe(brandSales)?.brand_sales || [],
        profit: safe(profit), expSummary: safe(expSummary), invAlerts: safe(invAlerts)?.alerts || [],
        todaysOrders: safe(todaysOrders),
      }
    },
    orders: async () => {
      const r = await Promise.allSettled([
        api.get('/api/orders/list/?ordering=-order_date'),
        api.get('/api/customers/?ordering=shop_name'),
        api.get('/api/products/'),
      ])
      const [orders, customers, products] = r
      return { orders: safe(orders)?.results || safe(orders) || [], customers: safe(customers)?.results || safe(customers) || [], products: safe(products)?.results || safe(products) || [] }
    },
    delivery: async () => {
      const r = await Promise.allSettled([api.get('/api/orders/delivery/'), api.get('/api/orders/drivers/')])
      const [delivery, drivers] = r
      return { delivery: safe(delivery)?.orders || [], drivers: safe(drivers) || [] }
    },
    customers: async () => {
      const r = await Promise.allSettled([api.get('/api/customers/?ordering=shop_name')])
      return { customers: safe(r[0])?.results || safe(r[0]) || [] }
    },
    inventory: async () => {
      const r = await Promise.allSettled([api.get('/api/inventory/'), api.get('/api/inventory/alerts/')])
      const [inventory, invAlerts] = r
      return { inventory: safe(inventory)?.results || safe(inventory) || [], invAlerts: safe(invAlerts)?.alerts || [] }
    },
    products: async () => {
      const r = await Promise.allSettled([api.get('/api/products/')])
      return { products: safe(r[0])?.results || safe(r[0]) || [] }
    },
    billing: async () => {
      const r = await Promise.allSettled([api.get('/api/billing/summary/'), api.get('/api/billing/upi-config/')])
      const [billing, upiCfg] = r
      setUpiConfig(safe(upiCfg) || null)
      return { billing: safe(billing) }
    },
    payments: async () => {
      const r = await Promise.allSettled([api.get('/api/billing/payments/')])
      return { payments: safe(r[0])?.results || safe(r[0]) || [] }
    },
    credits: async () => {
      const r = await Promise.allSettled([api.get('/api/credit/'), api.get('/api/expenses/credits/')])
      const [credits, creditTxns] = r
      return { credits: safe(credits), creditTxns: safe(creditTxns)?.results || safe(creditTxns) || [] }
    },
    expenses: async () => {
      const r = await Promise.allSettled([api.get('/api/expenses/expenses/')])
      return { expenses: safe(r[0])?.results || safe(r[0]) || [] }
    },
    suppliers: async () => {
      const r = await Promise.allSettled([api.get('/api/suppliers/suppliers/'), api.get('/api/suppliers/purchase-orders/')])
      const [suppliers, purchaseOrders] = r
      return { suppliers: safe(suppliers)?.results || safe(suppliers) || [], purchaseOrders: safe(purchaseOrders)?.results || safe(purchaseOrders) || [] }
    },
    returns: async () => {
      const r = await Promise.allSettled([api.get('/api/returns/?ordering=-created_at')])
      return { returns: safe(r[0])?.results || safe(r[0]) || [] }
    },
    offers: async () => {
      const r = await Promise.allSettled([api.get('/api/notifications/admin/offers/')])
      return { offers: safe(r[0]) || [] }
    },
    reports: async () => ({}),
    profit:  async () => ({}),
    chatbot: async () => {
      const r = await Promise.allSettled([api.get('/api/notifications/admin/chat-sessions/')])
      return { chatSessions: safe(r[0]) || [] }
    },
    notifs: async () => {
      const r = await Promise.allSettled([api.get('/api/notifications/')])
      return { notifs: safe(r[0])?.notifications || [] }
    },
    users: async () => {
      const r = await Promise.allSettled([api.get('/api/notifications/admin/users/')])
      return { users: safe(r[0]) || [] }
    },
    audit: async () => {
      const r = await Promise.allSettled([api.get('/api/audit/logs/?limit=100')])
      return { auditLogs: safe(r[0])?.logs || [] }
    },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = useCallback(async (targetTab) => {
    if (!token) { navigate('/login'); return }
    setLoading(true)
    const t = targetTab || tab
    const fetcher = TAB_APIS[t] || TAB_APIS['dashboard']
    try {
      const newData = await fetcher()
      setData(prev => ({ ...prev, ...newData }))
    } catch (e) {
      if (e?.response?.status === 401) { localStorage.clear(); navigate('/login') }
    }
    setLoading(false)
  }, [token, navigate, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load dashboard data on mount, then lazy-load per tab switch
  useEffect(() => {
    const role = localStorage.getItem('role')
    if (role === 'customer') { navigate('/customer-dashboard'); return }
    loadAll('dashboard')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy load when tab changes
  useEffect(() => {
    if (!loading) loadAll(tab)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const logout = () => { localStorage.clear(); navigate('/login') }

  // ── API helpers ──────────────────────────────────────────────────────────────
  const extractError = (e) => {
    const d = e.response?.data
    if (!d) return 'Failed'
    if (typeof d === 'string') return d
    if (d.error) return d.error
    if (d.detail) return d.detail
    if (d.non_field_errors) return Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors
    // First field error
    const firstKey = Object.keys(d)[0]
    if (firstKey) {
      const msg = d[firstKey]
      return `${firstKey}: ${Array.isArray(msg) ? msg[0] : msg}`
    }
    return 'Failed'
  }

  const post = async (url, body, successMsg) => {
    setSaving(true)
    try {
      await api.post(url, body)
      showToast(successMsg || '✅ Done')
      openModal(null)
      await loadAll(tab)
    } catch(e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return }
      showToast('❌ ' + extractError(e))
    }
    finally { setSaving(false) }
  }
  const patch = async (url, body, successMsg) => {
    setSaving(true)
    try {
      await api.patch(url, body)
      showToast(successMsg || '✅ Updated')
      openModal(null)
      await loadAll(tab)
    } catch(e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return }
      showToast('❌ ' + extractError(e))
    }
    finally { setSaving(false) }
  }
  const del = async (url, successMsg) => {
    if (!window.confirm('Are you sure?')) return
    setSaving(true)
    try {
      await api.delete(url)
      showToast(successMsg || '✅ Deleted')
      await loadAll(tab)
    } catch(e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return }
      showToast('❌ ' + extractError(e))
    }
    finally { setSaving(false) }
  }

  const postFormData = async (url, formData, successMsg) => {
    setSaving(true)
    try {
      await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      showToast(successMsg || '✅ Done')
      openModal(null)
      await loadAll(tab)
    } catch(e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return }
      showToast('❌ ' + extractError(e))
    }
    finally { setSaving(false) }
  }

  const patchFormData = async (url, formData, successMsg) => {
    setSaving(true)
    try {
      await api.patch(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      showToast(successMsg || '✅ Updated')
      openModal(null)
      await loadAll(tab)
    } catch(e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); return }
      showToast('❌ ' + extractError(e))
    }
    finally { setSaving(false) }
  }

  const buildProductForm = () => {
    const fd = new FormData()
    fd.append('product_name', mProdNm)
    fd.append('brand', mProdBr)
    fd.append('bottle_size', mProdSz)
    fd.append('crate_size', parseInt(mProdCs))
    fd.append('rate_per_bottle', parseFloat(mProdRt))
    fd.append('expiry_date', mProdEx)
    if (mProdImg) fd.append('image', mProdImg)
    return fd
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#07091A' }}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
          <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <p className="text-white font-bold text-sm">{t('admin.loading')}</p>
      </div>
    </div>
  )

  const { summary, revenue, topCust, brandSales, profit, expSummary,
          orders, delivery, drivers, customers, inventory, invAlerts,
          billing, payments, credits, expenses, creditTxns, returns,
          offers, products, suppliers, purchaseOrders, notifs,
          users, chatSessions, auditLogs } = data

  const maxRev   = Math.max(...(revenue||[]).map(r => r.revenue), 1)
  const maxBrand = Math.max(...(brandSales||[]).map(b => b.total_revenue), 1)

  const statCards = [
    { label:t('admin.stats.revenue'),   value:`₹${((summary?.total_revenue||0)/1000).toFixed(1)}K`,    icon:'💰', bg:'rgba(192,0,0,0.2)',    border:'rgba(192,0,0,0.4)',    text:'#ff6b6b' },
    { label:t('admin.stats.orders'),    value: summary?.total_orders || 0,                              icon:'📦', bg:'rgba(30,111,255,0.2)', border:'rgba(30,111,255,0.4)', text:'#74b9ff' },
    { label:t('admin.stats.pending'),   value:`₹${((summary?.pending_payments||0)/1000).toFixed(1)}K`, icon:'⏳', bg:'rgba(245,180,0,0.2)',  border:'rgba(245,180,0,0.4)',  text:'#fdcb6e' },
    { label:t('admin.stats.lowStock'),  value: summary?.low_stock_count || 0,                           icon:'⚠️', bg:'rgba(0,200,100,0.2)',  border:'rgba(0,200,100,0.4)',  text:'#55efc4' },
    { label:t('admin.stats.customers'), value: summary?.total_customers || customers?.length || 0,      icon:'👥', bg:'rgba(124,58,237,0.2)', border:'rgba(124,58,237,0.4)', text:'#a29bfe' },
    { label:t('admin.stats.profit'),    value:`₹${((profit?.profit||0)/1000).toFixed(1)}K`,             icon:'📉', bg:'rgba(255,131,0,0.2)',  border:'rgba(255,131,0,0.4)',  text:'#fab1a0' },
  ]

  const filt = (arr, keys) => (arr||[]).filter(x => !search || keys.some(k => {
    const val = k.split('.').reduce((o, p) => o?.[p], x)
    return String(val||'').toLowerCase().includes(search.toLowerCase())
  }))

  return (
    <div className="flex min-h-screen" style={{ background:'#07091A', fontFamily:'system-ui,sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl"
          style={{ background:'#0d1b35', border:'1px solid rgba(255,255,255,0.15)' }}>{toast}</div>
      )}

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sideOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        flex-shrink-0 flex flex-col border-r border-white/10 transition-all duration-300
        ${sideOpen ? 'w-56' : 'w-0 md:w-14'}
        fixed md:sticky top-0 left-0 z-50 md:z-auto
        ${sideOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        style={{ background:'linear-gradient(180deg,#0a1628,#07091A)', minHeight:'100vh', height:'100vh', overflowY:'auto', overflowX:'hidden' }}>
        <div className="flex items-center gap-2 px-3 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'linear-gradient(135deg,#C00000,#F5B400)' }}>
            <span className="text-white font-bold text-xs">CS</span>
          </div>
          {sideOpen && <div className="min-w-0 flex-1"><p className="text-white font-bold text-xs truncate">ColdSync Pro</p><p className="text-white/30 text-xs">Admin</p></div>}
          <button onClick={() => setSideOpen(o => !o)} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setTab(n.id); setSearch(''); if (window.innerWidth < 768) setSideOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${tab===n.id ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              style={tab===n.id ? { background:'linear-gradient(135deg,rgba(192,0,0,0.3),rgba(139,0,0,0.2))', borderLeft:'3px solid #C00000' } : {}}>
              <span className="text-sm flex-shrink-0 w-4 text-center">{n.icon}</span>
              {sideOpen && <span className="truncate">{n.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/10 space-y-0.5">
          <button onClick={logout} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs ${!sideOpen?'justify-center':''}`}>
            <span>🚪</span>{sideOpen && t('admin.logout')}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-white/10 px-3 md:px-5 h-13 flex items-center justify-between flex-shrink-0"
          style={{ background:'rgba(7,9,26,0.97)', backdropFilter:'blur(12px)', height:'52px' }}>
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button onClick={() => setSideOpen(o => !o)} className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span className="text-white font-bold text-sm">{NAV.find(n=>n.id===tab)?.icon} {NAV.find(n=>n.id===tab)?.label}
              {search && <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background:'rgba(30,111,255,0.2)', color:'#74b9ff' }}>🔍 "{search}"</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <input
                value={search}
                onChange={e => {
                  const val = e.target.value
                  setSearch(val)
                  // Auto-switch to relevant tab based on search context
                  if (val && tab === 'dashboard') {
                    setTab('orders') // default to orders when searching from dashboard
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') setSearch('')
                }}
                placeholder={`Search ${tab}...`}
                className="pl-7 pr-7 py-1.5 rounded-xl text-white text-xs focus:outline-none w-48 transition-all focus:w-56"
                style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${search ? 'rgba(30,111,255,0.5)' : 'rgba(255,255,255,0.12)'}` }}
              />
              <svg className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <button onClick={() => loadAll(tab)} className="w-7 h-7 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
            <NotificationBell />
            <LanguageSwitcher compact={true} />
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>A</div>
          </div>
        </header>
        <div className="h-0.5 w-full flex-shrink-0" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF,#7C3AED)' }} />

        <main className="flex-1 p-5 overflow-auto">

          {/* ══ DASHBOARD ══ */}
          {tab==='dashboard' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {statCards.map((c,i) => (
                  <div key={i} className="rounded-2xl p-4 border hover:scale-[1.02] transition-all cursor-pointer" style={{ background:c.bg, borderColor:c.border }}>
                    <div className="flex items-center justify-between mb-2"><span className="text-lg">{c.icon}</span><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:'rgba(255,255,255,0.1)', color:c.text }}>{c.label}</span></div>
                    <p className="font-bold text-2xl text-white">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Inventory Alerts */}
              {(invAlerts||[]).length > 0 && (
                <div className="rounded-2xl p-4 border" style={{ background:'rgba(192,0,0,0.06)', borderColor:'rgba(192,0,0,0.25)' }}>
                  <h3 className="text-white font-bold text-sm">⚠️ {t('admin.invAlerts')} ({invAlerts.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {(invAlerts||[]).slice(0,8).map((a,i) => (
                      <span key={i} className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: a.severity==='critical'?'rgba(192,0,0,0.2)':'rgba(245,180,0,0.2)', color: a.severity==='critical'?'#ff6b6b':'#F5B400', border:`1px solid ${a.severity==='critical'?'rgba(192,0,0,0.3)':'rgba(245,180,0,0.3)'}` }}>
                        {a.product_name} — {a.message}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TODAY'S ORDERS QUICK VIEW ── */}
              {data.todaysOrders && (
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-sm">📅 Today's Orders — {data.todaysOrders.date}</h3>
                      <p className="text-white/40 text-xs mt-0.5">
                        {data.todaysOrders.total_orders} orders · ₹{(data.todaysOrders.total_revenue/1000).toFixed(1)}K revenue ·
                        <span style={{ color:'#00C864' }}> {data.todaysOrders.paid_count} paid</span> ·
                        <span style={{ color:'#ff6b6b' }}> {data.todaysOrders.pending_count} pending</span>
                      </p>
                    </div>
                    {selectedOrders.size > 0 && (
                      <button
                        onClick={async () => {
                          setSaving(true)
                          try {
                            const res = await api.post('/api/analytics/bulk-mark-paid/', { order_ids: [...selectedOrders] })
                            showToast(`✅ ${res.data.updated} orders marked as Paid`)
                            setSelectedOrders(new Set())
                            await loadAll(tab)
                          } catch(e) { showToast('❌ ' + (e.response?.data?.error || 'Failed')) }
                          finally { setSaving(false) }
                        }}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                        style={{ background:'linear-gradient(135deg,#00C864,#00a050)' }}>
                        ✅ Mark {selectedOrders.size} as Paid
                      </button>
                    )}
                  </div>
                  {(data.todaysOrders.orders||[]).length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-6">No orders today yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(data.todaysOrders.orders||[]).map(o => (
                        <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-white/15 transition-all"
                          style={{ background:'rgba(255,255,255,0.03)' }}>
                          <input type="checkbox"
                            checked={selectedOrders.has(o.id)}
                            onChange={e => {
                              const s = new Set(selectedOrders)
                              e.target.checked ? s.add(o.id) : s.delete(o.id)
                              setSelectedOrders(s)
                            }}
                            className="w-4 h-4 rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold">#{o.id} — {o.shop_name}</p>
                            <p className="text-white/40 text-xs">{o.order_time} · {o.phone}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-white/70 text-xs font-bold">₹{o.total_amount.toLocaleString('en-IN')}</span>
                            <Badge val={o.payment_status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-5">
                {/* Revenue Chart with period filter */}
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-sm">📈 {t('admin.revenueChart')}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">₹{((revenue||[]).reduce((s,r)=>s+r.revenue,0)/1000).toFixed(1)}K</span>
                      <select
                        onChange={async e => {
                          const months = parseInt(e.target.value)
                          try {
                            const res = await api.get(`/api/analytics/revenue-chart/?months=${months}`)
                            setData(prev => ({ ...prev, revenue: res.data.revenue_chart || [] }))
                          } catch {}
                        }}
                        className="px-2 py-1 rounded-lg text-white text-xs focus:outline-none"
                        style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                        <option value="6" style={{ background:'#0d1b35' }}>6 Months</option>
                        <option value="3" style={{ background:'#0d1b35' }}>3 Months</option>
                        <option value="12" style={{ background:'#0d1b35' }}>12 Months</option>
                      </select>
                    </div>
                  </div>
                  {(revenue||[]).length === 0 ? <p className="text-white/20 text-xs text-center py-8">{t('admin.noData')}</p> : (
                    <div className="flex items-end gap-2 h-28">
                      {(revenue||[]).map((r,i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className="text-white/40 text-xs opacity-0 group-hover:opacity-100 transition-opacity">₹{(r.revenue/1000).toFixed(1)}K</span>
                          <div className="w-full rounded-t-lg" style={{ height:`${Math.max((r.revenue/maxRev)*100,4)}px`, background:'linear-gradient(180deg,#C00000,#8B0000)' }} />
                          <span className="text-white/40 text-xs">{r.month?.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profit Card */}
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <h3 className="text-white font-bold text-sm mb-4">📉 {t('admin.profitAnalysis')}</h3>
                  <div className="space-y-3">
                    {[
                      { label:t('admin.stats.revenue'),  value: profit?.revenue||0,  color:'#00C864' },
                      { label:t('admin.stats.expenses'), value: profit?.expenses||0, color:'#ff6b6b' },
                      { label:t('admin.stats.profit'),   value: profit?.profit||0,   color:'#F5B400' },
                    ].map(x => (
                      <div key={x.label} className="flex items-center justify-between p-3 rounded-xl border border-white/8" style={{ background:'rgba(255,255,255,0.04)' }}>
                        <span className="text-white/60 text-xs">{x.label}</span>
                        <span className="font-bold text-sm" style={{ color:x.color }}>₹{(x.value/1000).toFixed(1)}K</span>
                      </div>
                    ))}
                    <p className="text-white/30 text-xs text-center">{t('admin.margin')}: {profit?.profit_margin||0}%</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {/* Top Customers */}
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <h3 className="text-white font-bold text-sm mb-3">🏆 {t('admin.topCustomers')}</h3>
                  {(topCust||[]).slice(0,5).map((c,i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-all">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background:`hsl(${i*60+10},65%,40%)` }}>{i+1}</div>
                      <div className="flex-1 min-w-0"><p className="text-white text-xs font-semibold truncate">{c.shop_name}</p><p className="text-white/40 text-xs">{c.total_orders} {t('admin.orders')}</p></div>
                      <span className="text-xs font-bold" style={{ color:'#00C864' }}>₹{(c.total_spent/1000).toFixed(1)}K</span>
                    </div>
                  ))}
                  {!(topCust||[]).length && <p className="text-white/20 text-xs text-center py-4">{t('admin.noData')}</p>}
                </div>

                {/* Brand Sales */}
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <h3 className="text-white font-bold text-sm mb-3">🥤 {t('admin.brandSales')}</h3>
                  {(brandSales||[]).slice(0,6).map((b,i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between text-xs mb-1"><span className="text-white/70">{b.brand}</span><span className="text-white/40">₹{(b.total_revenue/1000).toFixed(1)}K</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                        <div className="h-1.5 rounded-full" style={{ width:`${(b.total_revenue/maxBrand)*100}%`, background:`hsl(${i*40},70%,50%)` }} />
                      </div>
                    </div>
                  ))}
                  {!(brandSales||[]).length && <p className="text-white/20 text-xs text-center py-4">{t('admin.noData')}</p>}
                </div>

                {/* Expense Summary */}
                <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <h3 className="text-white font-bold text-sm mb-3">💸 Expenses This Month</h3>
                  <p className="text-white font-bold text-xl mb-3">₹{((expSummary?.total_expenses||0)/1000).toFixed(1)}K</p>
                  {(expSummary?.by_category||[]).slice(0,5).map((c,i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5">
                      <span className="text-white/60">{c.category}</span>
                      <span className="text-white/80 font-semibold">₹{c.amount.toFixed(0)}</span>
                    </div>
                  ))}
                  {!(expSummary?.by_category||[]).length && <p className="text-white/20 text-xs text-center py-4">No expenses</p>}
                </div>
              </div>

              {/* Quick Access — New Features */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'🤖 AI Forecast', desc:'Demand prediction & stock planning', path:'/admin-forecast', color:'rgba(192,0,0,0.15)', border:'rgba(192,0,0,0.3)' },
                  { label:'🗺️ Route Plan', desc:'Village-wise delivery optimization', path:'/admin-routes', color:'rgba(30,111,255,0.15)', border:'rgba(30,111,255,0.3)' },
                  { label:'🚚 Driver App', desc:'Driver delivery tracking & updates', path:'/driver-app', color:'rgba(0,200,100,0.15)', border:'rgba(0,200,100,0.3)' },
                  { label:'📊 Profit/Crate', desc:'Product margin & profit analysis', path:'/admin-profit', color:'rgba(245,180,0,0.15)', border:'rgba(245,180,0,0.3)' },
                ].map((card,i)=>(
                  <button key={i} onClick={()=>navigate(card.path)}
                    className="rounded-2xl p-4 border text-left hover:scale-[1.02] transition-all"
                    style={{ background:card.color, borderColor:card.border }}>
                    <p className="text-white font-bold text-sm">{card.label}</p>
                    <p className="text-white/50 text-xs mt-1">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ ORDERS ══ */}
          {tab==='orders' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(orders||[]).length} orders</p>
                <button onClick={() => openModal({type:'add-order',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#C00000' }}>+ New Order</button>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['#','Customer','Amount','Payment','Delivery','Date','Actions'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filt(orders,['customer_details.shop_name']).slice(0,50).map(o => (
                        <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/50 font-mono">#{o.id}</td>
                          <td className="px-3 py-3"><p className="text-white font-medium">{o.customer_details?.shop_name||'—'}</p><p className="text-white/40">{o.customer_details?.owner_name}</p></td>
                          <td className="px-3 py-3 text-white font-bold">₹{parseFloat(o.total_amount||0).toFixed(0)}</td>
                          <td className="px-3 py-3"><Badge val={o.payment_status} /></td>
                          <td className="px-3 py-3"><Badge val={o.delivery_status} /></td>
                          <td className="px-3 py-3 text-white/40">{o.order_date?new Date(o.order_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openModal({type:'pay-status',item:o})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">💳</button>
                              <button onClick={() => openModal({type:'del-status',item:o})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">🚚</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(orders||[]).length && <div className="text-center py-10"><p className="text-white/20 text-sm">No orders</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ══ DELIVERY ══ */}
          {tab==='delivery' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(delivery||[]).length} active deliveries</p>
                <button onClick={() => openModal({type:'add-driver',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#7C3AED' }}>+ Add Driver</button>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['Order','Customer','Amount','Status','Driver','Vehicle','Actions'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filt(delivery,['shop_name','owner_name','delivery_driver']).slice(0,50).map(o => (
                        <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/50 font-mono">#{o.id}</td>
                          <td className="px-3 py-3"><p className="text-white font-medium">{o.shop_name}</p><p className="text-white/40">{o.village}</p></td>
                          <td className="px-3 py-3 text-white font-bold">₹{o.total_amount?.toFixed(0)}</td>
                          <td className="px-3 py-3"><Badge val={o.delivery_status} /></td>
                          <td className="px-3 py-3 text-white/70">{o.delivery_driver||'—'}<br/><span className="text-white/40">{o.delivery_driver_phone}</span></td>
                          <td className="px-3 py-3 text-white/60">{o.delivery_vehicle||'—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openModal({type:'assign-driver',item:o})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">🚚 Assign</button>
                              <a href={`/delivery-slip?order_id=${o.id}`} target="_blank" rel="noreferrer"
                                className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">
                                🖨️ Slip
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(delivery||[]).length && <div className="text-center py-10"><p className="text-white/20 text-sm">No deliveries</p></div>}
                </div>
              </div>

              {/* Drivers List */}
              {(drivers||[]).length > 0 && (
                <div className="mt-5">
                  <h3 className="text-white font-bold text-sm mb-3">🧑‍✈️ Saved Drivers</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(drivers||[]).map(d => (
                      <div key={d.id} className="rounded-2xl p-4 border border-white/10 group hover:border-white/20 transition-all" style={{ background:'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-white font-semibold text-sm">{d.name}</p>
                          <button onClick={() => del(`/api/orders/drivers/${d.id}/`,'✅ Driver deleted')} className="text-red-400/40 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all">🗑</button>
                        </div>
                        <p className="text-white/50 text-xs">📱 {d.phone}</p>
                        {d.email && <p className="text-white/40 text-xs">✉️ {d.email}</p>}
                        <p className="text-white/50 text-xs">🚗 {d.vehicle_number} · {d.vehicle_type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ CUSTOMERS ══ */}
          {tab==='customers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(customers||[]).length} customers</p>
                <button onClick={() => openModal({type:'add-customer',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#1E6FFF' }}>+ Add Customer</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filt(customers,['shop_name','owner_name','phone']).slice(0,30).map(c => (
                  <div key={c.id} className="rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all group" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background:'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>{c.shop_name?.[0]?.toUpperCase()||'S'}</div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal({type:'customer-detail',item:c})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">👁</button>
                        <button onClick={() => { setMEditCredit(String(c.credit_limit||0)); openModal({type:'edit-credit',item:c}) }} className="px-2 py-1 rounded-lg text-xs border border-blue-500/30 text-blue-400 hover:text-white hover:bg-blue-500/20 transition-all">💳</button>
                        <a href={`/api/reports/customer/${c.id}/?format=pdf`} target="_blank" rel="noreferrer"
                          className="px-2 py-1 rounded-lg text-xs border border-green-500/30 text-green-400 hover:text-white hover:bg-green-500/20 transition-all">
                          📊
                        </a>
                      </div>
                    </div>
                    <p className="text-white font-semibold text-sm">{c.shop_name}</p>
                    <p className="text-white/50 text-xs">{c.owner_name}</p>
                    <div className="flex gap-3 mt-1 text-white/40 text-xs"><span>📱 {c.phone}</span>{c.village&&<span>📍 {c.village}</span>}</div>
                    <div className="mt-2 pt-2 border-t border-white/8 flex justify-between"><span className="text-white/40 text-xs">Credit Limit</span><span className="text-white/70 text-xs font-bold">₹{parseFloat(c.credit_limit||0).toLocaleString('en-IN')}</span></div>
                  </div>
                ))}
                {!(customers||[]).length && <div className="col-span-3 text-center py-10"><p className="text-white/20 text-sm">No customers</p></div>}
              </div>
            </div>
          )}

          {/* ══ INVENTORY ══ */}
          {tab==='inventory' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(inventory||[]).length} stock entries</p>
                <button onClick={() => openModal({type:'add-stock',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#00C864' }}>+ Add Stock</button>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['Product','Brand','Warehouse','Crates','Bottles','Status','Actions'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filt(inventory,['product_details.product_name','product_details.brand']).slice(0,50).map(s => {
                      const low = s.total_crates<=5||s.total_bottles<=50
                      return (
                        <tr key={s.id} className={`border-b border-white/5 hover:bg-white/5 transition-all ${low?'bg-red-500/5':''}`}>
                          <td className="px-3 py-3 text-white font-medium">{s.product_details?.product_name||'—'}</td>
                          <td className="px-3 py-3 text-white/60">{s.product_details?.brand||'—'}</td>
                          <td className="px-3 py-3 text-white/60">{s.warehouse_name||'Main'}</td>
                          <td className="px-3 py-3 text-white font-bold">{s.total_crates}</td>
                          <td className="px-3 py-3 text-white/70">{s.total_bottles}</td>
                          <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:low?'rgba(192,0,0,0.15)':'rgba(0,200,100,0.15)', color:low?'#ff6b6b':'#00C864' }}>{low?'⚠️ Low':'✅ OK'}</span></td>
                          <td className="px-3 py-3"><button onClick={() => openModal({type:'stock-edit',item:s})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">✏️ Update</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!(inventory||[]).length && <div className="text-center py-10"><p className="text-white/20 text-sm">No inventory</p></div>}
              </div>
            </div>
          )}

          {/* ══ PRODUCTS ══ */}
          {tab==='products' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(products||[]).length} products</p>
                <button onClick={() => openModal({type:'add-product',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#7C3AED' }}>+ Add Product</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filt(products,['product_name','brand']).slice(0,40).map(p => (
                  <div key={p.id} className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all group" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="h-20 flex items-center justify-center" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {p.image_url?<img src={p.image_url} alt={p.product_name} className="h-16 object-contain" />:<span className="text-3xl">🥤</span>}
                    </div>
                    <div className="p-3">
                      <p className="text-white/50 text-xs">{p.brand}</p>
                      <p className="text-white font-semibold text-sm truncate">{p.product_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white font-bold text-sm">₹{parseFloat(p.rate_per_bottle||0).toFixed(0)}<span className="text-white/30 text-xs">/btl</span></span>
                        <span className="text-white/40 text-xs">{p.bottle_size}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/30 text-xs">Stock: {p.available_stock||0}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal({type:'edit-product',item:p})} className="text-xs text-white/40 hover:text-white transition-colors">✏️</button>
                          <button onClick={() => del(`/api/products/${p.id}/`, '✅ Product deleted')} className="text-xs text-red-400/50 hover:text-red-400 transition-colors">🗑</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!(products||[]).length && <div className="col-span-4 text-center py-10"><p className="text-white/20 text-sm">No products</p></div>}
              </div>
            </div>
          )}

          {/* ══ BILLING ══ */}
          {tab==='billing' && (
            <div className="space-y-4">
              {/* UPI Config */}
              <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">📱 UPI Payment Config</h3>
                  <button onClick={() => openModal({type:'edit-upi',item:upiConfig||{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#9b59b6' }}>✏️ Edit UPI</button>
                </div>
                {upiConfig ? (
                  <div className="flex items-center gap-5">
                    {upiConfig.qr_image_url && <img src={upiConfig.qr_image_url} alt="QR" className="w-20 h-20 object-contain rounded-xl border border-white/10 bg-white p-1" />}
                    <div className="space-y-1">
                      <p className="text-white font-semibold text-sm">{upiConfig.upi_name}</p>
                      <p className="text-white/60 text-xs font-mono">{upiConfig.upi_id}</p>
                      {upiConfig.bank_name && <p className="text-white/40 text-xs">🏦 {upiConfig.bank_name}</p>}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:upiConfig.is_active?'rgba(0,200,100,0.15)':'rgba(192,0,0,0.15)', color:upiConfig.is_active?'#00C864':'#ff6b6b' }}>{upiConfig.is_active?'Active':'Inactive'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/30 text-xs">No UPI config found. Click Edit to set up.</p>
                )}
              </div>
              {billing?.summary && (
                <div className="grid grid-cols-3 gap-4">
                  {[{label:'Total Invoices',value:billing.summary.total_invoices||0,color:'#74b9ff',bg:'rgba(30,111,255,0.15)'},{label:'Paid',value:`₹${((billing.summary.paid_total||0)/1000).toFixed(1)}K`,color:'#55efc4',bg:'rgba(0,200,100,0.15)'},{label:'Pending',value:`₹${((billing.summary.pending_total||0)/1000).toFixed(1)}K`,color:'#ff6b6b',bg:'rgba(192,0,0,0.15)'}].map((c,i)=>(
                    <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background:c.bg }}><p className="text-white/50 text-xs mb-1">{c.label}</p><p className="font-bold text-2xl" style={{ color:c.color }}>{c.value}</p></div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['Invoice','Customer','Amount','GST','Method','Status','Date','PDF'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(billing?.invoices||[]).slice(0,30).map(inv=>(
                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/60 font-mono">{inv.invoice_number}</td>
                          <td className="px-3 py-3 text-white">{inv.customer_name}</td>
                          <td className="px-3 py-3 text-white font-bold">₹{(inv.amount||0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-white/50">₹{(inv.gst_amount||0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-white/60">{inv.payment_method}</td>
                          <td className="px-3 py-3"><Badge val={inv.payment_status} /></td>
                          <td className="px-3 py-3 text-white/40">{inv.date}</td>
                          <td className="px-3 py-3"><button onClick={async()=>{
                            try{
                              const res=await api.get(`/api/billing/invoices/${inv.id}/download/`,{responseType:'blob'})
                              const url=URL.createObjectURL(new Blob([res.data],{type:'application/pdf'}))
                              const a=document.createElement('a');a.href=url;a.download=`invoice_${inv.invoice_number}.pdf`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
                            }catch{showToast('❌ Invoice download failed')}
                          }} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">📄</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(billing?.invoices?.length)&&<div className="text-center py-10"><p className="text-white/20 text-sm">No invoices</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ══ PAYMENTS ══ */}
          {tab==='payments' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(payments||[]).length} payments</p>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['#','Customer','Amount','Method','Reference','Order','Date'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filt(payments,['customer_name','reference_number']).slice(0,50).map(p=>(
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/50 font-mono">#{p.id}</td>
                          <td className="px-3 py-3 text-white">{p.customer_name||p.customer}</td>
                          <td className="px-3 py-3 text-white font-bold" style={{ color:'#00C864' }}>₹{parseFloat(p.amount||0).toFixed(0)}</td>
                          <td className="px-3 py-3 text-white/60">{p.payment_method}</td>
                          <td className="px-3 py-3 text-white/50 font-mono">{p.reference_number||'—'}</td>
                          <td className="px-3 py-3 text-white/50">{p.order?`#${p.order}`:'—'}</td>
                          <td className="px-3 py-3 text-white/40">{p.payment_date?new Date(p.payment_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(payments||[]).length&&<div className="text-center py-10"><p className="text-white/20 text-sm">No payments</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ══ CREDITS ══ */}
          {tab==='credits' && (
            <div className="space-y-4">
              {credits?.summary && (
                <div className="grid grid-cols-3 gap-4">
                  {[{label:'Total Customers',value:credits.summary.total_customers||0,color:'#74b9ff',bg:'rgba(30,111,255,0.15)'},{label:'Exceeded Limit',value:credits.summary.exceeded_count||0,color:'#ff6b6b',bg:'rgba(192,0,0,0.15)'},{label:'Outstanding',value:`₹${((credits.summary.total_outstanding||0)/1000).toFixed(1)}K`,color:'#fdcb6e',bg:'rgba(245,180,0,0.15)'}].map((c,i)=>(
                    <div key={i} className="rounded-2xl p-4 border border-white/10" style={{ background:c.bg }}><p className="text-white/50 text-xs mb-1">{c.label}</p><p className="font-bold text-2xl" style={{ color:c.color }}>{c.value}</p></div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['Shop','Phone','Limit','Used','Outstanding','%','Status','Action'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filt(credits?.customers||[],['shop_name','owner_name']).slice(0,30).map(c=>(
                      <tr key={c.customer_id} className={`border-b border-white/5 hover:bg-white/5 transition-all ${c.exceeded?'bg-red-500/5':''}`}>
                        <td className="px-3 py-3"><p className="text-white font-medium">{c.shop_name}</p><p className="text-white/40">{c.owner_name}</p></td>
                        <td className="px-3 py-3 text-white/60">{c.phone}</td>
                        <td className="px-3 py-3 text-white/70">₹{(c.credit_limit||0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-white/70">₹{(c.used_credit||0).toFixed(0)}</td>
                        <td className="px-3 py-3 font-bold" style={{ color:c.outstanding>0?'#ff6b6b':'#55efc4' }}>₹{(c.outstanding||0).toFixed(0)}</td>
                        <td className="px-3 py-3"><div className="flex items-center gap-1"><div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.1)' }}><div className="h-1.5 rounded-full" style={{ width:`${Math.min(c.utilisation_pct||0,100)}%`, background:c.exceeded?'#ff6b6b':'#00C864' }} /></div><span className="text-white/40">{c.utilisation_pct||0}%</span></div></td>
                        <td className="px-3 py-3"><Badge val={c.exceeded?'Over':'OK'} /></td>
                        <td className="px-3 py-3"><button onClick={() => openModal({type:'credit-pay',item:c})} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">💳 Pay</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(credits?.customers?.length)&&<div className="text-center py-10"><p className="text-white/20 text-sm">No credit data</p></div>}
              </div>
            </div>
          )}

          {/* ══ EXPENSES ══ */}
          {tab==='expenses' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(expenses||[]).length} expenses</p>
                <button onClick={() => openModal({type:'add-expense',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#F5B400' }}>+ Add Expense</button>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['#','Name','Category','Amount','Date','Notes','Action'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filt(expenses,['expense_name','category']).slice(0,50).map(e=>(
                      <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="px-3 py-3 text-white/50">#{e.id}</td>
                        <td className="px-3 py-3 text-white font-medium">{e.expense_name}</td>
                        <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs" style={{ background:'rgba(245,180,0,0.15)', color:'#F5B400' }}>{e.category}</span></td>
                        <td className="px-3 py-3 text-white font-bold" style={{ color:'#ff6b6b' }}>₹{parseFloat(e.amount||0).toFixed(0)}</td>
                        <td className="px-3 py-3 text-white/40">{e.date}</td>
                        <td className="px-3 py-3 text-white/40 max-w-xs truncate">{e.notes||'—'}</td>
                        <td className="px-3 py-3"><button onClick={() => del(`/api/expenses/expenses/${e.id}/`, '✅ Expense deleted')} className="px-2 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(expenses||[]).length&&<div className="text-center py-10"><p className="text-white/20 text-sm">No expenses</p></div>}
              </div>
            </div>
          )}

          {/* ══ SUPPLIERS ══ */}
          {tab==='suppliers' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/50 text-sm">🏪 {(suppliers||[]).length} suppliers</p>
                  <button onClick={() => openModal({type:'add-supplier',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#1E6FFF' }}>+ Add Supplier</button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filt(suppliers,['name','contact_person','phone']).map(s=>(
                    <div key={s.id} className="rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all group" style={{ background:'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background:'linear-gradient(135deg,#1E6FFF,#00C864)' }}>{s.name?.[0]?.toUpperCase()||'S'}</div>
                        <button onClick={() => del(`/api/suppliers/suppliers/${s.id}/`, '✅ Supplier deleted')} className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">🗑</button>
                      </div>
                      <p className="text-white font-semibold text-sm">{s.name}</p>
                      <p className="text-white/50 text-xs">{s.contact_person}</p>
                      <p className="text-white/40 text-xs mt-1">📱 {s.phone}</p>
                      {s.email&&<p className="text-white/40 text-xs">✉️ {s.email}</p>}
                    </div>
                  ))}
                  {!(suppliers||[]).length&&<div className="col-span-3 text-center py-10"><p className="text-white/20 text-sm">No suppliers</p></div>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/50 text-sm">📋 {(purchaseOrders||[]).length} purchase orders</p>
                  <button onClick={() => openModal({type:'add-po',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#00C864' }}>+ New PO</button>
                </div>
                <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['#','Supplier','Amount','Status','Date','Action'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(purchaseOrders||[]).map(po=>(
                        <tr key={po.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/50 font-mono">#{po.id}</td>
                          <td className="px-3 py-3 text-white">{po.supplier_name||po.supplier}</td>
                          <td className="px-3 py-3 text-white font-bold">₹{parseFloat(po.total_amount||0).toFixed(0)}</td>
                          <td className="px-3 py-3"><Badge val={po.status} /></td>
                          <td className="px-3 py-3 text-white/40">{po.order_date?new Date(po.order_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</td>
                          <td className="px-3 py-3">
                            {po.status!=='Received'&&(
                              <button onClick={() => post(`/api/suppliers/purchase-orders/${po.id}/mark_received/`,{},'✅ PO marked received, stock updated')} disabled={saving} className="px-2 py-1 rounded-lg text-xs border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-50">✓ Received</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(purchaseOrders||[]).length&&<div className="text-center py-10"><p className="text-white/20 text-sm">No purchase orders</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* ══ RETURNS ══ */}
          {tab==='returns' && (
            <div>
              <p className="text-white/50 text-sm mb-4">{(returns||[]).length} return requests</p>
              <div className="space-y-3">
                {(returns||[]).map(r=>(
                  <div key={r.id} className="rounded-2xl p-4 border border-white/10 flex items-start justify-between gap-4 hover:border-white/20 transition-all" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm">Return #{r.id}</span>
                        <span className="text-white/40 text-xs">· Order #{r.order}</span>
                        <Badge val={r.status} />
                      </div>
                      <p className="text-white/60 text-xs">Customer: <span className="text-white/80">{r.customer_name||r.customer}</span></p>
                      <p className="text-white/60 text-xs">Reason: <span className="text-white/80">{r.reason}</span> · Type: <span className="text-white/80">{r.return_type}</span></p>
                      {r.admin_notes&&<p className="text-xs mt-1" style={{ color:'#F5B400' }}>Note: {r.admin_notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {r.status==='Pending'&&(
                        <div className="flex gap-1">
                          <button onClick={() => openModal({type:'return-approve',item:r})} className="px-2 py-1 rounded-lg text-xs font-bold text-white hover:opacity-90" style={{ background:'#00C864' }}>✓ Approve</button>
                          <button onClick={() => openModal({type:'return-reject',item:r})} className="px-2 py-1 rounded-lg text-xs font-bold text-white hover:opacity-90" style={{ background:'#ff6b6b' }}>✕ Reject</button>
                        </div>
                      )}
                      {r.status==='Approved'&&(
                        <button onClick={() => post(`/api/returns/${r.id}/complete/`,{},'✅ Return completed')} disabled={saving} className="px-2 py-1 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ background:'#1E6FFF' }}>✓ Complete</button>
                      )}
                    </div>
                  </div>
                ))}
                {!(returns||[]).length&&<div className="text-center py-16"><span className="text-5xl">↩️</span><p className="text-white/20 text-sm mt-3">No return requests</p></div>}
              </div>
            </div>
          )}

          {/* ══ OFFERS ══ */}
          {tab==='offers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">{(offers||[]).length} offers</p>
                <button onClick={() => openModal({type:'add-offer',item:{}})} className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#F5B400' }}>+ New Offer</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(offers||[]).map(o=>(
                  <div key={o.id} className="rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{o.emoji}</span>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:'rgba(245,180,0,0.2)', color:'#F5B400' }}>{o.tag}</span>
                        <span className="text-white/30 text-xs">Expires: {o.expires_at?.split('T')[0]}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:o.is_active?'rgba(0,200,100,0.15)':'rgba(192,0,0,0.15)', color:o.is_active?'#00C864':'#ff6b6b' }}>{o.is_active?'Active':'Inactive'}</span>
                      </div>
                    </div>
                    <p className="text-white font-bold text-sm mb-1">{o.title}</p>
                    <p className="text-white/50 text-xs leading-relaxed mb-3">{o.description}</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal({type:'edit-offer',item:o})} className="flex-1 py-1.5 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">✏️ Edit</button>
                      <button onClick={() => del(`/api/notifications/admin/offers/${o.id}/`,'✅ Offer deleted')} className="px-3 py-1.5 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">🗑</button>
                    </div>
                  </div>
                ))}
                {!(offers||[]).length&&<div className="col-span-3 text-center py-12"><span className="text-4xl">🎁</span><p className="text-white/20 text-sm mt-3">No offers yet</p></div>}
              </div>
            </div>
          )}

          {/* ══ REPORTS ══ */}
          {tab==='reports' && (
            <div className="space-y-5">
              <p className="text-white/50 text-sm">Download reports in PDF or Excel</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[{type:'sales',label:'Sales Report',icon:'📊',desc:'Monthly sales & orders',color:'#C00000'},{type:'inventory',label:'Inventory Report',icon:'🏭',desc:'Current stock levels',color:'#00C864'},{type:'customers',label:'Customer Report',icon:'👥',desc:'Top customers by spend',color:'#1E6FFF'},{type:'products',label:'Products Report',icon:'🥤',desc:'Top selling products',color:'#F5B400'},{type:'monthly',label:'Monthly Revenue',icon:'📈',desc:'6-month revenue trend',color:'#7C3AED'}].map(r=>(
                  <div key={r.type} className="rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background:`${r.color}22` }}>{r.icon}</div>
                    <p className="text-white font-bold text-sm mb-1">{r.label}</p>
                    <p className="text-white/40 text-xs mb-4">{r.desc}</p>
                    <div className="flex gap-2">
                      <button onClick={async()=>{
                        try{
                          const res=await api.get(`/api/reports/download/?report_type=${r.type}&format=pdf`,{responseType:'blob'})
                          const url=URL.createObjectURL(new Blob([res.data],{type:'application/pdf'}))
                          const a=document.createElement('a');a.href=url;a.download=`${r.type}_report.pdf`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
                        }catch{showToast('❌ Download failed')}
                      }} className="flex-1 py-2 rounded-xl text-white text-xs font-bold text-center hover:opacity-90" style={{ background:'#C00000' }}>📄 PDF</button>
                      <button onClick={async()=>{
                        try{
                          const res=await api.get(`/api/reports/download/?report_type=${r.type}&format=excel`,{responseType:'blob'})
                          const url=URL.createObjectURL(new Blob([res.data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))
                          const a=document.createElement('a');a.href=url;a.download=`${r.type}_report.xlsx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
                        }catch{showToast('❌ Download failed')}
                      }} className="flex-1 py-2 rounded-xl text-white text-xs font-bold text-center hover:opacity-90" style={{ background:'#00C864' }}>📊 Excel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PROFIT ══ */}
          {tab==='profit' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[{label:'Revenue',value:profit?.revenue||0,color:'#00C864'},{label:'Expenses',value:profit?.expenses||0,color:'#ff6b6b'},{label:'Net Profit',value:profit?.profit||0,color:'#F5B400'}].map((c,i)=>(
                  <div key={i} className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <p className="text-white/50 text-xs mb-2">{c.label}</p>
                    <p className="font-bold text-3xl" style={{ color:c.color }}>₹{(c.value/1000).toFixed(1)}K</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-5 border border-white/10" style={{ background:'rgba(255,255,255,0.03)' }}>
                <h3 className="text-white font-bold text-sm mb-4">💸 Expenses by Category</h3>
                {(expSummary?.by_category||[]).map((c,i)=>(
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-white/70 text-sm">{c.category}</span>
                    <span className="text-white font-bold">₹{c.amount.toFixed(0)}</span>
                  </div>
                ))}
                {!(expSummary?.by_category||[]).length&&<p className="text-white/20 text-xs text-center py-6">No expense data</p>}
              </div>
              <div className="flex gap-3">
                {['week','month','year'].map(p=>(
                  <a key={p} href={`/api/analytics/profit/?period=${p}`} target="_blank" className="px-4 py-2 rounded-xl text-white text-xs font-bold border border-white/20 hover:bg-white/10 transition-all capitalize">{p}</a>
                ))}
              </div>
              {/* Links to new dedicated pages */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'📊 Profit Per Crate', desc:'Product-wise margin analysis', path:'/admin-profit', color:'rgba(245,180,0,0.15)', border:'rgba(245,180,0,0.3)' },
                  { label:'🤖 AI Demand Forecast', desc:'Stock prediction & demand trends', path:'/admin-forecast', color:'rgba(192,0,0,0.15)', border:'rgba(192,0,0,0.3)' },
                  { label:'🗺️ Route Optimization', desc:'Village-wise delivery planning', path:'/admin-routes', color:'rgba(30,111,255,0.15)', border:'rgba(30,111,255,0.3)' },
                ].map((card,i)=>(
                  <button key={i} onClick={()=>navigate(card.path)}
                    className="rounded-2xl p-4 border text-left hover:scale-[1.02] transition-all"
                    style={{ background:card.color, borderColor:card.border }}>
                    <p className="text-white font-bold text-sm">{card.label}</p>
                    <p className="text-white/50 text-xs mt-1">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ CHATBOT ══ */}
          {tab==='chatbot' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">🤖 {(chatSessions||[]).length} chat sessions</p>
              </div>
              {(chatSessions||[]).length === 0 ? (
                <div className="rounded-2xl p-8 border border-white/10 text-center" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <span className="text-5xl">🤖</span>
                  <p className="text-white font-bold text-sm mt-3 mb-2">No chat sessions yet</p>
                  <p className="text-white/40 text-xs">Customers can chat via the widget on the landing page.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['#','User','Messages','Last Message','Time','View'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(chatSessions||[]).map(s=>(
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-3 py-3 text-white/50 font-mono">#{s.id}</td>
                          <td className="px-3 py-3 text-white font-medium">{s.user}</td>
                          <td className="px-3 py-3 text-white/60">{s.message_count}</td>
                          <td className="px-3 py-3 text-white/50 max-w-xs truncate">
                            <span className="text-white/30 mr-1">{s.last_role==='user'?'👤':'🤖'}</span>{s.last_message}
                          </td>
                          <td className="px-3 py-3 text-white/40">{s.created_at}</td>
                          <td className="px-3 py-3">
                            <button onClick={async()=>{
                              setChatMsgs([])
                              openModal({type:'chat-msgs',item:s})
                              try{const r=await api.get(`/api/notifications/admin/chat-sessions/${s.id}/messages/`);setChatMsgs(r.data)}catch{}
                            }} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">💬 View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {tab==='notifs' && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-white/50 text-sm">{(notifs||[]).length} notifications</p>
                <div className="flex gap-2">
                  <button onClick={() => openModal({type:'send-notif',item:{}})}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'#7C3AED' }}>
                    📤 Send Notification
                  </button>
                  <button onClick={() => openModal({type:'wa-broadcast',item:{}})}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background:'linear-gradient(135deg,#25D366,#128C7E)' }}>
                    💬 WhatsApp Broadcast
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(notifs||[]).slice(0,30).map(n=>(
                  <div key={n.id} className={`rounded-xl p-4 border transition-all ${n.is_read?'border-white/5':'border-white/15'}`} style={{ background: n.is_read?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{n.title}</p>
                        <p className="text-white/50 text-xs mt-0.5">{n.message}</p>
                        <p className="text-white/25 text-xs mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      {!n.is_read&&<span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background:'#1E6FFF' }} />}
                    </div>
                  </div>
                ))}
                {!(notifs||[]).length&&<div className="text-center py-16"><span className="text-5xl">🔔</span><p className="text-white/20 text-sm mt-3">No notifications</p></div>}
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {tab==='users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">🔐 {(users||[]).length} users</p>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['#','Username','Email','Role','Status','Joined','Last Login','Actions'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filt(users||[],['username','email']).map(u=>(
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="px-3 py-3 text-white/50 font-mono">#{u.id}</td>
                        <td className="px-3 py-3 text-white font-medium">{u.username}</td>
                        <td className="px-3 py-3 text-white/60">{u.email||'—'}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:u.is_staff?'rgba(245,180,0,0.2)':'rgba(30,111,255,0.2)', color:u.is_staff?'#F5B400':'#74b9ff' }}>
                            {u.is_staff?'Admin':'Customer'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background:u.is_active?'rgba(0,200,100,0.15)':'rgba(192,0,0,0.15)', color:u.is_active?'#00C864':'#ff6b6b' }}>
                            {u.is_active?'Active':'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-white/40">{u.date_joined}</td>
                        <td className="px-3 py-3 text-white/40">{u.last_login||'Never'}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={async()=>{
                              if(!window.confirm(`${u.is_active?'Deactivate':'Activate'} user ${u.username}?`))return
                              try{await api.post(`/api/notifications/admin/users/${u.id}/toggle/`);showToast('✅ Updated');await loadAll()}catch{showToast('❌ Failed')}
                            }} className="px-2 py-1 rounded-lg text-xs border border-white/20 text-white/50 hover:text-white transition-all">
                              {u.is_active?'🚫':'✅'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!(users||[]).length&&<div className="text-center py-10"><p className="text-white/20 text-sm">No users</p></div>}
              </div>
            </div>
          )}

          {/* ══ AUDIT LOG ══ */}
          {tab==='audit' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/50 text-sm">🕵️ {(auditLogs||[]).length} recent actions</p>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background:'rgba(255,255,255,0.03)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/10" style={{ background:'rgba(255,255,255,0.04)' }}>
                      {['Time','User','Action','Model','Description','IP'].map(h=><th key={h} className="px-3 py-3 text-left text-white/40 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filt(auditLogs||[],['user','description','model_name']).map(log=>{
                        const actionColors = { CREATE:'#00C864', UPDATE:'#F5B400', DELETE:'#ff6b6b', LOGIN:'#74b9ff', LOGOUT:'#a29bfe', EXPORT:'#fab1a0', OTHER:'#aaa' }
                        const color = actionColors[log.action] || '#aaa'
                        return (
                          <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="px-3 py-3 text-white/40 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                            <td className="px-3 py-3 text-white font-medium">{log.user}</td>
                            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:color+'22', color }}>{log.action}</span></td>
                            <td className="px-3 py-3 text-white/50">{log.model_name||'—'}</td>
                            <td className="px-3 py-3 text-white/60 max-w-xs truncate">{log.description}</td>
                            <td className="px-3 py-3 text-white/30 font-mono text-xs">{log.ip_address||'—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {!(auditLogs||[]).length&&<div className="text-center py-10"><p className="text-white/20 text-sm">No audit logs yet</p></div>}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══ MODALS ══ */}

      {/* Payment Status */}
      {modal?.type==='pay-status' && (
        <Modal title={`💳 Payment — Order #${modal.item.id}`} onClose={() => openModal(null)}>
          <p className="text-white/50 text-xs mb-4">{modal.item.customer_details?.shop_name} · Current: <Badge val={modal.item.payment_status} /></p>
          <div className="space-y-2">
            {PAYMENT_STATUSES.map(s=>(
              <Btn key={s} full onClick={() => post(`/api/orders/list/${modal.item.id}/update_payment_status/`,{payment_status:s},'✅ Payment updated')} disabled={saving||s===modal.item.payment_status} color={s==='Paid'?'#00C864':s==='Partial'?'#F5B400':'rgba(255,255,255,0.1)'}>{saving?'...':s}</Btn>
            ))}
          </div>
        </Modal>
      )}

      {/* Delivery Status */}
      {modal?.type==='del-status' && (
        <Modal title={`🚚 Delivery — Order #${modal.item.id}`} onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Status" value={mDs} set={setMDs} options={DELIVERY_STATUSES} />
            {(drivers||[]).length>0&&(
              <div>
                <label className="text-white/50 text-xs block mb-1">Saved Driver</label>
                <select value={mSd} onChange={e=>{setMSd(e.target.value);const d=(drivers||[]).find(x=>String(x.id)===String(e.target.value));if(d){setMDn(d.name);setMDp(d.phone);setMDv(d.vehicle_number||'')}}} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                  <option value="" style={{background:'#0d1b35'}}>— Select driver —</option>
                  {(drivers||[]).map(d=><option key={d.id} value={d.id} style={{background:'#0d1b35'}}>{d.name} · {d.phone}</option>)}
                </select>
              </div>
            )}
            <Field label="Driver Name" value={mDn} set={setMDn} />
            <Field label="Driver Phone" value={mDp} set={setMDp} />
            <Field label="Vehicle No." value={mDv} set={setMDv} />
            <Field label="Notes" value={mNo} set={setMNo} />
            <Btn full onClick={() => patch(`/api/orders/delivery/${modal.item.id}/assign/`,{delivery_status:mDs,driver_name:mDn,driver_phone:mDp,vehicle_number:mDv,delivery_notes:mNo,...(mSd?{driver_id:parseInt(mSd)}:{})},'✅ Delivery updated')} disabled={saving} color="linear-gradient(135deg,#C00000,#8B0000)">{saving?'Saving...':'✓ Update'}</Btn>
          </div>
        </Modal>
      )}

      {/* Assign Driver (Delivery tab) */}
      {modal?.type==='assign-driver' && (
        <Modal title={`🚚 Assign Driver — Order #${modal.item.id}`} onClose={() => openModal(null)}>
          <p className="text-white/50 text-xs mb-3">{modal.item.shop_name} · {modal.item.village}</p>
          <div className="space-y-3">
            <Field label="Delivery Status" value={mDs} set={setMDs} options={DELIVERY_STATUSES} />
            {(drivers||[]).length>0&&(
              <div>
                <label className="text-white/50 text-xs block mb-1">Select Saved Driver</label>
                <select value={mSd} onChange={e=>{setMSd(e.target.value);const d=(drivers||[]).find(x=>String(x.id)===String(e.target.value));if(d){setMDn(d.name);setMDp(d.phone);setMDv(d.vehicle_number||'')}}} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                  <option value="" style={{background:'#0d1b35'}}>— Select driver —</option>
                  {(drivers||[]).map(d=><option key={d.id} value={d.id} style={{background:'#0d1b35'}}>{d.name} · {d.phone}</option>)}
                </select>
              </div>
            )}
            <Field label="Driver Name" value={mDn} set={setMDn} />
            <Field label="Driver Phone" value={mDp} set={setMDp} />
            <Field label="Vehicle No." value={mDv} set={setMDv} />
            <Field label="Notes" value={mNo} set={setMNo} />
            <Btn full onClick={() => patch(`/api/orders/delivery/${modal.item.id}/assign/`,{delivery_status:mDs,driver_name:mDn,driver_phone:mDp,vehicle_number:mDv,delivery_notes:mNo,...(mSd?{driver_id:parseInt(mSd)}:{})},'✅ Driver assigned')} disabled={saving} color="#7C3AED">{saving?'Saving...':'✓ Assign Driver'}</Btn>
          </div>
        </Modal>
      )}

      {/* Stock Edit */}
      {modal?.type==='stock-edit' && (
        <Modal title={`🏭 Update Stock — ${modal.item.product_details?.product_name}`} onClose={() => openModal(null)}>
          <p className="text-white/50 text-xs mb-4">Warehouse: {modal.item.warehouse_name||'Main'}</p>
          <div className="space-y-3">
            <Field label="Total Crates" value={mCr} set={v=>setMCr(parseInt(v)||0)} type="number" />
            <Field label="Total Bottles (loose)" value={mBt} set={v=>setMBt(parseInt(v)||0)} type="number" />
            <Btn full onClick={() => patch(`/api/inventory/${modal.item.id}/`,{total_crates:mCr,total_bottles:mBt},'✅ Stock updated')} disabled={saving} color="#00C864">{saving?'Saving...':'✓ Update Stock'}</Btn>
          </div>
        </Modal>
      )}

      {/* Return Approve */}
      {modal?.type==='return-approve' && (
        <Modal title={`✓ Approve Return #${modal.item.id}`} onClose={() => openModal(null)}>
          <p className="text-white/60 text-xs mb-3">{modal.item.customer_name} · {modal.item.return_type}</p>
          <Field label="Admin Notes (optional)" value={mNotes} set={setMNotes} />
          <div className="mt-4"><Btn full onClick={() => post(`/api/returns/${modal.item.id}/approve/`,{admin_notes:mNotes},'✅ Return approved')} disabled={saving} color="#00C864">{saving?'Processing...':'✓ Approve'}</Btn></div>
        </Modal>
      )}

      {/* Return Reject */}
      {modal?.type==='return-reject' && (
        <Modal title={`✕ Reject Return #${modal.item.id}`} onClose={() => openModal(null)}>
          <p className="text-white/60 text-xs mb-3">{modal.item.customer_name}</p>
          <Field label="Reason for Rejection" value={mNotes} set={setMNotes} />
          <div className="mt-4"><Btn full onClick={() => post(`/api/returns/${modal.item.id}/reject/`,{admin_notes:mNotes},'✅ Return rejected')} disabled={saving} color="#ff6b6b">{saving?'Processing...':'✕ Reject'}</Btn></div>
        </Modal>
      )}

      {/* Add Expense */}
      {modal?.type==='add-expense' && (
        <Modal title="💸 Add Expense" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Expense Name" value={mName} set={setMName} />
            <Field label="Category" value={mCat} set={setMCat} options={EXPENSE_CATS} />
            <Field label="Amount (₹)" value={mAmt} set={setMAmt} type="number" />
            <Field label="Date" value={mDt} set={setMDt} type="date" />
            <Field label="Notes" value={mNt} set={setMNt} />
            <Btn full onClick={() => {
              const e1 = validateExpenseName(mName)
              const e2 = validateAmount(mAmt)
              const e3 = validateExpenseDate(mDt)
              if (e1 || e2 || e3) { showToast('❌ ' + (e1 || e2 || e3)); return }
              post('/api/expenses/expenses/',{expense_name:mName,category:mCat,amount:mAmt,date:mDt,notes:mNt},'✅ Expense added')
            }} disabled={saving||!mName||!mAmt} color="#F5B400">{saving?'Saving...':'+ Add Expense'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Supplier */}
      {modal?.type==='add-supplier' && (
        <Modal title="🏪 Add Supplier" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Supplier Name" value={mNm} set={setMNm} />
            <Field label="Contact Person" value={mCp} set={setMCp} />
            <Field label="Phone" value={mPh} set={setMPh} />
            <Field label="Email" value={mEm} set={setMEm} type="email" />
            <Btn full onClick={() => post('/api/suppliers/suppliers/',{name:mNm,contact_person:mCp,phone:mPh,email:mEm},'✅ Supplier added')} disabled={saving||!mNm||!mPh} color="#1E6FFF">{saving?'Saving...':'+ Add Supplier'}</Btn>
          </div>
        </Modal>
      )}

      {/* Credit Payment */}
      {modal?.type==='credit-pay' && (
        <Modal title={`💳 Record Payment — ${modal.item.shop_name}`} onClose={() => openModal(null)}>
          <p className="text-white/50 text-xs mb-3">Outstanding: <span className="text-red-400 font-bold">₹{modal.item.outstanding?.toFixed(0)}</span></p>
          {(creditTxns||[]).filter(t=>t.customer===modal.item.customer_id&&['Pending','Partial'].includes(t.status)).length>0?(
            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs block mb-1">Select Transaction</label>
                <select value={mSelTxn} onChange={e=>setMSelTxn(e.target.value)} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                  {(creditTxns||[]).filter(t=>t.customer===modal.item.customer_id&&['Pending','Partial'].includes(t.status)).map(t=><option key={t.id} value={t.id} style={{background:'#0d1b35'}}>Txn #{t.id} — ₹{t.remaining_amount}</option>)}
                </select>
              </div>
              <Field label="Payment Amount (₹)" value={mAmt} set={setMAmt} type="number" />
              <Btn full onClick={() => post(`/api/expenses/credits/${mSelTxn}/make_payment/`,{payment_amount:mAmt},'✅ Payment recorded')} disabled={saving||!mAmt} color="#00C864">{saving?'Processing...':'✓ Record Payment'}</Btn>
            </div>
          ):(
            <p className="text-white/40 text-sm text-center py-4">No open credit transactions for this customer.</p>
          )}
        </Modal>
      )}

      {/* Customer Detail */}
      {modal?.type==='customer-detail' && (
        <Modal title={`👥 ${modal.item.shop_name}`} onClose={() => openModal(null)}>
          <div className="space-y-2 text-xs">
            {[['Owner',modal.item.owner_name],['Phone',modal.item.phone],['Address',modal.item.address],['Village',modal.item.village],['Credit Limit',`₹${parseFloat(modal.item.credit_limit||0).toLocaleString('en-IN')}`],['Email',modal.item.email||'—']].map(([k,v])=>(
              <div key={k} className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">{k}</span><span className="text-white font-medium">{v}</span></div>
            ))}
          </div>
        </Modal>
      )}

      {/* Add Product */}
      {modal?.type==='add-product' && (
        <Modal title="🥤 Add New Product" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Product Name *" value={mProdNm} set={setMProdNm} />
            <Field label="Brand *" value={mProdBr} set={setMProdBr} />
            <Field label="Bottle Size *" value={mProdSz} set={setMProdSz} options={['200ml','300ml','600ml','1L','2L']} />
            <Field label="Crate Size (bottles/crate) *" value={mProdCs} set={setMProdCs} type="number" />
            <Field label="Rate per Bottle (₹) *" value={mProdRt} set={setMProdRt} type="number" />
            <Field label="Expiry Date *" value={mProdEx} set={setMProdEx} type="date" />
            <div>
              <label className="text-white/50 text-xs block mb-1">Product Image (optional)</label>
              <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer hover:opacity-80 transition-all"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.2)', minHeight:'72px' }}>
                {mProdImgPreview
                  ? <img src={mProdImgPreview} alt="preview" className="h-16 object-contain rounded-xl p-1" />
                  : <div className="flex flex-col items-center py-3 gap-1"><span className="text-2xl">📷</span><span className="text-white/40 text-xs">Click to upload image</span></div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files[0]; if(f){setMProdImg(f);setMProdImgPreview(URL.createObjectURL(f))} }} />
              </label>
              {mProdImgPreview && <button onClick={() => {setMProdImg(null);setMProdImgPreview(null)}} className="text-red-400/60 hover:text-red-400 text-xs mt-1">✕ Remove</button>}
            </div>
            <Btn full onClick={() => postFormData('/api/products/', buildProductForm(), '✅ Product added!')} disabled={saving||!mProdNm||!mProdRt||!mProdEx||!mProdCs} color="linear-gradient(135deg,#7C3AED,#5b21b6)">{saving?'Saving...':'+ Add Product'}</Btn>
          </div>
        </Modal>
      )}

      {/* Edit Product */}
      {modal?.type==='edit-product' && (
        <Modal title={`✏️ Edit — ${modal.item.product_name}`} onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Product Name" value={mProdNm} set={setMProdNm} />
            <Field label="Brand" value={mProdBr} set={setMProdBr} />
            <Field label="Bottle Size" value={mProdSz} set={setMProdSz} options={['200ml','300ml','600ml','1L','2L']} />
            <Field label="Crate Size" value={mProdCs} set={setMProdCs} type="number" />
            <Field label="Rate per Bottle (₹)" value={mProdRt} set={setMProdRt} type="number" />
            <Field label="Expiry Date" value={mProdEx} set={setMProdEx} type="date" />
            <div>
              <label className="text-white/50 text-xs block mb-1">Product Image</label>
              <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer hover:opacity-80 transition-all"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.2)', minHeight:'72px' }}>
                {mProdImgPreview
                  ? <img src={mProdImgPreview} alt="preview" className="h-16 object-contain rounded-xl p-1" />
                  : <div className="flex flex-col items-center py-3 gap-1"><span className="text-2xl">📷</span><span className="text-white/40 text-xs">Click to change image</span></div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files[0]; if(f){setMProdImg(f);setMProdImgPreview(URL.createObjectURL(f))} }} />
              </label>
              {mProdImgPreview && <button onClick={() => {setMProdImg(null);setMProdImgPreview(null)}} className="text-red-400/60 hover:text-red-400 text-xs mt-1">✕ Remove</button>}
            </div>
            <Btn full onClick={() => patchFormData(`/api/products/${modal.item.id}/`, buildProductForm(), '✅ Product updated!')} disabled={saving} color="linear-gradient(135deg,#7C3AED,#5b21b6)">{saving?'Saving...':'✓ Update Product'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Stock */}
      {modal?.type==='add-stock' && (
        <Modal title="🏭 Add New Stock Entry" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">Product *</label>
              <select value={mStockPid} onChange={e=>setMStockPid(e.target.value)} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <option value="" style={{background:'#0d1b35'}}>— Select Product —</option>
                {(products||[]).map(p=><option key={p.id} value={p.id} style={{background:'#0d1b35'}}>{p.brand} — {p.product_name} ({p.bottle_size})</option>)}
              </select>
            </div>
            <Field label="Warehouse Name" value={mStockWh} set={setMStockWh} />
            <Field label="Total Crates" value={mStockCr} set={setMStockCr} type="number" />
            <Field label="Total Bottles (loose)" value={mStockBt} set={setMStockBt} type="number" />
            <Btn full onClick={() => {
              const pid = parseInt(mStockPid)
              const cr  = parseInt(mStockCr) || 0
              const bt  = parseInt(mStockBt) || 0
              if (!pid || isNaN(pid)) return
              post('/api/inventory/', { product: pid, warehouse_name: mStockWh, total_crates: cr, total_bottles: bt }, '✅ Stock added!')
            }} disabled={saving||!mStockPid} color="linear-gradient(135deg,#00C864,#00a050)">{saving?'Saving...':'+ Add Stock'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Purchase Order */}
      {modal?.type==='add-po' && (
        <Modal title="📋 New Purchase Order" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">Supplier *</label>
              <select value={mPoSup} onChange={e=>setMPoSup(e.target.value)} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <option value="" style={{background:'#0d1b35'}}>— Select Supplier —</option>
                {(suppliers||[]).map(s=><option key={s.id} value={s.id} style={{background:'#0d1b35'}}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">Product *</label>
              <select value={mPoPid} onChange={e=>{setMPoPid(e.target.value);const p=(products||[]).find(x=>x.id===parseInt(e.target.value));if(p)setMPoPrice(String(p.rate_per_bottle||''))}} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <option value="" style={{background:'#0d1b35'}}>— Select Product —</option>
                {(products||[]).map(p=><option key={p.id} value={p.id} style={{background:'#0d1b35'}}>{p.brand} — {p.product_name}</option>)}
              </select>
            </div>
            <Field label="Quantity (crates)" value={mPoQty} set={setMPoQty} type="number" />
            <Field label="Price per bottle (₹)" value={mPoPrice} set={setMPoPrice} type="number" />
            <Btn full onClick={() => post('/api/suppliers/purchase-orders/',{supplier:parseInt(mPoSup),items:[{product:parseInt(mPoPid),quantity_crates:parseInt(mPoQty),quantity_bottles:0,cost_per_bottle:parseFloat(mPoPrice)}]},'✅ Purchase order created!')} disabled={saving||!mPoSup||!mPoPid||!mPoQty||!mPoPrice} color="linear-gradient(135deg,#00C864,#00a050)">{saving?'Saving...':'+ Create PO'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Order */}
      {modal?.type==='add-order' && (
        <Modal title="📦 New Order" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">Customer *</label>
              <select value={mOrdCust} onChange={e=>setMOrdCust(e.target.value)} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <option value="" style={{background:'#0d1b35'}}>— Select Customer —</option>
                {(customers||[]).map(c=><option key={c.id} value={c.id} style={{background:'#0d1b35'}}>{c.shop_name} — {c.owner_name}</option>)}
              </select>
            </div>
            {mOrdItems.map((it,idx)=>(
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-white/50 text-xs block mb-1">Product</label>
                  <select value={it.product_id} onChange={e=>setMOrdItems(prev=>prev.map((x,i)=>i===idx?{...x,product_id:e.target.value}:x))} className="w-full px-3 py-2 rounded-xl text-white text-xs focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                    <option value="" style={{background:'#0d1b35'}}>— Select —</option>
                    {(products||[]).map(p=><option key={p.id} value={p.id} style={{background:'#0d1b35'}}>{p.product_name} ₹{p.rate_per_bottle}</option>)}
                  </select>
                </div>
                <div style={{width:'70px'}}>
                  <label className="text-white/50 text-xs block mb-1">Qty</label>
                  <input type="number" value={it.qty} onChange={e=>setMOrdItems(prev=>prev.map((x,i)=>i===idx?{...x,qty:parseInt(e.target.value)||1}:x))} className="w-full px-2 py-2 rounded-xl text-white text-xs focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}} min="1" />
                </div>
                {mOrdItems.length>1&&<button onClick={()=>setMOrdItems(prev=>prev.filter((_,i)=>i!==idx))} className="text-red-400/60 hover:text-red-400 pb-2">✕</button>}
              </div>
            ))}
            <button onClick={()=>setMOrdItems(prev=>[...prev,{product_id:'',qty:1}])} className="text-xs text-white/40 hover:text-white transition-colors">+ Add Product</button>
            <Field label="Payment Status" value={mOrdPay} set={setMOrdPay} options={PAYMENT_STATUSES} />
            <Btn full onClick={async()=>{
              if(!mOrdCust){showToast('❌ Select a customer');return}
              const valid=mOrdItems.filter(i=>i.product_id&&parseInt(i.qty)>0)
              if(!valid.length){showToast('❌ Add at least one product');return}
              setSaving(true)
              try{
                await api.post('/api/orders/admin/create/',{items:valid.map(i=>({product_id:parseInt(i.product_id),quantity:parseInt(i.qty)})),customer_id:parseInt(mOrdCust),payment_status:mOrdPay})
                showToast('✅ Order created!');openModal(null);await loadAll()
              }catch(e){showToast('❌ '+(e.response?.data?.error||'Failed'))}
              finally{setSaving(false)}
            }} disabled={saving} color="#C00000">{saving?'Creating...':'✓ Create Order'}</Btn>
          </div>
        </Modal>
      )}

      {/* Send Notification */}
      {modal?.type==='send-notif' && (
        <Modal title="📤 Send Notification" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">Target</label>
              <select value={mNotifTarget} onChange={e=>setMNotifTarget(e.target.value)} className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <option value="all" style={{background:'#0d1b35'}}>All Users</option>
                <option value="customers" style={{background:'#0d1b35'}}>Customers Only</option>
                {(users||[]).map(u=><option key={u.id} value={u.id} style={{background:'#0d1b35'}}>{u.username}</option>)}
              </select>
            </div>
            <Field label="Title *" value={mNotifTitle} set={setMNotifTitle} />
            <div>
              <label className="text-white/50 text-xs block mb-1">Message *</label>
              <textarea value={mNotifMsg} onChange={e=>setMNotifMsg(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}} />
            </div>
            <Field label="Type" value={mNotifType} set={setMNotifType} options={['general','order','payment','offer','system']} />
            <Btn full onClick={() => post('/api/notifications/admin/send/',{target:mNotifTarget,title:mNotifTitle,message:mNotifMsg,type:mNotifType},'✅ Notification sent!')} disabled={saving||!mNotifTitle||!mNotifMsg} color="#7C3AED">{saving?'Sending...':'📤 Send'}</Btn>
          </div>
        </Modal>
      )}

      {/* WhatsApp Broadcast */}
      {modal?.type==='wa-broadcast' && (
        <Modal title="💬 WhatsApp Broadcast" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-xs" style={{ background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.2)', color:'#25D366' }}>
              📢 This will send a WhatsApp message to ALL customers. Use carefully.
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">Message * (max 1000 chars)</label>
              <textarea value={mBroadcastMsg} onChange={e=>setMBroadcastMsg(e.target.value)} rows={5}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}
                placeholder="Type your message here... (supports *bold* formatting)" />
              <p className="text-white/25 text-xs mt-1 text-right">{mBroadcastMsg.length}/1000</p>
            </div>
            <Btn full
              onClick={async () => {
                setSaving(true)
                try {
                  const res = await api.post('/api/analytics/whatsapp-broadcast/', { message: mBroadcastMsg })
                  showToast(`✅ Sent to ${res.data.sent} customers (${res.data.failed} failed)`)
                  openModal(null)
                } catch(e) { showToast('❌ ' + (e.response?.data?.error || 'Broadcast failed')) }
                finally { setSaving(false) }
              }}
              disabled={saving || !mBroadcastMsg.trim()}
              color="linear-gradient(135deg,#25D366,#128C7E)">
              {saving ? 'Sending...' : '💬 Send to All Customers'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Edit Customer Credit */}
      {modal?.type==='edit-credit' && (
        <Modal title={`💳 Edit Credit — ${modal.item?.shop_name}`} onClose={() => openModal(null)}>
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-xs" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white/50">Current Credit Limit</p>
              <p className="text-white font-bold text-lg">₹{parseFloat(modal.item?.credit_limit||0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">New Credit Limit (₹) *</label>
              <input type="number" min="0" value={mEditCredit} onChange={e=>setMEditCredit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}}
                placeholder="e.g. 50000" />
            </div>
            <Btn full
              onClick={async () => {
                setSaving(true)
                try {
                  await api.patch(`/api/analytics/customers/${modal.item.id}/credit/`, { credit_limit: parseFloat(mEditCredit) })
                  showToast(`✅ Credit limit updated to ₹${parseFloat(mEditCredit).toLocaleString('en-IN')}`)
                  openModal(null)
                  await loadAll(tab)
                } catch(e) { showToast('❌ ' + (e.response?.data?.error || 'Update failed')) }
                finally { setSaving(false) }
              }}
              disabled={saving || !mEditCredit}
              color="#1E6FFF">
              {saving ? 'Saving...' : '💳 Update Credit Limit'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Chat Messages */}
      {modal?.type==='chat-msgs' && (
        <Modal title={`💬 Chat — ${modal.item.user}`} onClose={() => openModal(null)}>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {chatMsgs.length === 0 && <p className="text-white/30 text-xs text-center py-4">Loading messages...</p>}
            {chatMsgs.map((m,i) => (
              <div key={i} className={`flex gap-2 ${m.role==='user'?'justify-end':''}`}>
                <div className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                  style={{ background: m.role==='user'?'rgba(30,111,255,0.25)':'rgba(255,255,255,0.07)', color: m.role==='user'?'#74b9ff':'#ccc' }}>
                  <p className="font-semibold mb-0.5 text-white/40">{m.role==='user'?'👤 User':'🤖 Bot'}</p>
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Add Offer */}
      {modal?.type==='add-offer' && (
        <Modal title="🎁 New Offer" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Title *" value={mOfferTitle} set={setMOfferTitle} />
            <div>
              <label className="text-white/50 text-xs block mb-1">Description *</label>
              <textarea value={mOfferDesc} onChange={e=>setMOfferDesc(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}} />
            </div>
            <Field label="Tag (e.g. SUMMER SALE)" value={mOfferTag} set={setMOfferTag} />
            <Field label="Emoji" value={mOfferEmoji} set={setMOfferEmoji} />
            <Field label="Accent Color" value={mOfferAccent} set={setMOfferAccent} options={['gold','red','blue','green','purple']} />
            <Field label="Expires At *" value={mOfferExp} set={setMOfferExp} type="date" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="offerActive" checked={mOfferActive} onChange={e=>setMOfferActive(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="offerActive" className="text-white/60 text-xs">Active (visible to customers)</label>
            </div>
            <Btn full onClick={() => post('/api/notifications/admin/offers/',{title:mOfferTitle,description:mOfferDesc,tag:mOfferTag,emoji:mOfferEmoji,accent:mOfferAccent,expires_at:mOfferExp,is_active:mOfferActive},'✅ Offer created!')} disabled={saving||!mOfferTitle||!mOfferDesc||!mOfferTag||!mOfferExp} color="#F5B400">{saving?'Saving...':'+ Create Offer'}</Btn>
          </div>
        </Modal>
      )}

      {/* Edit Offer */}
      {modal?.type==='edit-offer' && (
        <Modal title={`✏️ Edit — ${modal.item.title}`} onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Title" value={mOfferTitle} set={setMOfferTitle} />
            <div>
              <label className="text-white/50 text-xs block mb-1">Description</label>
              <textarea value={mOfferDesc} onChange={e=>setMOfferDesc(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)'}} />
            </div>
            <Field label="Tag" value={mOfferTag} set={setMOfferTag} />
            <Field label="Emoji" value={mOfferEmoji} set={setMOfferEmoji} />
            <Field label="Accent Color" value={mOfferAccent} set={setMOfferAccent} options={['gold','red','blue','green','purple']} />
            <Field label="Expires At" value={mOfferExp} set={setMOfferExp} type="date" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="offerActiveEdit" checked={mOfferActive} onChange={e=>setMOfferActive(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="offerActiveEdit" className="text-white/60 text-xs">Active</label>
            </div>
            <Btn full onClick={() => patch(`/api/notifications/admin/offers/${modal.item.id}/`,{title:mOfferTitle,description:mOfferDesc,tag:mOfferTag,emoji:mOfferEmoji,accent:mOfferAccent,expires_at:mOfferExp,is_active:mOfferActive},'✅ Offer updated!')} disabled={saving} color="#F5B400">{saving?'Saving...':'✓ Update Offer'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Driver */}
      {modal?.type==='add-driver' && (
        <Modal title="🧑‍✈️ Add Delivery Driver" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Driver Name *" value={mDrvName} set={setMDrvName} />
            <Field label="Phone *" value={mDrvPhone} set={setMDrvPhone} />
            <Field label="Email" value={mDrvEmail} set={setMDrvEmail} type="email" />
            <Field label="Vehicle Number" value={mDrvVeh} set={setMDrvVeh} />
            <Field label="Vehicle Type" value={mDrvType} set={setMDrvType} options={['Truck','Van','Bike','Auto','Other']} />
            <Btn full onClick={() => post('/api/orders/drivers/',{name:mDrvName,phone:mDrvPhone,email:mDrvEmail,vehicle_number:mDrvVeh,vehicle_type:mDrvType,is_active:true},'✅ Driver added!')} disabled={saving||!mDrvName||!mDrvPhone} color="#7C3AED">{saving?'Saving...':'+ Add Driver'}</Btn>
          </div>
        </Modal>
      )}

      {/* Edit UPI Config */}
      {modal?.type==='edit-upi' && (
        <Modal title="📱 Edit UPI Config" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="UPI ID *" value={mUpiId} set={setMUpiId} />
            <Field label="Account Name *" value={mUpiName} set={setMUpiName} />
            <Field label="Bank Name" value={mUpiBank} set={setMUpiBank} />
            <div>
              <label className="text-white/50 text-xs block mb-1">QR Code Image (JPEG/PNG/WebP, max 3MB)</label>
              <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer hover:opacity-80 transition-all"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.2)', minHeight:'80px' }}>
                {mUpiImgPreview
                  ? <img src={mUpiImgPreview} alt="QR" className="h-20 object-contain rounded-xl p-1" />
                  : <div className="flex flex-col items-center py-3 gap-1"><span className="text-2xl">📷</span><span className="text-white/40 text-xs">Click to upload QR image</span></div>
                }
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files[0];if(f){setMUpiImg(f);setMUpiImgPreview(URL.createObjectURL(f))}}} />
              </label>
              {mUpiImgPreview && <button onClick={()=>{setMUpiImg(null);setMUpiImgPreview(null)}} className="text-red-400/60 hover:text-red-400 text-xs mt-1">✕ Remove</button>}
            </div>
            <Btn full onClick={async()=>{
              if(!mUpiId||!mUpiName){showToast('❌ UPI ID and Name required');return}
              setSaving(true)
              try{
                const fd=new FormData()
                fd.append('upi_id',mUpiId)
                fd.append('upi_name',mUpiName)
                fd.append('bank_name',mUpiBank)
                if(mUpiImg) fd.append('qr_image',mUpiImg)
                const res=await api.patch('/api/billing/upi-config/',fd,{headers:{'Content-Type':'multipart/form-data'}})
                setUpiConfig(res.data)
                showToast('✅ UPI config updated!')
                openModal(null)
              }catch(e){showToast('❌ '+(e.response?.data?.error||'Failed'))}
              finally{setSaving(false)}
            }} disabled={saving} color="#9b59b6">{saving?'Saving...':'✓ Save UPI Config'}</Btn>
          </div>
        </Modal>
      )}

      {/* Add Customer */}
      {modal?.type==='add-customer' && (
        <Modal title="👥 Add New Customer" onClose={() => openModal(null)}>
          <div className="space-y-3">
            <Field label="Shop Name *" value={mCustShop} set={setMCustShop} />
            <Field label="Owner Name *" value={mCustOwner} set={setMCustOwner} />
            <Field label="Phone *" value={mCustPhone} set={setMCustPhone} />
            <Field label="Village" value={mCustVill} set={setMCustVill} />
            <Field label="Address" value={mCustAddr} set={setMCustAddr} />
            <Field label="Credit Limit (₹)" value={mCustCred} set={setMCustCred} type="number" />
            <Btn full onClick={() => post('/api/customers/',{shop_name:mCustShop,owner_name:mCustOwner,phone:mCustPhone,village:mCustVill,address:mCustAddr,credit_limit:parseFloat(mCustCred)||50000},'✅ Customer added!')} disabled={saving||!mCustShop||!mCustOwner||!mCustPhone} color="#1E6FFF">{saving?'Saving...':'+ Add Customer'}</Btn>
          </div>
        </Modal>
      )}

    </div>
  )
}
