import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

/**
 * PWA Install Prompt — shows "Add to Home Screen" banner
 * Appears after 3 seconds if app is not already installed
 */
export default function PWAInstallPrompt() {
  const [prompt, setPrompt]     = useState(null)
  const [visible, setVisible]   = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa_dismissed')
    if (dismissed) return

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      // Show after 3 seconds
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setVisible(false)
    setPrompt(null)
  }

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa_dismissed', '1')
  }

  if (!visible || installed) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[200] rounded-2xl p-4 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg,#0d1b35,#1a2a4a)',
        border: '1px solid rgba(192,0,0,0.4)',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#C00000,#F5B400)' }}>
          <span className="text-2xl">🥤</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Install ColdSync Pro</p>
          <p className="text-white/50 text-xs mt-0.5">
            Add to home screen for quick access — works offline too!
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#C00000,#F5B400)' }}
            >
              <Download size={14} />
              Install App
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-2 rounded-xl text-white/40 text-xs hover:text-white hover:bg-white/10 transition-all"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button onClick={dismiss} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* iOS instruction */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
        <Smartphone size={12} className="text-white/30 flex-shrink-0" />
        <p className="text-white/30 text-xs">
          iPhone/iPad: tap <span className="text-white/50">Share</span> → <span className="text-white/50">Add to Home Screen</span>
        </p>
      </div>
    </div>
  )
}
