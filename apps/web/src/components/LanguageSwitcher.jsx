import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageSwitcher({ variant = 'default' }) {
  const { language, setLanguage, t, LANGUAGES } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]
  const regions = ['Pan-India', 'North', 'South', 'East', 'West', 'Central']

  const isSidebar = variant === 'sidebar'

  return (
    <div className="relative" ref={ref}>
      <button
        className={`
          flex items-center gap-2 rounded-full transition-all text-sm font-medium
          ${isSidebar
            ? 'bg-white/60 hover:bg-white/80 text-on-surface-variant px-3 py-2 w-full justify-between'
            : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant px-3 py-2'
          }
        `}
        onClick={() => setOpen(!open)}
        title={t('lang_selectLanguage')}
        aria-label={t('lang_selectLanguage')}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">language</span>
          <span className="font-label text-xs font-semibold">{currentLang?.nativeName || language.toUpperCase()}</span>
        </div>
        <span className={`material-symbols-outlined text-sm text-on-surface-variant/50 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className={`
          absolute z-[1000] bg-white rounded-2xl shadow-2xl editorial-shadow-lg
          min-w-[260px] max-h-[380px] overflow-y-auto animate-fade-in-scale hide-scrollbar
          ${isSidebar ? 'left-0 bottom-full mb-2' : 'right-0 top-full mt-2'}
        `}>
          <div className="p-3 font-headline font-bold text-sm text-on-surface border-b border-surface-container-high/50">
            {t('lang_selectLanguage')}
          </div>
          <div className="p-2">
            {regions.map(region => {
              const langs = LANGUAGES.filter(l => l.region === region)
              if (langs.length === 0) return null
              return (
                <div key={region}>
                  <div className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 px-3 pt-3 pb-1">
                    {region}
                  </div>
                  {langs.map(lang => (
                    <button
                      key={lang.code}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors
                        ${language === lang.code
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'hover:bg-surface-container-low text-on-surface'
                        }
                      `}
                      onClick={() => { setLanguage(lang.code); setOpen(false) }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-headline text-sm">{lang.nativeName}</span>
                        <span className="font-label text-[11px] text-on-surface-variant/60">{lang.name}</span>
                      </div>
                      {language === lang.code && (
                        <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
