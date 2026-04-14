import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplet, ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import axios from 'axios'

export default function ForgotPasswordPage() {
  const [step, setStep]         = useState(1) // 1=email, 2=otp+newpass, 3=done
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [newPass, setNewPass]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [msg, setMsg]           = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true); setError('')
    try {
      const res = await axios.post('/api/customers/forgot-password/', { email: email.trim() })
      setMsg(res.data.message)
      setStep(2)
    } catch (err) {
      const e = err.response?.data
      setError(e?.error || 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!otp.trim()) { setError('OTP is required'); return }
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      await axios.post('/api/customers/reset-password/', {
        email: email.trim(), otp: otp.trim(), new_password: newPass,
      })
      setStep(3)
    } catch (err) {
      const e = err.response?.data
      setError(e?.error || 'Invalid OTP or expired. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background:'linear-gradient(135deg,#0a1628 0%,#0d1b35 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2 rounded-lg">
            <Droplet size={20} className="text-white" />
          </div>
          <span className="text-white font-bold">ColdSync Pro</span>
        </div>

        <div className="rounded-2xl p-8 border border-white/10" style={{ background:'rgba(255,255,255,0.06)' }}>

          {/* Step 3 — Success */}
          {step === 3 ? (
            <div className="text-center py-4">
              <CheckCircle size={56} className="mx-auto mb-4" style={{ color:'#00C864' }} />
              <h3 className="text-white font-bold text-xl mb-2">Password Reset!</h3>
              <p className="text-white/50 text-sm mb-6">
                Your password has been updated successfully.
              </p>
              <Link to="/login"
                className="inline-block w-full py-3 rounded-xl text-white font-bold text-sm text-center hover:opacity-90 transition-all"
                style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Link to="/login" className="text-white/40 hover:text-white transition-colors">
                  <ArrowLeft size={18} />
                </Link>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {step === 1 ? 'Forgot Password' : 'Enter OTP'}
                  </h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {step === 1
                      ? 'Enter your registered email to receive an OTP'
                      : `OTP sent to ${email} — valid for 10 minutes`}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm text-white"
                  style={{ background:'rgba(192,0,0,0.3)', border:'1px solid rgba(192,0,0,0.5)' }}>
                  {error}
                </div>
              )}
              {msg && step === 2 && (
                <div className="mb-4 p-3 rounded-xl text-sm text-white"
                  style={{ background:'rgba(0,200,100,0.15)', border:'1px solid rgba(0,200,100,0.3)' }}>
                  ✅ {msg}
                </div>
              )}

              {/* Step 1 — Email */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none"
                        style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}
                        placeholder="your@email.com" autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                    style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                    {loading
                      ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      : 'Send OTP'}
                  </button>
                </form>
              )}

              {/* Step 2 — OTP + New Password */}
              {step === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none tracking-widest"
                        style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}
                        placeholder="123456" maxLength={6} autoFocus inputMode="numeric" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">New Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 rounded-xl text-white text-sm focus:outline-none"
                        style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}
                        placeholder="Min 8 characters" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-white/25 text-xs mt-1">Minimum 8 characters</p>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                    style={{ background:'linear-gradient(135deg,#C00000,#8B0000)' }}>
                    {loading
                      ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setStep(1); setError(''); setOtp(''); setNewPass('') }}
                    className="w-full py-2 text-white/40 text-xs hover:text-white transition-colors">
                    ← Change email / Resend OTP
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Remember your password?{' '}
          <Link to="/login" className="text-yellow-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
