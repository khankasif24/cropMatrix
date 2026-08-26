import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { getCommunityMessages, sendCommunityMessage, getOnlineCount } from '../services/api'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import AzureTranslate from '../components/AzureTranslate'

function hashColor(str) {
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 45%)`
}

export default function Community() {
  const { t, speechCode } = useLanguage()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)

  const { isListening, isProcessing, isSupported, toggleListening, stopListening } = useSpeechRecognition({
    lang: speechCode || 'en-IN',
    onResult: (text) => setInput(text),
  })

  const loadMessages = useCallback(async () => {
    try { const data = await getCommunityMessages(50); setMessages(data.messages || []) }
    catch (err) { console.error('Failed to load messages:', err) }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(loadMessages, 5000)
    getOnlineCount().then(d => setOnlineCount(d.online_count || 1)).catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [loadMessages])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || sending) return
    if (isListening) stopListening()
    setSending(true); setInput('')
    try { await sendCommunityMessage(msg); await loadMessages() }
    catch (err) { console.error('Send failed:', err); setInput(msg) }
    setSending(false)
  }

  function groupByDate(msgs) {
    const groups = {}
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex flex-col max-w-3xl mx-auto animate-fade-in" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight flex items-center gap-2">
              <AzureTranslate text="Community Hub" /> 💬
            </h1>
            <p className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="Connect with other farmers, share tips, and ask questions" /></p>
          </div>
          <span className="smart-chip bg-primary/10 text-primary">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-soft" />
            {onlineCount} {t('community_online') || 'online'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2 hide-scrollbar bg-surface-container-low/30 -mx-4 md:-mx-8 px-4 md:px-8 rounded-2xl">
        {loading && <div className="text-center py-12 font-label text-sm text-on-surface-variant">{t('community_loading') || 'Loading messages...'}</div>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-3xl">forum</span>
            </div>
            <h3 className="font-headline font-bold text-on-surface">{t('community_empty') || 'No messages yet'}</h3>
            <p className="font-label text-sm text-on-surface-variant/60">{t('community_emptyDesc') || 'Start the conversation!'}</p>
          </div>
        )}
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-surface-container-high/50" />
              <span className="font-label text-[10px] font-bold text-on-surface-variant/30 uppercase">{date}</span>
              <div className="flex-1 h-px bg-surface-container-high/50" />
            </div>
            {msgs.map(msg => {
              const isMe = user && msg.user_id === user.id
              return (
                <div key={msg.id} className={`flex gap-2.5 mb-2 max-w-[85%] md:max-w-[75%] animate-fade-in ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: hashColor(msg.user_name) }}>
                      {(msg.user_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`px-4 py-2.5 max-w-full break-words ${
                    isMe
                      ? 'bg-primary text-white rounded-2xl rounded-tr-md'
                      : 'bg-white text-on-surface rounded-2xl rounded-tl-md editorial-shadow'
                  }`}>
                    {!isMe && <div className="text-[10px] font-bold mb-0.5" style={{ color: hashColor(msg.user_name) }}>{msg.user_name}</div>}
                    <div className="text-sm leading-relaxed">{msg.message}</div>
                    <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-white/50' : 'text-on-surface-variant/30'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-3">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <button type="button" disabled={!user || isProcessing} onClick={toggleListening}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isListening ? 'bg-error text-white shadow-lg shadow-error/30 animate-pulse-soft'
              : isProcessing ? 'bg-tertiary text-white animate-pulse-soft'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            } disabled:opacity-40`}>
            <span className="material-symbols-outlined text-lg">{isProcessing ? 'hourglass_empty' : isListening ? 'stop' : 'mic'}</span>
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} maxLength={2000} disabled={!user}
            placeholder={isProcessing ? 'Processing speech...' : (t('community_placeholder') || 'Type a message...')}
            className="flex-1 bg-surface-container-low rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-on-surface-variant/30" />
          <button type="submit" disabled={!input.trim() || sending || !user}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-all disabled:opacity-40 shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-lg">{sending ? 'hourglass_empty' : 'send'}</span>
          </button>
        </form>
        {(isListening || isProcessing) && (
          <div className="flex items-center justify-center gap-2 py-1.5 font-label text-xs text-error font-bold">
            <span className="w-2 h-2 bg-error rounded-full animate-pulse-soft" />
            {isProcessing ? <AzureTranslate text="Processing speech..." /> : <AzureTranslate text="Recording... Speak now" />}
          </div>
        )}
        {!user && (
          <div className="text-center py-2 font-label text-xs text-on-surface-variant/40">{t('community_loginRequired') || 'Please login to send messages'}</div>
        )}
      </div>
    </div>
  )
}
