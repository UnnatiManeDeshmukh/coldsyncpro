import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

// Quick reply buttons per language
const QUICK_BY_LANG = {
  en: ['How to order?', 'Our brands', 'Payment info', 'Track order', 'Contact us'],
  hi: ['ऑर्डर कैसे करें?', 'हमारे ब्रांड', 'पेमेंट जानकारी', 'ऑर्डर ट्रैक करें', 'संपर्क'],
  mr: ['ऑर्डर कसा करायचा?', 'आमचे ब्रँड', 'पेमेंट माहिती', 'ऑर्डर ट्रॅक करा', 'संपर्क'],
}

const GREET_BY_LANG = {
  en: "👋 Hi! I'm Shree Ganesh Assistant.\n\nI can help you with orders, products, payments, delivery and ColdSync Pro features. How can I help?",
  hi: "👋 नमस्ते! मैं श्री गणेश असिस्टेंट हूं।\n\nमैं ऑर्डर, प्रोडक्ट, पेमेंट, डिलीवरी और ColdSync Pro से जुड़े सवालों में मदद कर सकता हूं।",
  mr: "👋 नमस्कार! मी श्री गणेश असिस्टंट आहे.\n\nमी ऑर्डर, प्रोडक्ट, पेमेंट, डिलिव्हरी आणि ColdSync Pro बद्दल मदत करू शकतो.",
}

const PLACEHOLDER_BY_LANG = {
  en: 'Ask about orders, products, payment...',
  hi: 'ऑर्डर, प्रोडक्ट, पेमेंट के बारे में पूछें...',
  mr: 'ऑर्डर, प्रोडक्ट, पेमेंट बद्दल विचारा...',
}

const ERROR_BY_LANG = {
  en: "Sorry, I'm having trouble connecting. Please try again.",
  hi: "माफ करें, कनेक्शन में समस्या है। कृपया फिर से प्रयास करें।",
  mr: "माफ करा, कनेक्शन समस्या आहे. कृपया पुन्हा प्रयत्न करा.",
}

export default function ChatbotWidget() {
  const { i18n } = useTranslation()
  const lang = ['en', 'hi', 'mr'].includes(i18n.language?.slice(0, 2))
    ? i18n.language.slice(0, 2)
    : 'en'

  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState([{ role: 'bot', text: GREET_BY_LANG[lang] }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId]           = useState(() => Math.random().toString(36).slice(2))
  const bottomRef             = useRef(null)

  // When language changes globally, reset greeting
  useEffect(() => {
    setMsgs([{ role: 'bot', text: GREET_BY_LANG[lang] }])
  }, [lang])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const r = await axios.post('/api/chatbot/chat/', {
        message: msg,
        session_id: sessionId,
        lang,
      })
      setMsgs(m => [...m, { role: 'bot', text: r.data.reply }])
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: ERROR_BY_LANG[lang] }])
    } finally {
      setLoading(false)
    }
  }

  const formatText = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')

  const quick = QUICK_BY_LANG[lang] || QUICK_BY_LANG.en

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}
        aria-label="Open chatbot"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img
            src="/colddrinkbrands/Cold Drink.jfif"
            alt="Chat"
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          style={{ background: '#0d1b35', maxHeight: '500px' }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
            style={{ background: 'linear-gradient(135deg,#1E6FFF22,#7C3AED22)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}
            >
              <img
                src="/colddrinkbrands/Cold Drink.jfif"
                alt="Assistant"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Shree Ganesh Assistant</p>
              <p className="text-white/40 text-xs">
                {lang === 'mr' ? 'फक्त एजन्सी प्रश्नांसाठी' : lang === 'hi' ? 'केवल एजेंसी प्रश्नों के लिए' : 'Agency queries only'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-3 space-y-3"
            style={{ minHeight: '200px', maxHeight: '300px' }}
          >
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'text-white/90 rounded-bl-sm border border-white/10'
                  }`}
                  style={
                    m.role === 'user'
                      ? { background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }
                      : { background: 'rgba(255,255,255,0.06)' }
                  }
                  dangerouslySetInnerHTML={{ __html: formatText(m.text) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-2xl rounded-bl-sm border border-white/10 text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {quick.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-white/60 text-xs border border-white/15 hover:border-white/30 hover:text-white transition-all whitespace-nowrap disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={PLACEHOLDER_BY_LANG[lang]}
              className="flex-1 px-3 py-2 rounded-xl text-white text-xs focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
