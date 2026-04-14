import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, MapPin, AtSign, Store, Lock, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../utils/api'
import { useTranslation } from 'react-i18next'
import {
  validatePhone, validateEmail, validateName,
  validatePassword, validateVillage, validateAddress, validateShopName,
  validateSafeText, passwordStrength, STRENGTH_LABEL, STRENGTH_COLOR
} from '../utils/validators'

export default function ProfileEdit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = localStorage.getItem('access')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')
  const [touched, setTouched] = useState({})
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    shop_name: '', address: '', village: '',
    old_password: '', new_password: '',
  })

  const touch = (k) => () => setTouched(t => ({ ...t, [k]: true }))
  const set   = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setTouched(t => ({ ...t, [k]: true }))
  }

  const fieldError = (k) => {
    if (!touched[k]) return ''
    switch (k) {
      case 'full_name':    return validateName(form.full_name, 'Owner name')
      case 'email':        return validateEmail(form.email)
      case 'phone':        return validatePhone(form.phone)
      case 'shop_name':    return validateShopName(form.shop_name)
      case 'address':      return validateAddress(form.address)
      case 'village':      return validateVillage(form.village)
      case 'new_password': return form.new_password ? validatePassword(form.new_password) : ''
      default: return ''
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/customers/profile/')
      .then(res => {
        const d = res.data
        setForm(f => ({ ...f, full_name: d.full_name || '', email: d.email || '', phone: d.phone || '', shop_name: d.shop_name || '', address: d.address || '', village: d.village || '' }))
      })
      .catch(e => { if (e.response?.status === 401) { localStorage.clear(); navigate('/login') } })
  }, [token, navigate])

  const validate = () => {
    const errs = [
      validateName(form.full_name, 'Owner name'),
      validateEmail(form.email),
      validatePhone(form.phone),
      validateSafeText(form.shop_name, 'Shop name') || (form.shop_name.trim().length < 2 ? 'Shop name is required' : ''),
      validateSafeText(form.address, 'Address') || (form.address.trim().length < 3 ? 'Address is required' : ''),
      validateSafeText(form.village, 'Village') || (form.village.trim().length < 1 ? 'Village is required' : ''),
    ].filter(Boolean)
    if (errs.length) { setError(errs[0]); return false }
    if (form.new_password) {
      const pe = validatePassword(form.new_password)
      if (pe) { setError(pe); return false }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { full_name: form.full_name, email: form.email, phone: form.phone, shop_name: form.shop_name, address: form.address, village: form.village }
      if (form.new_password) {
        payload.old_password = form.old_password
        payload.new_password = form.new_password
      }
      await api.patch('/api/customers/profile/update/', payload)
      setSuccess(true)
      setTimeout(() => navigate('/customer-dashboard'), 2000)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        if (typeof data === 'string') setError(data)
        else if (data.old_password) setError('Current password is incorrect')
        else if (data.email) setError('Email: ' + (Array.isArray(data.email) ? data.email[0] : data.email))
        else if (data.phone) setError('Phone: ' + (Array.isArray(data.phone) ? data.phone[0] : data.phone))
        else { const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`); setError(msgs[0] || 'Update failed') }
      } else { setError('Update failed. Please check your connection.') }
    } finally { setSaving(false) }
  }

  const inp = (k, type='text', placeholder='', icon) => (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>
        <input type={type} value={form[k]} onChange={set(k)} onBlur={touch(k)} placeholder={placeholder}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
          style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError(k) ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
      </div>
      {fieldError(k) && <p className="text-red-400 text-xs mt-1">⚠ {fieldError(k)}</p>}
    </div>
  )

  if (success) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'linear-gradient(135deg,#0a1628,#0d1b35)' }}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background:'rgba(0,200,100,0.15)', border:'2px solid #00C864' }}>
          <CheckCircle size={40} style={{ color:'#00C864' }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('profile.success')}</h2>
        <p className="text-white/50 text-sm">{t('profile.successMsg')}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(135deg,#0a1628 0%,#0d1b35 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/customer-dashboard')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={16} /> {t('register.back')}
          </button>
          <span className="text-white font-bold text-sm">{t('profile.title')}</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl p-6 border border-white/10" style={{ background:'rgba(255,255,255,0.05)' }}>
          <h2 className="text-2xl font-bold text-white mb-6">{t('profile.updateDetails')}</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm text-white flex items-start gap-3" style={{ background:'rgba(192,0,0,0.2)', border:'1px solid rgba(192,0,0,0.4)' }}>
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Shop Info */}
            <div className="space-y-4">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide">{t('profile.shopInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.shopName')}</label>
                  {inp('shop_name', 'text', 'Shree Ganesh Kirana', <Store size={15} />)}
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.village')}</label>
                  {inp('village', 'text', 'Modnimb', <MapPin size={15} />)}
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.address')}</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-3.5 text-white/30" />
                  <textarea value={form.address} onChange={set('address')} onBlur={touch('address')}
                    placeholder="Main Road, Near Temple, Modnimb - 413226" rows={2}
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all resize-none"
                    style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError('address') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                </div>
                {fieldError('address') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('address')}</p>}
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide">{t('profile.personalInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.ownerName')}</label>
                  {inp('full_name', 'text', 'Ramesh Patil', <User size={15} />)}
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.mobile')}</label>
                  {inp('phone', 'tel', '9876543210', <Phone size={15} />)}
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.email')}</label>
                {inp('email', 'email', 'ramesh@gmail.com', <AtSign size={15} />)}
              </div>
            </div>

            {/* Password Change */}
            <div className="space-y-4">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide">{t('profile.changePassword')}</h3>
              <p className="text-white/40 text-xs">{t('profile.keepBlank')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.currentPassword')}</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="password" value={form.old_password} onChange={set('old_password')} placeholder="Enter current password"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5 font-medium">{t('profile.newPassword')}</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="password" value={form.new_password} onChange={set('new_password')} onBlur={touch('new_password')} placeholder="Min 6 characters"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.08)', border:`1px solid ${fieldError('new_password') ? '#C00000' : 'rgba(255,255,255,0.12)'}` }} />
                  </div>
                  {fieldError('new_password') && <p className="text-red-400 text-xs mt-1">⚠ {fieldError('new_password')}</p>}
                  {form.new_password && !fieldError('new_password') && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => {
                          const s = passwordStrength(form.new_password)
                          return <div key={i} className="flex-1 h-1 rounded-full" style={{ background: s >= i ? STRENGTH_COLOR[s] : 'rgba(255,255,255,0.1)' }} />
                        })}
                      </div>
                      <p className="text-xs" style={{ color: STRENGTH_COLOR[passwordStrength(form.new_password)] }}>{STRENGTH_LABEL[passwordStrength(form.new_password)]}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => navigate('/customer-dashboard')}
                className="flex-1 py-3 rounded-xl text-white/60 text-sm font-semibold hover:text-white transition-all border border-white/15 hover:border-white/30">
                {t('profile.cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                {saving
                  ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <><span>{t('profile.save')}</span><CheckCircle size={16} /></>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
