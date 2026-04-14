import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'EN', full: 'English',  flag: '🇬🇧' },
  { code: 'mr', label: 'मर', full: 'मराठी',    flag: '🇮🇳' },
  { code: 'hi', label: 'हि', full: 'हिंदी',    flag: '🇮🇳' },
]

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  const change = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold border border-white/10 hover:border-white/25"
        title="Change Language"
      >
        <span>{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border border-white/15 overflow-hidden shadow-2xl min-w-[130px]"
            style={{ background: '#0d1b35' }}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => change(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/10 ${
                  i18n.language === l.code ? 'text-white bg-white/8' : 'text-white/60'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.full}</span>
                {i18n.language === l.code && <span className="ml-auto text-green-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
