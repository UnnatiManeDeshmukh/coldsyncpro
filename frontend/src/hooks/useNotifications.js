import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../utils/api'

/**
 * useNotifications — real-time notifications via SSE + fallback polling
 * Uses the shared api instance (with JWT auto-refresh interceptor)
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [connected, setConnected]         = useState(false)
  const esRef = useRef(null)
  const token = localStorage.getItem('access')

  // Initial load
  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get('/api/notifications/')
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unread_count || 0)
    } catch { /* silent */ }
  }, [token])

  // SSE connection
  useEffect(() => {
    if (!token) return

    let retryCount = 0
    const MAX_RETRIES = 5

    const connect = () => {
      if (esRef.current) esRef.current.close()

      const url = `/api/notifications/stream/?token=${encodeURIComponent(token)}`
      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => { setConnected(true); retryCount = 0 }

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.error) return

          if (data.type === 'unread_count') {
            setUnreadCount(data.count)
            return
          }

          setNotifications(prev => {
            const exists = prev.some(n => n.id === data.id)
            if (exists) return prev
            return [data, ...prev].slice(0, 50)
          })
          setUnreadCount(prev => prev + 1)

          if (Notification.permission === 'granted') {
            new Notification(`ColdSync Pro — ${data.title}`, {
              body: data.message,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: `notif-${data.id}`,
            })
          }

          // Play sound for new order / payment notifications
          if (['new_order_admin', 'order_placed', 'payment_received'].includes(data.type)) {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.setValueAtTime(880, ctx.currentTime)
              osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
              osc.start(ctx.currentTime)
              osc.stop(ctx.currentTime + 0.4)
            } catch { /* silent fail if audio not supported */ }
          }
        } catch { /* ignore parse errors */ }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        // Token expire zhalas tar retry nako — max retries check karo
        retryCount++
        if (retryCount <= MAX_RETRIES) {
          const delay = Math.min(10000 * retryCount, 60000) // exponential backoff, max 60s
          setTimeout(connect, delay)
        }
        // MAX_RETRIES nantarcha polling fallback vaparil (refresh already running)
      }
    }

    refresh().then(connect)

    return () => {
      if (esRef.current) esRef.current.close()
    }
  }, [token, refresh])

  const markRead = useCallback(async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read/`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/read-all/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }, [])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return { notifications, unreadCount, connected, markRead, markAllRead, refresh, requestPermission }
}
