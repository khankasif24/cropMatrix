import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Import all locale files
import en from '../locales/en.json'
import hi from '../locales/hi.json'
import ta from '../locales/ta.json'
import te from '../locales/te.json'
import kn from '../locales/kn.json'
import ml from '../locales/ml.json'
import bn from '../locales/bn.json'
import or_lang from '../locales/or.json'
import mr from '../locales/mr.json'
import gu from '../locales/gu.json'
import pa from '../locales/pa.json'

const translations = { en, hi, ta, te, kn, ml, bn, or: or_lang, mr, gu, pa }

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Pan-India', speechCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North', speechCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'South', speechCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'South', speechCode: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'South', speechCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'South', speechCode: 'ml-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'East', speechCode: 'bn-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'East', speechCode: 'or-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'West', speechCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'West', speechCode: 'gu-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Central', speechCode: 'pa-IN' },
]

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('smartcrop-lang') || 'en'
    } catch {
      return 'en'
    }
  })

  const setLanguage = useCallback((code) => {
    setLanguageState(code)
    try {
      localStorage.setItem('smartcrop-lang', code)
    } catch {}
  }, [])

  // Translation function: returns translated string or falls back to English, then key
  const t = useCallback((key) => {
    const langData = translations[language] || translations.en
    return langData[key] || translations.en[key] || key
  }, [language])

  // Get current language's speech recognition code
  const speechCode = LANGUAGES.find(l => l.code === language)?.speechCode || 'en-IN'

  // Get current language info
  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, speechCode, currentLanguage, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageContext
