import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Gift, Star, Award } from 'lucide-react'
import api from '../utils/api'

const TIER_STYLE = {
  Bronze: { color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', icon: '🥉' },
  Silver: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.15)', icon: '🥈' },
  Gold:   { color: '#FFD700', bg: 'rgba(255,215,0,0.15)',   icon: '🥇' },
}

export default function CustomerLoyalty() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemPts, setRedeemPts] = useState('')
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    try {
      const r = await api.get('/api/loyalty/my/')
      setData(r.data)
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRedeem = async () => {
    const pts = parseInt(redeemPts)
    if (!pts || pts <= 0) return
    if (pts > data.points) return setMsg({ type: 'error', text: 'Not enough points' })
    setRedeeming(true)
    try {
      const r = await api.post('/api/loyalty/redeem/', { points: pts })
      setMsg({ type: 'success', text: `✅ Redeemed ${pts} pts = ₹${r.data.discount_amount} discount!` })
      setRedeemPts('')
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Redemption failed' })
    } finally { setRedeeming(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091A' }}>
      <div className="w-12 h-12 rounded-2xl animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)' }}>
        <Star size={20} className="text-white" />
      </div>
    </div>
  )

  const tier = data?.tier || 'Bronze'
  const ts = TIER_STYLE[tier] || TIER_STYLE.Bronze
  const nextTier = tier === 'Bronze' ? { name: 'Silver', need: 2000 } : tier === 'Silver' ? { name: 'Gold', need: 5000 } : null
  const progress = nextTier ? Math.min((data.total_earned / nextTier.need) * 100, 100) : 100

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/customer-dashboard')} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="text-white font-bold text-sm">⭐ Loyalty Rewards</span>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#FFD700,#FF8C00,#C00000)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Tier Card */}
        <div className="rounded-2xl p-6 border text-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg,${ts.bg},rgba(255,255,255,0.02))`, borderColor: ts.color + '40' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle,${ts.color}15,transparent 70%)`, transform: 'translate(30%,-30%)' }} />
          <p className="text-5xl mb-2">{ts.icon}</p>
          <p className="text-white font-extrabold text-2xl" style={{ fontFamily: "'Poppins',sans-serif" }}>{tier} Member</p>
          <p className="text-4xl font-extrabold mt-2" style={{ color: ts.color, fontFamily: "'Poppins',sans-serif" }}>
            {data?.points ?? 0} <span className="text-lg font-normal text-white/50">pts</span>
          </p>
          <p className="text-white/40 text-xs mt-1">100 points = ₹10 discount</p>

          {nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Progress to {nextTier.name}</span>
                <span style={{ color: ts.color }}>{data?.total_earned}/{nextTier.need} pts</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg,${ts.color},#FF8C00)` }} />
              </div>
            </div>
          )}
          {!nextTier && <p className="text-xs mt-3 font-semibold" style={{ color: ts.color }}>🏆 Maximum tier reached!</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Available', value: data?.points ?? 0, color: '#00C864', icon: '💎' },
            { label: 'Total Earned', value: data?.total_earned ?? 0, color: '#FFD700', icon: '⭐' },
            { label: 'Redeemed', value: data?.total_redeemed ?? 0, color: '#a29bfe', icon: '🎁' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="font-bold text-lg" style={{ color: s.color, fontFamily: "'Poppins',sans-serif" }}>{s.value}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Redeem */}
        {(data?.points ?? 0) >= 100 && (
          <div className="rounded-2xl p-5 border border-white/10 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-white font-bold text-sm flex items-center gap-2"><Gift size={16} style={{ color: '#FFD700' }} /> Redeem Points</p>
            <p className="text-white/40 text-xs">Min 100 pts · 100 pts = ₹10 off your next order</p>
            {msg && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{
                background: msg.type === 'success' ? 'rgba(0,200,100,0.15)' : 'rgba(192,0,0,0.15)',
                color: msg.type === 'success' ? '#00C864' : '#ff6b6b'
              }}>{msg.text}</p>
            )}
            <div className="flex gap-2">
              <input type="number" min="100" step="100" max={data?.points} value={redeemPts}
                onChange={e => { setRedeemPts(e.target.value); setMsg(null) }}
                placeholder="Enter points (min 100)"
                className="flex-1 px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }} />
              <button onClick={handleRedeem} disabled={redeeming || !redeemPts}
                className="px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)' }}>
                {redeeming ? '...' : 'Redeem'}
              </button>
            </div>
            {redeemPts >= 100 && (
              <p className="text-xs" style={{ color: '#FFD700' }}>= ₹{Math.floor(redeemPts / 100) * 10} discount</p>
            )}
          </div>
        )}

        {/* Tier Benefits */}
        <div className="rounded-2xl p-5 border border-white/10 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-white font-bold text-sm flex items-center gap-2"><Award size={16} style={{ color: '#FFD700' }} /> Tier Benefits</p>
          {[
            { tier: 'Bronze 🥉', pts: '0–1999', perks: '1 pt per ₹100 spent' },
            { tier: 'Silver 🥈', pts: '2000–4999', perks: '1 pt per ₹100 + priority support' },
            { tier: 'Gold 🥇', pts: '5000+', perks: '1 pt per ₹100 + exclusive offers + free delivery' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold">{b.tier}</p>
                <p className="text-white/40 text-xs">{b.pts} pts · {b.perks}</p>
              </div>
              {tier === b.tier.split(' ')[0] && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,100,0.15)', color: '#00C864' }}>Current</span>
              )}
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="rounded-2xl p-5 border border-white/10 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-white font-bold text-sm">📋 Recent Transactions</p>
          {(data?.transactions || []).length === 0 && (
            <p className="text-white/25 text-xs text-center py-4">No transactions yet</p>
          )}
          {(data?.transactions || []).map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p className="text-white text-xs font-medium">{t.description}</p>
                <p className="text-white/40 text-xs">{t.date}</p>
              </div>
              <span className="font-bold text-sm" style={{ color: t.type === 'redeem' ? '#ff6b6b' : '#00C864', fontFamily: "'Poppins',sans-serif" }}>
                {t.type === 'redeem' ? '-' : '+'}{t.points} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
