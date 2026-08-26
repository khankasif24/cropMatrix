import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { submitFeedback, getFeedbackHistory } from '../services/api'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import AzureTranslate from '../components/AzureTranslate'

const FEEDBACK_AREAS = [
  { value: 'crop_recommendation', icon: 'eco', label: 'Crop Recommendation' },
  { value: 'yield_prediction', icon: 'agriculture', label: 'Yield Prediction' },
  { value: 'market_prices', icon: 'trending_up', label: 'Market Prices' },
  { value: 'disease_detection', icon: 'shutter_speed', label: 'Disease Detection' },
  { value: 'pest_alerts', icon: 'pest_control', label: 'Pest Alerts' },
  { value: 'fertilizer', icon: 'science', label: 'Fertilizer & Remedies' },
  { value: 'fields', icon: 'map', label: 'My Fields' },
  { value: 'planner', icon: 'calendar_month', label: 'Rotation Planner' },
  { value: 'community', icon: 'forum', label: 'Community Chat' },
  { value: 'chatbot', icon: 'smart_toy', label: 'AI Chatbot' },
  { value: 'profile', icon: 'person', label: 'Profile & Account' },
  { value: 'general', icon: 'edit_note', label: 'General / Other' },
]

export default function Feedback() {
  const { t, language, speechCode } = useLanguage()
  const { user } = useAuth()
  const [area, setArea] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const textareaRef = useRef(null)

  const { isListening, isProcessing, isSupported, toggleListening, stopListening } = useSpeechRecognition({
    lang: speechCode || 'en-IN',
    onResult: (text) => setMessage(text),
  })

  useEffect(() => { loadHistory() }, [])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try { const data = await getFeedbackHistory(10); setHistory(data.feedback || []) }
    catch (err) { console.error('Failed to load feedback history:', err) }
    setHistoryLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!area) { setError('Please select an area'); return }
    if (!message.trim()) { setError('Please write your feedback'); return }
    if (isListening) stopListening()
    setSending(true); setError(null); setSuccess(false)
    try {
      await submitFeedback({ area, message: message.trim() })
      setSuccess(true); setMessage(''); setArea(''); await loadHistory()
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) { setError(err.message || 'Failed to submit feedback') }
    setSending(false)
  }

  const selectedArea = FEEDBACK_AREAS.find(a => a.value === area)

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight"><AzureTranslate text="Platform Feedback" /> 💭</h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="Help us improve Fasal.AI with your suggestions" /></p>
      </div>

      {/* Feedback Form */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 md:p-6 bg-gradient-to-r from-secondary to-secondary-container text-white">
          <h3 className="font-headline font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined">rate_review</span> <AzureTranslate text="Submit Feedback" />
          </h3>
          <p className="font-label text-sm text-white/70 mt-1"><AzureTranslate text="Your input shapes the future of this platform" /></p>
        </div>
        <div className="p-5 md:p-6 space-y-5">
          {success && (
            <div className="bg-secondary-container/20 text-secondary p-4 rounded-2xl flex items-center gap-2 animate-fade-in-up">
              <span className="material-symbols-outlined">check_circle</span> <AzureTranslate text="Thank you! Your feedback has been submitted successfully." />
            </div>
          )}
          {error && (
            <div className="bg-error-container/30 text-error p-4 rounded-2xl flex items-center gap-2">
              <span className="material-symbols-outlined">error</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Area Selection */}
            <div className="space-y-2">
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50"><AzureTranslate text="Which area is your feedback about?" /> *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {FEEDBACK_AREAS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => { setArea(opt.value); setError(null) }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                      area === opt.value
                        ? 'bg-primary/5 ring-2 ring-primary/30 text-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                    <span className="truncate"><AzureTranslate text={opt.label} /></span>
                  </button>
                ))}
              </div>
              {selectedArea && (
                <div className="bg-secondary-container/15 text-secondary rounded-xl px-3 py-2 font-label text-xs animate-fade-in flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <AzureTranslate text="Selected" />: <strong><AzureTranslate text={selectedArea.label} /></strong>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50"><AzureTranslate text="Your Feedback" /> *</label>
              <div className="relative">
                <textarea ref={textareaRef} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Describe the issue or suggestion in detail..."
                  rows={5} maxLength={2000}
                  className="w-full bg-surface-container-highest rounded-2xl px-4 py-3 pr-14 text-sm font-medium resize-y min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-on-surface-variant/30" />
                <button type="button" disabled={isProcessing} onClick={toggleListening}
                  className={`absolute right-2 top-2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isListening ? 'bg-error text-white animate-pulse-soft'
                    : isProcessing ? 'bg-tertiary text-white animate-pulse-soft'
                    : 'bg-surface-container text-on-surface-variant/50 hover:bg-surface-container-high'
                  } disabled:opacity-50`}>
                  <span className="material-symbols-outlined text-sm">{isProcessing ? 'hourglass_empty' : isListening ? 'stop' : 'mic'}</span>
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label text-[10px] text-on-surface-variant/30">{message.length}/2000 characters</span>
                {(isListening || isProcessing) && (
                  <span className="flex items-center gap-1 font-label text-[10px] text-error font-bold">
                    <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse-soft" />
                    {isProcessing ? 'Processing...' : 'Recording...'}
                  </span>
                )}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={sending || !user}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
              {sending ? <><div className="spinner-sm !border-white/30 !border-t-white" /> <AzureTranslate text="Submitting..." /></>
                : <><span className="material-symbols-outlined">send</span> <AzureTranslate text="Submit Feedback" /></>}
            </button>
            {!user && <div className="text-center font-label text-xs text-on-surface-variant/40"><AzureTranslate text="Please login to submit feedback" /></div>}
          </form>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 bg-surface-container-low flex items-center justify-between">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">history</span> <AzureTranslate text="Your Recent Feedback" />
          </h3>
          <span className="smart-chip bg-secondary-container text-on-secondary-container">{history.length} entries</span>
        </div>
        <div className="p-5">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8"><div className="spinner" /></div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-secondary text-2xl">edit_note</span>
              </div>
              <h3 className="font-headline font-bold text-on-surface mb-1"><AzureTranslate text="No feedback yet" /></h3>
              <p className="font-label text-sm text-on-surface-variant/60"><AzureTranslate text="Submit your first feedback above" /></p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((fb, i) => (
                <div key={fb.id || i} className="p-4 bg-surface-container-low/50 rounded-2xl hover:bg-surface-container-low transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="smart-chip bg-secondary-container text-on-secondary-container">
                      {FEEDBACK_AREAS.find(a => a.value === fb.area)?.label || fb.area}
                    </span>
                    <span className="font-label text-[10px] text-on-surface-variant/30">
                      {new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="font-label text-sm text-on-surface-variant/60 leading-relaxed">{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
