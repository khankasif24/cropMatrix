import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { getProfile, saveProfile, deleteProfile } from '../services/api'
import AzureTranslate from '../components/AzureTranslate'

export default function Profile() {
  const { t } = useLanguage()
  const { user, logout, updateUserName } = useAuth()
  const { state: detectedState, latitude, longitude } = useLocation()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    name: '', phone: '', email: '', language: 'en',
    district: '', state: '', role: 'farmer', farm_size: '', crops_grown: '',
  })
  const [notifications, setNotifications] = useState({
    push: true, sms: true, whatsapp: false, weather: true, sowing: true, market: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ text: '', type: '' })

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      if (data.profile) {
        const p = data.profile
        setProfile({
          name: p.name || user?.name || '', phone: p.phone || user?.phone || '',
          email: p.email || user?.email || '', language: p.language || 'en',
          district: p.district || '', state: p.state || detectedState || '',
          role: p.role || 'farmer', farm_size: p.farm_size || '',
          crops_grown: Array.isArray(p.crops_grown) ? p.crops_grown.join(', ') : '',
        })
        if (p.notifications && typeof p.notifications === 'object') setNotifications(prev => ({ ...prev, ...p.notifications }))
      } else {
        setProfile(prev => ({ ...prev, name: user?.name || '', phone: user?.phone || '' }))
      }
    } catch (err) { setProfile(prev => ({ ...prev, name: user?.name || '', phone: user?.phone || '' })) }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg({ text: '', type: '' })
    try {
      await saveProfile({
        name: profile.name, email: profile.email, district: profile.district,
        state: profile.state, language: profile.language, role: profile.role,
        farm_size: profile.farm_size ? parseFloat(profile.farm_size) : null,
        crops_grown: profile.crops_grown ? profile.crops_grown.split(',').map(c => c.trim()).filter(Boolean) : [],
        notifications, latitude: latitude || null, longitude: longitude || null,
      })
      updateUserName(profile.name)
      setSaveMsg({ text: 'Profile saved successfully!', type: 'success' })
      setTimeout(() => setSaveMsg({ text: '', type: '' }), 3000)
    } catch (err) { setSaveMsg({ text: err.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    try { await deleteProfile(); logout(); navigate('/login') }
    catch (err) { setSaveMsg({ text: err.message, type: 'error' }) }
  }

  const inputClass = "w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in gap-4">
        <div className="spinner" /><span className="font-label text-sm text-on-surface-variant">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight"><AzureTranslate text="Account Intelligence" /> 👤</h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="Manage your profile, preferences, and notification settings" /></p>
      </div>

      {/* Save feedback */}
      {saveMsg.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-2 animate-fade-in ${
          saveMsg.type === 'success' ? 'bg-secondary-container/20 text-secondary' : 'bg-error-container/30 text-error'
        }`}>
          <span className="material-symbols-outlined text-sm">{saveMsg.type === 'success' ? 'check_circle' : 'error'}</span>
          {saveMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
          <div className="p-5 md:p-6 bg-surface-container-low flex items-center justify-between">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span> {t('profile_title')}
            </h3>
            <span className="smart-chip bg-primary/10 text-primary capitalize">{profile.role}</span>
          </div>
          <div className="p-5 md:p-6 space-y-5">
            {/* Avatar */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-3xl text-white mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">agriculture</span>
              </div>
              <h3 className="font-headline font-bold text-on-surface">{profile.name || 'Your Name'}</h3>
              <p className="font-label text-sm text-on-surface-variant/60">{profile.phone}</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{t('profile_fullName')}</label>
              <input className={inputClass} value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="Enter your name" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{t('profile_phone')}</label>
              <input className={`${inputClass} opacity-60`} value={profile.phone} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Email" /></label>
              <input className={inputClass} type="email" value={profile.email} onChange={e => setProfile(p => ({...p, email: e.target.value}))} placeholder="your@email.com" />
              <span className="font-label text-[10px] text-on-surface-variant/30"><AzureTranslate text="Required for email weather alerts via Brevo" /></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{t('profile_district')}</label>
                <input className={inputClass} value={profile.district} onChange={e => setProfile(p => ({...p, district: e.target.value}))} placeholder="e.g. Varanasi" />
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{t('profile_state')}</label>
                <input className={inputClass} value={profile.state} onChange={e => setProfile(p => ({...p, state: e.target.value}))} placeholder="e.g. Uttar Pradesh" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Farm Size (acres)" /></label>
                <input className={inputClass} type="number" step="0.1" min="0" value={profile.farm_size} onChange={e => setProfile(p => ({...p, farm_size: e.target.value}))} placeholder="e.g. 5.5" />
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Role" /></label>
                <select className={inputClass} value={profile.role} onChange={e => setProfile(p => ({...p, role: e.target.value}))}>
                  <option value="farmer">Farmer</option>
                  <option value="advisor">Agricultural Advisor</option>
                  <option value="researcher">Researcher</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Crops Grown" /></label>
              <input className={inputClass} value={profile.crops_grown} onChange={e => setProfile(p => ({...p, crops_grown: e.target.value}))} placeholder="e.g. Wheat, Rice, Sugarcane" />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">{t('profile_language')}</label>
              <select className={inputClass} value={profile.language} onChange={e => setProfile(p => ({...p, language: e.target.value}))}>
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
              <span className="material-symbols-outlined">{saving ? 'hourglass_empty' : 'save'}</span>
              {saving ? 'Saving...' : t('profile_save')}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
            <div className="p-5 bg-surface-container-low">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">notifications</span> {t('profile_notifications')}
              </h3>
            </div>
            <div className="p-5 space-y-0">
              <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/30 tracking-widest mb-2"><AzureTranslate text="Channels" /></div>
              {[
                { key: 'push', icon: 'smartphone', label: 'Push Notifications' },
                { key: 'sms', icon: 'sms', label: 'SMS Notifications' },
                { key: 'whatsapp', icon: 'chat', label: 'WhatsApp Messages' },
              ].map(ch => (
                <div key={ch.key} className="flex items-center justify-between py-3 border-b border-surface-container-high/40 last:border-0">
                  <span className="font-label text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant/50">{ch.icon}</span> {ch.label}
                  </span>
                  <div onClick={() => setNotifications(n => ({...n, [ch.key]: !n[ch.key]}))}
                    className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${notifications[ch.key] ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${notifications[ch.key] ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </div>
              ))}

              <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/30 tracking-widest mt-4 mb-2"><AzureTranslate text="Alert Types" /></div>
              {[
                { key: 'weather', icon: 'cloud', label: 'Weather Alerts' },
                { key: 'sowing', icon: 'eco', label: 'Sowing Reminders' },
                { key: 'market', icon: 'trending_up', label: 'Market Price Alerts' },
              ].map(ch => (
                <div key={ch.key} className="flex items-center justify-between py-3 border-b border-surface-container-high/40 last:border-0">
                  <span className="font-label text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant/50">{ch.icon}</span> {ch.label}
                  </span>
                  <div onClick={() => setNotifications(n => ({...n, [ch.key]: !n[ch.key]}))}
                    className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${notifications[ch.key] ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${notifications[ch.key] ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
            <div className="p-5 bg-surface-container-low flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">shutter_speed</span> <AzureTranslate text="Disease Detection" />
              </h3>
              <span className="smart-chip bg-primary/10 text-primary">AI</span>
            </div>
            <div className="p-5 space-y-3">
              <p className="font-label text-sm text-on-surface-variant/60"><AzureTranslate text="Upload a leaf image to detect diseases. Our AI supports:" /></p>
              <div className="flex flex-wrap gap-2">
                {['Potato', 'Corn', 'Rice', 'Sugarcane'].map(c => (
                  <span key={c} className="smart-chip bg-tertiary-fixed text-on-tertiary-fixed-variant">{c}</span>
                ))}
              </div>
              <button onClick={() => navigate('/disease')}
                className="w-full py-3 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md shadow-primary/15">
                <span className="material-symbols-outlined">shutter_speed</span> <AzureTranslate text="Go to Disease Detection" />
              </button>
            </div>
          </div>

          {/* About & Delete */}
          <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
            <div className="p-5 bg-surface-container-low">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">info</span> {t('profile_about')}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="font-label text-sm text-on-surface-variant/60 space-y-2">
                <p><strong>{t('profile_aboutTitle')}</strong> — SIH 2025 (Problem ID: SIH25010)</p>
                <p>{t('profile_aboutDesc')}</p>
                <p>{t('profile_version')}</p>
                <p>{t('profile_poweredBy')}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-4 py-2.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-colors">
                  {t('profile_export')}
                </button>
                <button onClick={handleDelete}
                  className="px-4 py-2.5 rounded-full bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">delete</span> <AzureTranslate text="Delete Account" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
