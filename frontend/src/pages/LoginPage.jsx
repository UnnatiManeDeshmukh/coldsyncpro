import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, Eye, EyeOff, Package, BarChart2, CreditCard, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const BRAND_CIRCLES = [
  { letter:'C', color:'#F40009' },
  { letter:'S', color:'#00D664' },
  { letter:'F', color:'#FF8300' },
  { letter:'T', color:'#0066CC' },
]

export default function LoginPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ username:'', password:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    else if (form.username.trim().length < 3) errs.username = 'Username must be at least 3 characters'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/auth/login/', {
        username: form.username.trim(),
        password: form.password,
      })
      localStorage.setItem('access', res.data.access)
      localStorage.setItem('refresh', res.data.refresh)
      const me = await axios.get('/api/customers/profile/', {
        headers: { Authorization: `Bearer ${res.data.access}` }
      })
      if (me.data.is_staff) {
        localStorage.setItem('role', 'admin')
        navigate('/admin-dashboard')
      } else {
        localStorage.setItem('role', 'customer')
        navigate('/customer-dashboard')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('login.invalidCreds'))
      } else if (err.response?.status === 400) {
        setError('Invalid request. Please check your input.')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background:'linear-gradient(135deg,#0a1628 0%,#0d1b35 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background:'linear-gradient(135deg,#07091A,#0a1628)' }}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2.5 rounded-xl"><Droplet size={24} className="text-white" /></div>
          <div>
            <p className="text-white font-bold text-lg">ColdSync Pro</p>
            <p className="text-white/40 text-xs">Cold Drink Agency</p>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-white mb-3 leading-tight">
            {t('login.manageHeading')}<br />
            <span style={{ color:'#F5B400' }}>{t('login.manageSubheading')}</span>
          </h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            {t('login.manageDesc')}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-10">
            {[
              { icon:Package,    tKey:'login.features.inventory' },
              { icon:FileText,   tKey:'login.features.invoice' },
              { icon:BarChart2,  tKey:'login.features.analytics' },
              { icon:CreditCard, tKey:'login.features.credit' },
            ].map(({ icon:Icon, tKey }) => (
              <div key={tKey} className="flex items-center gap-3 p-3 rounded-xl border border-white/10" style={{ background:'rgba(255,255,255,0.05)' }}>
                <Icon size={16} style={{ color:'#F5B400' }} />
                <span className="text-white/70 text-xs font-medium">{t(tKey)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {BRAND_CIRCLES.map((b, i) => (
              <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-[#0a1628]"
                style={{ background: b.color }}>
                {b.letter}
              </div>
            ))}
            <span className="text-white/40 text-xs ml-1">{t('login.moreBrands')}</span>
          </div>
        </div>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} {t('appName')}. {t('login.allRights')}</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2 rounded-lg"><Droplet size={20} className="text-white" /></div>
            <span className="text-white font-bold">ColdSync Pro</span>
          </div>
          <div className="rounded-2xl p-8 border border-white/10" style={{ background:'rgba(255,255,255,0.06)' }}>
            <h3 className="text-2xl font-bold text-white mb-1">{t('login.welcomeBack')}</h3>
            <p className="text-white/40 text-sm mb-8">{t('login.signIn')}</p>
            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm text-white" style={{ background:'rgba(192,0,0,0.3)', border:'1px solid rgba(192,0,0,0.5)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-white/70 text-sm mb-2">{t('login.username')}</label>
                <input type="text" value={form.username}
                  onChange={e => { setForm({...form, username:e.target.value}); setFieldErrors(fe => ({...fe, username:''})) }}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.1)', border:`1px solid ${fieldErrors.username ? '#C00000' : 'rgba(255,255,255,0.15)'}` }}
                  placeholder={t('login.enterUsername')} autoFocus autoComplete="username" />
                {fieldErrors.username && <p className="text-red-400 text-xs mt-1">⚠ {fieldErrors.username}</p>}
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">{t('login.password')}</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => { setForm({...form, password:e.target.value}); setFieldErrors(fe => ({...fe, password:''})) }}
                    className="w-full pl-10 pr-12 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
                    style={{ background:'rgba(255,255,255,0.1)', border:`1px solid ${fieldErrors.password ? '#C00000' : 'rgba(255,255,255,0.15)'}` }}
                    placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-400 text-xs mt-1">⚠ {fieldErrors.password}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {loading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                ) : <>{t('login.signInBtn')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>}
              </button>
            </form>
            <div className="flex items-center justify-between mt-4 mb-2">
              <Link to="/forgot-password" className="text-xs hover:underline" style={{ color:'#F5B400' }}>
                Forgot Password?
              </Link>
            </div>
            <p className="text-center text-white/40 text-sm mt-2">
              {t('login.newCustomer')}{' '}
              <Link to="/register" style={{ color:'#F5B400' }} className="font-semibold hover:underline">{t('login.createAccount')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
