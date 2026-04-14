import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Droplet, Eye, EyeOff, Store, User, Phone, MapPin,
  AtSign, Lock, CheckCircle, ArrowRight, Package, Truck, BarChart2, CreditCard
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  validatePhone, validateUsername, validateEmail,
  validateName, validatePassword, validateSafeText,
  validateVillage, validateAddress, validateShopName,
  passwordStrength, STRENGTH_LABEL, STRENGTH_COLOR
} from '../utils/validators'

const STEPS = [
  { id: 1, label: 'Shop Info', icon: Store },
  { id: 2, label: 'Personal',  icon: User },
  { id: 3, label: 'Account',   icon: Lock },
]
const BENEFITS = [
  { icon: Package,    text: 'Real-time inventory tracking' },
  { icon: Truck,      text: 'Order & delivery management' },
  { icon: BarChart2,  text: 'Sales analytics & reports' },
  { icon: CreditCard, text: 'Credit & billing system' },
]

export default function RegisterPage() {
  const { t } = useTranslation()
  const [step, setStep]         = useState(1)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [touched, setTouched]   = useState({})
  const navigate = useNavigate()

  const [form, setForm] = useState({
    shop_name: '', full_name: '', mobile_number: '',
    village: '', address: '', username: '',
    email: '', password: '', confirm_password: '',
  })

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setTouched(prev => ({ ...prev, [k]: true }))
  }
  const touch = (k) => () => setTouched(prev => ({ ...prev, [k]: true }))

  // Per-field inline errors
  const fieldError = (k) => {
    if (!touched[k]) return ''
    switch (k) {
      case 'shop_name':        return validateShopName(form.shop_name)
      case 'village':          return validateVillage(form.village)
      case 'address':          return validateAddress(form.address)
      case 'full_name':        return validateName(form.full_name, 'Owner name')
      case 'mobile_number':    return validatePhone(form.mobile_number)
      case 'username':         return validateUsername(form.username)
      case 'email':            return validateEmail(form.email)
      case 'password':         return validatePassword(form.password)
      case 'confirm_password': return form.confirm_password && form.confirm_password !== form.password ? 'Passwords do not match' : ''
      default: return ''
    }
  }

  const validateStep = () => {
    setError('')
    const errs = []
    if (step === 1) {
      const e1 = validateShopName(form.shop_name)
      const e2 = validateVillage(form.village)
      const e3 = validateAddress(form.address)
      if (e1) errs.push(e1)
      if (e2) errs.push(e2)
      if (e3) errs.push(e3)
      setTouched(prev => ({ ...prev, shop_name: true, village: true, address: true }))
    }
    if (step === 2) {
      const e1 = validateName(form.full_name, 'Owner name')
      const e2 = validatePhone(form.mobile_number)
      if (e1) errs.push(e1)
      if (e2) errs.push(e2)
      setTouched(prev => ({ ...prev, full_name: true, mobile_number: true }))
    }
    if (step === 3) {
      const e1 = validateUsername(form.username)
      const e2 = validateEmail(form.email)
      const e3 = validatePassword(form.password)
      const e4 = form.password !== form.confirm_password ? 'Passwords do not match' : ''
      if (e1) errs.push(e1)
      if (e2) errs.push(e2)
      if (e3) errs.push(e3)
      if (e4) errs.push(e4)
      setTouched(prev => ({ ...prev, username: true, email: true, password: true, confirm_password: true }))
    }
    if (errs.length) { setError(errs[0]); return false }
    return true
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep()) return
    setLoading(true); setError('')
    try {
      const { confirm_password, ...payload } = form
      payload.password_confirm = confirm_password
      const res = await axios.post('/api/customers/register/', payload)
      // Auto-login after registration
      if (res.data.tokens) {
        localStorage.setItem('access', res.data.tokens.access)
        localStorage.setItem('refresh', res.data.tokens.refresh)
        localStorage.setItem('role', 'customer')
      }
      setSuccess(true)
      setTimeout(() => navigate('/customer-dashboard'), 2000)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        if (data.username)      setError('Username: ' + (Array.isArray(data.username) ? data.username[0] : data.username))
        else if (data.email)    setError('Email: ' + (Array.isArray(data.email) ? data.email[0] : data.email))
        else if (data.password) setError('Password: ' + (Array.isArray(data.password) ? data.password[0] : data.password))
        else if (data.mobile_number) setError('Phone: ' + (Array.isArray(data.mobile_number) ? data.mobile_number[0] : data.mobile_number))
        else if (data.non_field_errors) setError(Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors)
        else setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const strength = passwordStrength(form.password)

  if (success) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0a1628,#0d1b35)' }}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0,200,100,0.15)', border: '2px solid #00C864' }}>
          <CheckCircle size={40} style={{ color: '#00C864' }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('register.success')}</h2>
        <p className="text-white/50 text-sm mb-4">{t('register.successMsg')}</p>
        <div className="w-48 h-1 rounded-full mx-auto overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full animate-pulse" style={{ background: '#00C864', width: '100%' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0d1b35 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#07091A,#0a1628)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle,#F5B400,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2.5 rounded-xl"><Droplet size={22} className="text-white" /></div>
          <div><p className="text-white font-bold text-lg">ColdSync Pro</p><p className="text-white/40 text-xs">Shree Ganesh Agency</p></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">Join 500+ agencies<br /><span style={{ color: '#F5B400' }}>managing smarter</span></h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">Register your cold drink shop and get access to complete business management.</p>
          <div className="space-y-4 mb-10">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,180,0,0.12)' }}><Icon size={15} style={{ color: '#F5B400' }} /></div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{ background: step >= s.id ? 'linear-gradient(135deg,#C00000,#F5B400)' : 'rgba(255,255,255,0.08)', color: step >= s.id ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {step > s.id ? '✓' : s.id}
                  </div>
                  <span className="text-xs hidden xl:block" style={{ color: step >= s.id ? '#F5B400' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-0.5 rounded" style={{ background: step > s.id ? '#F5B400' : 'rgba(255,255,255,0.1)' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs relative z-10">© {new Date().getFullYear()} ColdSync Pro. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2 rounded-lg"><Droplet size={18} className="text-white" /></div>
            <span className="text-white font-bold">ColdSync Pro</span>
          </div>
          <div className="lg:hidden flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: step >= s.id ? 'linear-gradient(135deg,#C00000,#F5B400)' : 'rgba(255,255,255,0.08)', color: step >= s.id ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {step > s.id ? '✓' : s.id}
                  </div>
                  <span className="text-xs" style={{ color: step >= s.id ? '#F5B400' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-0.5 rounded" style={{ background: step > s.id ? '#F5B400' : 'rgba(255,255,255,0.1)' }} />}
              </React.Fragment>
            ))}
          </div>

          <div className="rounded-2xl p-8 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="mb-7">
              <h3 className="text-2xl font-bold text-white">
                {step === 1 && t('register.step1')}
                {step === 2 && t('register.step2')}
                {step === 3 && t('register.step3')}
              </h3>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl text-sm text-white flex items-start gap-2" style={{ background: 'rgba(192,0,0,0.2)', border: '1px solid rgba(192,0,0,0.4)' }}>
                <span className="flex-shrink-0 mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}

            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); next() }}>
              {step === 1 && (
                <div className="space-y-4">
                  <FField icon={Store} label={t('register.shopName')} placeholder="Shree Ganesh Kirana"
                    value={form.shop_name} onChange={set('shop_name')} onBlur={touch('shop_name')}
                    error={fieldError('shop_name')} />
                  <FField icon={MapPin} label={t('register.village')} placeholder="Modnimb"
                    value={form.village} onChange={set('village')} onBlur={touch('village')}
                    error={fieldError('village')} />
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('register.address')}</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-3.5 text-white/30" />
                      <textarea value={form.address} onChange={set('address')} onBlur={touch('address')}
                        placeholder="Main Road, Near Temple, Modnimb - 413226"
                        className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all resize-none"
                        style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${fieldError('address') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} rows={2} />
                    </div>
                    {fieldError('address') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('address')}</p>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <FField icon={User} label={t('register.ownerName')} placeholder="Ramesh Patil"
                    value={form.full_name} onChange={set('full_name')} onBlur={touch('full_name')}
                    error={fieldError('full_name')} />
                  <FField icon={Phone} label={t('register.mobile')} placeholder="9876543210"
                    value={form.mobile_number} onChange={set('mobile_number')} onBlur={touch('mobile_number')}
                    type="tel" error={fieldError('mobile_number')}
                    hint="10-digit Indian mobile number (starts with 6–9)" />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <FField icon={AtSign} label={t('register.username')} placeholder="ramesh123"
                    value={form.username} onChange={set('username')} onBlur={touch('username')}
                    error={fieldError('username')}
                    hint="3–30 chars: letters, numbers, underscore only" />
                  <FField icon={AtSign} label={t('register.email')} placeholder="ramesh@gmail.com"
                    value={form.email} onChange={set('email')} onBlur={touch('email')}
                    type="email" error={fieldError('email')} />
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('register.password')}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={set('password')} onBlur={touch('password')}
                        placeholder="Min 6 characters"
                        className="w-full pl-9 pr-10 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${fieldError('password') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {fieldError('password') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('password')}</p>}
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                              style={{ background: strength >= i ? STRENGTH_COLOR[strength] : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</p>
                      </div>
                    )}
                  </div>
                  <FField icon={Lock} label={t('register.confirmPwd')} placeholder="Re-enter password"
                    value={form.confirm_password} onChange={set('confirm_password')} onBlur={touch('confirm_password')}
                    type="password" error={fieldError('confirm_password')} />
                </div>
              )}

              <div className="flex gap-3 mt-7">
                {step > 1 && (
                  <button type="button" onClick={back} className="flex-1 py-3 rounded-xl text-white/60 text-sm font-semibold hover:text-white transition-all border border-white/15 hover:border-white/30">
                    ← {t('register.back')}
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#C00000,#8B0000)' }}>
                  {loading
                    ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    : step < 3
                      ? <><span>{t('register.continue')}</span><ArrowRight size={16} /></>
                      : <><span>{t('register.createAccount')}</span><CheckCircle size={16} /></>
                  }
                </button>
              </div>
            </form>

            <p className="text-center text-white/35 text-sm mt-6">
              {t('register.alreadyHave')}{' '}
              <Link to="/login" style={{ color: '#F5B400' }} className="font-semibold hover:underline">{t('register.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FField({ icon: Icon, label, placeholder, value, onChange, onBlur, type = 'text', error, hint }) {
  return (
    <div>
      <label className="block text-white/60 text-xs mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${error ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
      </div>
      {error && <p className="text-red-400 text-xs mt-1">⚠ {error}</p>}
      {!error && hint && <p className="text-white/30 text-xs mt-1">{hint}</p>}
    </div>
  )
}
