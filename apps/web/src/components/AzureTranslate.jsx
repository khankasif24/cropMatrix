import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

// ── Language code mapping for MyMemory API ──────────────────────────
const LANG_MAP = {
  en: 'en', hi: 'hi', ta: 'ta', te: 'te', bn: 'bn', mr: 'mr',
  gu: 'gu', kn: 'kn', ml: 'ml', pa: 'pa', or: 'or', ur: 'ur',
  as: 'as', ne: 'ne', sa: 'sa',
};

// ── Global translation cache (persists across component remounts) ──
// Structure: { "hi": { "Hello world": "नमस्ते दुनिया" } }
const translationCache = {};

// ── Batching system ────────────────────────────────────────────────
// Collects all translation requests within a short window, then sends
// them as a single API call. Prevents 50+ individual requests per page.
let batchQueue = {};   // { lang: { text: [resolve1, resolve2, ...] } }
let batchTimer = null;
const BATCH_DELAY_MS = 150;

function getFromCache(lang, text) {
  // Memory cache
  if (translationCache[lang]?.[text]) return translationCache[lang][text];
  // Session storage cache
  const key = `translate_${lang}_${text.substring(0, 50)}`;
  const stored = sessionStorage.getItem(key);
  if (stored) {
    if (!translationCache[lang]) translationCache[lang] = {};
    translationCache[lang][text] = stored;
    return stored;
  }
  return null;
}

function saveToCache(lang, text, translation) {
  // Don't cache if the "translation" is identical to English source — it means translation failed
  if (translation === text) return;
  if (!translationCache[lang]) translationCache[lang] = {};
  translationCache[lang][text] = translation;
  const key = `translate_${lang}_${text.substring(0, 50)}`;
  try { sessionStorage.setItem(key, translation); } catch {}
}

// ── Free fallback: MyMemory Translation API ─────────────────────────
// Used when the Azure backend translate endpoint fails/returns no results.
// Free tier: 5000 chars/day (shared), no API key needed.
async function translateViaMyMemory(texts, targetLang) {
  const langCode = LANG_MAP[targetLang] || targetLang;
  const results = [];
  // MyMemory is per-text, so we batch in parallel with a small concurrency limit
  const CONCURRENCY = 5;
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const chunk = texts.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (text) => {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          const translated = data.responseData.translatedText;
          // MyMemory sometimes returns the same text in uppercase — skip those
          if (translated.toUpperCase() === text.toUpperCase()) return text;
          return translated;
        }
        return text;
      } catch {
        return text;
      }
    });
    results.push(...(await Promise.all(promises)));
  }
  return results;
}

function flushBatch() {
  const currentQueue = batchQueue;
  batchQueue = {};
  batchTimer = null;

  for (const [lang, textMap] of Object.entries(currentQueue)) {
    const texts = Object.keys(textMap);
    if (texts.length === 0) continue;

    // Split into chunks of 25
    const CHUNK_SIZE = 25;
    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      const chunk = texts.slice(i, i + CHUNK_SIZE);

      // Try Azure backend first, fall back to MyMemory
      api.translateDynamicText(chunk, lang)
        .then(res => {
          if (res?.translations && res.translations.length === chunk.length) {
            // Check if Azure actually translated (returns different text)
            const actuallyTranslated = res.translations.some((t, idx) => t && t !== chunk[idx]);
            if (actuallyTranslated) {
              // Azure backend worked — use its translations
              chunk.forEach((text, idx) => {
                const translated = res.translations[idx] || text;
                saveToCache(lang, text, translated);
                if (currentQueue[lang]?.[text]) {
                  currentQueue[lang][text].forEach(resolve => resolve(translated));
                }
              });
              return; // done
            }
          }
          // Azure returned unchanged text or empty — use fallback
          throw new Error('Azure returned untranslated text');
        })
        .catch(() => {
          // Fallback to MyMemory free API
          translateViaMyMemory(chunk, lang)
            .then(translations => {
              chunk.forEach((text, idx) => {
                const translated = translations[idx] || text;
                saveToCache(lang, text, translated);
                if (currentQueue[lang]?.[text]) {
                  currentQueue[lang][text].forEach(resolve => resolve(translated));
                }
              });
            })
            .catch(() => {
              // Final fallback — return original text
              chunk.forEach(text => {
                if (currentQueue[lang]?.[text]) {
                  currentQueue[lang][text].forEach(resolve => resolve(text));
                }
              });
            });
        });
    }
  }
}

function requestTranslation(text, lang) {
  return new Promise(resolve => {
    // Check cache first
    const cached = getFromCache(lang, text);
    if (cached) { resolve(cached); return; }

    // Add to batch queue
    if (!batchQueue[lang]) batchQueue[lang] = {};
    if (!batchQueue[lang][text]) batchQueue[lang][text] = [];
    batchQueue[lang][text].push(resolve);

    // Schedule flush
    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS);
    }
  });
}

// ── React Hook: useTranslatedText ──────────────────────────────────
// Use this for cases where you need the translated string directly,
// e.g. placeholder="...", title="...", alt="...", <option> text, etc.
export function useTranslatedText(text) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(() => {
    if (!text || language === 'en') return text;
    return getFromCache(language, text) || text;
  });

  useEffect(() => {
    if (!text || language === 'en') {
      setTranslated(text);
      return;
    }
    let cancelled = false;
    requestTranslation(text, language).then(result => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [text, language]);

  return translated;
}

// ── React Component: <AzureTranslate text="..." /> ────────────────
export function AzureTranslate({ text, className = "" }) {
  const translated = useTranslatedText(text);
  return <span className={className}>{translated}</span>;
}

export default AzureTranslate;
