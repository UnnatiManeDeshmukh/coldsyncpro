import { useState, useEffect } from 'react'
import { Bell, BellRing, Check, CheckCheck, X } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

const TYPE_ICON = {
  order_placed:     '🛒',
  order_confirmed:  '✅',
  order_shipped:    '🚚',
  order_delivered:  '🎉',
  payment_reminder: '⚠️',
  payment_received: '💰',
  low_stock:        '📦',
  new_order_admin:  '🔔',
  general:          '📢',
}

const TYPE_COLOR = {
  order_placed:     '#1E6FFF',
  order_confirmed:  '#00C864',
  order_shipped:    '#FF8300',
  order_delivered:  '#00C864',
  payment_reminder: '#F5B400',
  payment_received: '#00C864',
  low_stock:        '#ff6b6b',
  new_order_admin:  '#7C3AED',
  general:          '#74b9ff',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, connected, markRead, markAllRead, requestPermission } = useNotifications()

  // Request browser notification permission on mount
  useEffect(() => { requestPermission() }, [requestPermission])

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
        style={{ color: unreadCount > 0 ? '#F5B400' : 'rgba(255,255,255,0.5)' }}
      >
        {unreadCount > 0
          ? <BellRing size={18} className="animate-pulse" />
          : <Bell size={18} />
        }
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: '#C00000', fontSize: '10px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* SSE connection dot */}
        <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: connected ? '#00C864' : '#ff6b6b' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: '#0d1b35', border: '1px solid rgba(255,255,255,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-white/50" />
                <span className="text-white font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ background: '#C00000' }}>{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <CheckCheck size={12} /> All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors p-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell size={32} className="mx-auto mb-2 text-white/10" />
                  <p className="text-white/20 text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map(n => {
                  const color = TYPE_COLOR[n.type] || '#74b9ff'
                  const icon  = TYPE_ICON[n.type]  || '📢'
                  return (
                    <div key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className="flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)' }}>

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                        style={{ background: `${color}20` }}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white text-xs font-semibold leading-tight"
                            style={{ color: n.is_read ? 'rgba(255,255,255,0.7)' : '#fff' }}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                              style={{ background: color }} />
                          )}
                        </div>
                        <p className="text-white/40 text-xs mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-white/20 text-xs mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-white/20 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: connected ? '#00C864' : '#ff6b6b' }} />
                {connected ? 'Live' : 'Reconnecting...'}
              </span>
              <span className="text-white/20 text-xs">{notifications.length} total</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
