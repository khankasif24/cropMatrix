import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useLocation } from '../contexts/LocationContext'
import { recommendFertilizer, getOrganicRemedies, getFertilizerMetadata } from '../services/api'
import AzureTranslate from '../components/AzureTranslate'

export default function Fertilizer() {
  const { t } = useLanguage()
  const { state: detectedState } = useLocation()
  const [activeTab, setActiveTab] = useState('market')
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState(null)

  const [mForm, setMForm] = useState({
    temperature: 25, moisture: 50, rainfall: 100, ph: 6.5,
    nitrogen: 50, phosphorous: 50, potassium: 50, carbon: 1.0,
    soil: 'Loamy', crop: 'Rice',
  })
  const [mResult, setMResult] = useState(null)

  const [oForm, setOForm] = useState({ nitrogen: 40, phosphorous: 25, potassium: 25 })
  const [oResult, setOResult] = useState(null)

  useEffect(() => { getFertilizerMetadata().then(setMetadata).catch(() => {}) }, [])

  async function handleMarketSubmit(e) {
    e.preventDefault(); setLoading(true)
    try { const data = await recommendFertilizer(mForm); setMResult(data) }
    catch (err) { console.error(err) }
    setLoading(false)
  }

  async function handleOrganicSubmit(e) {
    e.preventDefault(); setLoading(true)
    try { const data = await getOrganicRemedies(oForm); setOResult(data) }
    catch (err) { console.error(err) }
    setLoading(false)
  }

  const soilTypes = metadata?.soil_types || ['Loamy', 'Sandy', 'Clayey', 'Red', 'Black']
  const cropTypes = metadata?.crop_types || ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane']
  const inputClass = "w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight"><AzureTranslate text="Fertilizer & Remedies" /> 🧪</h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1"><AzureTranslate text="ML-driven fertilizer recommendations and organic alternatives" /></p>
      </div>

      {/* Tabs */}
      <div className="bg-surface-container-low rounded-2xl p-1.5 flex gap-1">
        <button onClick={() => setActiveTab('market')}
          className={`flex-1 py-3 px-4 rounded-xl font-label text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'market' ? 'bg-white text-on-surface editorial-shadow' : 'text-on-surface-variant hover:text-on-surface'
          }`}>
          <span className="material-symbols-outlined text-sm">factory</span> <AzureTranslate text="Market Fertilizer" />
        </button>
        <button onClick={() => setActiveTab('organic')}
          className={`flex-1 py-3 px-4 rounded-xl font-label text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'organic' ? 'bg-white text-on-surface editorial-shadow' : 'text-on-surface-variant hover:text-on-surface'
          }`}>
          <span className="material-symbols-outlined text-sm">eco</span> <AzureTranslate text="Organic Remedies" />
        </button>
      </div>

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
            <div className="p-5 md:p-6 bg-surface-container-low">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">science</span> <AzureTranslate text="Soil & Crop Parameters" />
              </h3>
            </div>
            <div className="p-5 md:p-6">
              <form onSubmit={handleMarketSubmit} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { key: 'soil', label: 'Soil Type', type: 'select', options: soilTypes },
                    { key: 'crop', label: 'Crop', type: 'select', options: cropTypes },
                    { key: 'nitrogen', label: 'N', type: 'number' },
                    { key: 'phosphorous', label: 'P', type: 'number' },
                    { key: 'potassium', label: 'K', type: 'number' },
                    { key: 'ph', label: 'pH', type: 'number', step: '0.1' },
                    { key: 'temperature', label: 'Temp (°C)', type: 'number' },
                    { key: 'moisture', label: 'Moisture (%)', type: 'number' },
                    { key: 'rainfall', label: 'Rainfall (mm)', type: 'number' },
                    { key: 'carbon', label: 'Carbon', type: 'number', step: '0.1' },
                  ].map(f => (
                    <div key={f.key} className="space-y-1.5">
                      <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text={f.label} /></label>
                      {f.type === 'select' ? (
                        <select className={inputClass} value={mForm[f.key]} onChange={e => setMForm({...mForm, [f.key]: e.target.value})}>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className={inputClass} type="number" step={f.step || '1'} value={mForm[f.key]}
                          onChange={e => setMForm({...mForm, [f.key]: +e.target.value})} />
                      )}
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
                  <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'factory'}</span>
                  {loading ? <AzureTranslate text="Analyzing..." /> : <AzureTranslate text="Get Fertilizer Recommendation" />}
                </button>
              </form>
            </div>
          </div>

          {mResult?.recommendations && (
            <div className="space-y-3 animate-fade-in-up stagger-children">
              <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">recommend</span> <AzureTranslate text="Recommended Fertilizers" />
              </h3>
              {mResult.recommendations.map((rec, i) => (
                <div key={i} className={`bg-white rounded-2xl editorial-shadow p-4 md:p-5 flex items-center gap-4 ${
                  i === 0 ? 'ring-2 ring-primary/20' : ''
                }`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    i === 0 ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
                  }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-headline font-bold text-on-surface"><AzureTranslate text={rec.fertilizer} /></div>
                    {rec.reason && <div className="font-label text-xs text-on-surface-variant/60 mt-0.5"><AzureTranslate text={rec.reason} /></div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-2.5 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${rec.confidence}%` }} />
                    </div>
                    <span className="font-headline font-bold text-sm w-10 text-right">{rec.confidence}%</span>
                  </div>
                </div>
              ))}
              <div className="font-label text-xs text-on-surface-variant/40 px-1">
                <AzureTranslate text="Model" />: {mResult.model_used || 'N/A'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Organic Tab */}
      {activeTab === 'organic' && (
        <div className="space-y-6">
          <div className="bg-secondary-container/15 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary mt-0.5">eco</span>
            <p className="font-label text-sm text-secondary"><AzureTranslate text="Enter your soil NPK values to find organic alternatives for nutrient deficiencies." /></p>
          </div>

          <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
            <div className="p-5 md:p-6">
              <form onSubmit={handleOrganicSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'nitrogen', label: 'N', threshold: 50 },
                    { key: 'phosphorous', label: 'P', threshold: 30 },
                    { key: 'potassium', label: 'K', threshold: 30 },
                  ].map(f => (
                    <div key={f.key} className="bg-surface-container-low rounded-2xl p-4 text-center">
                      <span className="block font-label text-[10px] font-bold text-on-surface-variant/40 uppercase mb-2">{f.label}</span>
                      <input className="w-full bg-transparent border-none text-center font-headline font-bold text-primary text-2xl p-0 focus:ring-0 focus:outline-none" type="number"
                        value={oForm[f.key]} onChange={e => setOForm({...oForm, [f.key]: +e.target.value})} />
                      <span className="block font-label text-[10px] text-on-surface-variant/30 mt-1"><AzureTranslate text="Low if" /> &lt; {f.threshold}</span>
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-secondary text-white font-bold rounded-2xl shadow-lg shadow-secondary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60">
                  <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'eco'}</span>
                  {loading ? <AzureTranslate text="Checking..." /> : <AzureTranslate text="Find Organic Remedies" />}
                </button>
              </form>
            </div>
          </div>

          {oResult && (
            <div className="animate-fade-in-up space-y-4">
              {oResult.all_nutrients_ok ? (
                <div className="bg-secondary-container/20 rounded-2xl p-5 flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-2xl">check_circle</span>
                  <span className="font-headline font-bold text-secondary"><AzureTranslate text={oResult.message} /></span>
                </div>
              ) : (
                <>
                  <div className="bg-tertiary-fixed/30 rounded-2xl p-4 font-headline font-bold text-sm text-tertiary"><AzureTranslate text={oResult.message} /></div>
                  {oResult.deficiencies.map((def, di) => (
                    <div key={di} className="space-y-3">
                      <div className="flex items-center justify-between pb-2">
                        <span className="font-headline font-bold text-on-surface"><AzureTranslate text={def.nutrient} /></span>
                        <span className="smart-chip bg-error/10 text-error"><AzureTranslate text={`${def.status} (Current: ${def.current_value})`} /></span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {def.recommendations.map((rem, ri) => (
                          <div key={ri} className="bg-white rounded-2xl editorial-shadow p-4 space-y-2">
                            <div className="font-headline font-bold text-on-surface"><AzureTranslate text={rem.name} /></div>
                            <div className="flex gap-2">
                              <span className="smart-chip bg-secondary-container text-on-secondary-container"><AzureTranslate text={rem.type} /></span>
                              <span className="smart-chip bg-tertiary-fixed text-on-tertiary-fixed-variant">{rem.cost_indicator}</span>
                            </div>
                            <div className="font-label text-xs text-on-surface-variant/60 leading-relaxed"><AzureTranslate text={rem.why} /></div>
                            {rem.prep_or_mode && (
                              <div className="bg-surface-container-low rounded-xl p-3 font-label text-xs text-on-surface-variant">
                                <span className="font-bold text-on-surface"><AzureTranslate text="How to use" />:</span> <AzureTranslate text={rem.prep_or_mode} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
