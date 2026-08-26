import { useState, useEffect } from 'react'
import { predictYield, getYieldDistricts } from '../services/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useLocation } from '../contexts/LocationContext'
import AzureTranslate from '../components/AzureTranslate'

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Laddakh', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

const CROPS = [
  'Arecanut', 'Arhar/Tur', 'Bajra', 'Banana', 'Barley', 'Bean', 'Bhindi',
  'Bottle Gourd', 'Brinjal', 'Cabbage', 'Cashewnut', 'Castor seed', 'Coconut',
  'Coffee', 'Coriander', 'Cotton(lint)', 'Cowpea(Lobia)', 'Drum Stick', 'Garlic',
  'Ginger', 'Gram', 'Groundnut', 'Guar seed', 'Horse-gram', 'Jowar', 'Jute',
  'Khesari', 'Lemon', 'Linseed', 'Maize', 'Mango', 'Masoor', 'Mesta',
  'Moong(Green Gram)', 'Moth', 'Niger seed', 'Onion', 'Other Kharif pulses',
  'Peas & beans (Pulses)', 'Potato', 'Ragi', 'Rapeseed & Mustard', 'Rice',
  'Safflower', 'Sesamum', 'Small millets', 'Soyabean', 'Sugarcane', 'Sunflower',
  'Sweet potato', 'Tapioca', 'Tobacco', 'Turmeric', 'Urad', 'Wheat'
]

const SEASONS = ['Kharif', 'Rabi', 'Whole Year', 'Summer', 'Autumn', 'Winter']

