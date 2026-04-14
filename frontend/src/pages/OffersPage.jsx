import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplet, ArrowLeft, Tag } from 'lucide-react'
import api from '../utils/api'
import { useTranslation } from 'react-i18next'

const ACCENT_STYLES = {
  red:    { bg:'rgba(192,0,0,0.15)',    border:'rgba(192,0,0,0.3)',    text:'#C00000' },
  blue:   { bg:'rgba(30,111,255,0.15)', border:'rgba(30,111,255,0.3)', text:'#1E6FFF' },
  gold:   { bg:'rgba(245,180,0,0.15)',  border:'rgba(245,180,0,0.3)',  text:'#F5B400' },
  orange: { bg:'rgba(255,131,0,0.15)',  border:'rgba(255,131,0,0.3)',  text:'#FF8300' },
  purple: { bg:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.3)', text:'#7C3AED' },
  green:  { bg:'rgba(0,200,100,0.15)',  border:'rgba(0,200,100,0.3)',  text:'#00C864' },
}

export default function OffersPage() {
  const { t } = useTranslation()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('access')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/api/notifications/offers/')
      .then(r => setOffers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const daysLeft = (expires) => {
    const diff = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return 'Expires today'
    return diff
  }

  return (
    <div className="min-h-screen" style={{ background:'#07091A' }}>
      <div className="sticky top-0 z-40 border-b border-white/10" style={{ background:'rgba(7,9,26,0.95)', backdropFilter:'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/customer-dashboard" className="text-white/60 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-1.5 rounded-lg"><Droplet size={16} className="text-white" /></div>
            <span className="text-white font-bold text-sm">{t('offers.title')}</span>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background:'linear-gradient(90deg,#C00000,#F5B400,#00C864,#1E6FFF)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-10 h-10" style={{ color:'#1E6FFF' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🎁</span>
            <p className="text-white/40 text-sm">{t('offers.noOffers')}</p>
            <p className="text-white/20 text-xs mt-2">{t('offers.checkBack')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {offers.map(offer => {
              const style = ACCENT_STYLES[offer.accent] || ACCENT_STYLES.gold
              const days = daysLeft(offer.expires_at)
              return (
                <div key={offer.id} className="rounded-2xl p-5 border transition-all hover:scale-[1.01]"
                  style={{ background: style.bg, borderColor: style.border }}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{offer.emoji}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: style.border, color: style.text }}>
                        {offer.tag}
                      </span>
                      <span className="text-xs" style={{ color: (typeof days === 'string' || days <= 3) ? '#C00000' : 'rgba(255,255,255,0.4)' }}>
                        {typeof days === 'string' ? days : `${days} ${t('offers.daysLeft')}`}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{offer.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{offer.description}</p>
                  <Link to="/catalog" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                    style={{ background: style.text }}
                    onClick={() => {
                      // Track offer claim via notification
                      api.post('/api/notifications/admin/send/', {
                        target: 'all', title: `Offer Claimed: ${offer.title}`,
                        message: `A customer clicked on offer: ${offer.title}`, type: 'general'
                      }).catch(() => {})
                    }}>
                    <Tag size={12} /> {t('offers.shopNow')}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
