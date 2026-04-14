import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Global toast state
let _addToast = null

export function toast(message, type = 'info', duration = 3500) {
  if (_addToast) _addToast({ message, type, duration, id: Date.now() + Math.random() })
}
toast.success = (msg, dur) => toast(msg, 'success', dur)
toast.error   = (msg, dur) => toast(msg, 'error', dur)
toast.info    = (msg, dur) => toast(msg, 'info', dur)
toast.warning = (msg, dur) => toast(msg, 'warning', dur)

const STYLES = {
  success: { bg: 'rgba(0,200,100,0.15)', border: 'rgba(0,200,100,0.4)', icon: '✅', color: '#00C864' },
  error:   { bg: 'rgba(192,0,0,0.15)',   border: 'rgba(192,0,0,0.4)',   icon: '❌', color: '#ff6b6b' },
  warning: { bg: 'rgba(245,180,0,0.15)', border: 'rgba(245,180,0,0.4)', icon: '⚠️', color: '#F5B400' },
  info:    { bg: 'rgba(30,111,255,0.15)',border: 'rgba(30,111,255,0.4)',icon: 'ℹ️', color: '#1E6FFF' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev.slice(-4), t]) // max 5 toasts
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration)
  }, [])

  useEffect(() => { _addToast = addToast; return () => { _addToast = null } }, [addToast])

  if (!toasts.length) return null

  return createPortal(
    <div style={{ position: 'fixed', bottom: 24, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
      {toasts.map(t => {
        const s = STYLES[t.type] || STYLES.info
        return (
          <div key={t.id}
            style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              backdropFilter: 'blur(12px)',
              animation: 'slideIn 0.2s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <p style={{ color: '#fff', fontSize: 13, lineHeight: 1.4, margin: 0 }}>{t.message}</p>
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>,
    document.body
  )
}