export default function YieldPredict() {
  const { city: detectedCity, state: detectedState } = useLocation()
  const [form, setForm] = useState({ state: 'Punjab', district: 'LUDHIANA', crop: 'Wheat', season: 'Rabi', area_ha: 5.0, year: 2026 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { t } = useLanguage()
  const [districts, setDistricts] = useState([])
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [usingIpDistrict, setUsingIpDistrict] = useState(false)

  useEffect(() => {
    if (detectedState) {
      const matchedState = STATES.find(s => s.toLowerCase() === detectedState.toLowerCase())
      if (matchedState) setForm(f => ({ ...f, state: matchedState }))
    }
  }, [detectedState])

  useEffect(() => {
    if (!form.state) return
    setDistrictsLoading(true); setUsingIpDistrict(false)
    getYieldDistricts(form.state)
      .then(data => {
        const distList = data.districts || []
        setDistricts(distList)
        if (distList.length > 0) {
          const cityUpper = (detectedCity || '').toUpperCase()
          const match = distList.find(d => d.toUpperCase() === cityUpper)
          setForm(f => ({ ...f, district: match || distList[0] }))
          setUsingIpDistrict(!!match)
        } else {
          setForm(f => ({ ...f, district: detectedCity ? detectedCity.toUpperCase() : '' }))
          setUsingIpDistrict(true)
        }
      })
      .catch(() => { setDistricts([]); setForm(f => ({ ...f, district: detectedCity ? detectedCity.toUpperCase() : '' })); setUsingIpDistrict(true) })
      .finally(() => setDistrictsLoading(false))
  }, [form.state, detectedCity])

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(null)
    try { const data = await predictYield(form); setResult(data) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputClass = "w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight"><AzureTranslate text="Yield Intelligence" /> 🎯</h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="XGBoost-powered harvest prediction engine" /></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
          <div className="p-5 md:p-6 bg-surface-container-low flex items-center justify-between">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">query_stats</span>
              <AzureTranslate text="Input Parameters" />
            </h3>
            <span className="smart-chip bg-secondary-container text-on-secondary-container">XGBoost</span>
          </div>
          <div className="p-5 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="State" /></label>
                  <select className={inputClass}
                    value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))}>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider flex items-center gap-1">
                    <AzureTranslate text="District" />
                    {usingIpDistrict && <span className="smart-chip bg-primary/10 text-primary !text-[8px] !px-1.5 !py-0"><AzureTranslate text="Detected" /></span>}
                  </label>
                  {districtsLoading ? (
                    <div className="bg-surface-container-highest rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-on-surface-variant">
                      <div className="spinner-sm" /> <AzureTranslate text="Loading..." />
                    </div>
                  ) : districts.length > 0 ? (
                    <select className={inputClass}
                      value={form.district} onChange={e => { setForm(f => ({...f, district: e.target.value})); setUsingIpDistrict(false) }}>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <div className="bg-secondary-container/20 rounded-xl px-4 py-3 flex items-center gap-2 font-medium text-sm text-primary">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {form.district || detectedCity?.toUpperCase() || 'Detecting...'}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Crop" /></label>
                  <select className={inputClass}
                    value={form.crop} onChange={e => setForm(f => ({...f, crop: e.target.value}))}>
                    {CROPS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Season" /></label>
                  <select className={inputClass}
                    value={form.season} onChange={e => setForm(f => ({...f, season: e.target.value}))}>
                    {SEASONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Area (Hectares)" /></label>
                  <input type="number" className={inputClass}
                    value={form.area_ha} onChange={e => setForm(f => ({...f, area_ha: +e.target.value}))} step="0.1" min="0.1" />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Year" /></label>
                  <input type="number" className={inputClass}
                    value={form.year} onChange={e => setForm(f => ({...f, year: +e.target.value}))} min="2000" max="2030" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
                <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'query_stats'}</span>
                {loading ? <AzureTranslate text="Predicting..." /> : <AzureTranslate text="Predict Yield" />}
              </button>
            </form>
          </div>
        </div>

        {/* ── Results ── */}
        <div>
          {error && (
            <div className="bg-error-container/30 text-on-error-container p-4 rounded-2xl flex items-center gap-2 mb-4 animate-fade-in">
              <span className="material-symbols-outlined text-error">error</span> <AzureTranslate text={error} />
            </div>
          )}

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-4xl">agriculture</span>
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-2"><AzureTranslate text="Ready to Predict" /></h3>
              <p className="text-sm text-on-surface-variant/60 max-w-sm"><AzureTranslate text="Select your state, district, crop, and season to get an AI-powered yield prediction." /></p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="spinner" /><span className="font-label text-sm text-on-surface-variant"><AzureTranslate text="Running yield model..." /></span>
            </div>
          )}

          {result && !loading && (
            <div className="bg-white rounded-2xl editorial-shadow overflow-hidden animate-fade-in-up">
              <div className="p-6 bg-gradient-to-r from-primary to-primary-container text-white">
                <h3 className="font-headline font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">analytics</span> <AzureTranslate text="Yield Prediction Result" />
                </h3>
                <p className="font-label text-sm text-white/60 mt-1"><AzureTranslate text="XGBoost Regression Model" /></p>
              </div>
              <div className="p-6 md:p-8 text-center space-y-6">
                <div>
                  <div className="font-headline font-extrabold text-6xl text-primary">{result.predicted_yield_tonnes_per_ha}</div>
                  <div className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="Tonnes per Hectare" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary-container/20 rounded-2xl p-5 text-center">
                    <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Total Production" /></div>
                    <div className="font-headline font-extrabold text-2xl text-primary">{result.predicted_total_tonnes} T</div>
                    <div className="font-label text-xs text-on-surface-variant/60 mt-1"><AzureTranslate text={`for ${result.area_ha} hectares`} /></div>
                  </div>
                  <div className="bg-tertiary-fixed/20 rounded-2xl p-5 text-center">
                    <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Crop & Season" /></div>
                    <div className="font-headline font-bold text-lg text-on-surface"><AzureTranslate text={result.crop} /></div>
                    <div className="font-label text-xs text-on-surface-variant/60 mt-1"><AzureTranslate text={result.season} /> · {result.state}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
