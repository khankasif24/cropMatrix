import { useState, useEffect } from 'react'
import { recommendCrop, predictYield, getMarketPrices, getStates, getWeather, getYieldDistricts } from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import AzureTranslate from '../components/AzureTranslate'

const SEASONS = [
  { value: 'kharif', label: 'Kharif (Jun–Oct)' },
  { value: 'rabi', label: 'Rabi (Nov–Mar)' },
  { value: 'zaid', label: 'Zaid (Mar–Jun)' },
]

const SOIL_TYPES = [
  'Alluvial soil', 'Black soil', 'Clayey soils', 'Desert soil',
  'Laterite soil', 'Red soil', 'Sandy loam', 'Sandy soil',
]

const DEFAULT_PARAMS = {
  nitrogen: 90, phosphorus: 42, potassium: 43,
  temperature: 25, humidity: 70, ph: 6.5, rainfall: 200,
  season: 'kharif', state: '', soil_type: '',
}

// Estimated cost per hectare — same as ProfitPlanner
const COST_PER_HA = {
  'rice': 45000, 'wheat': 35000, 'maize': 30000, 'cotton(lint)': 55000,
  'sugarcane': 80000, 'soyabean': 28000, 'potato': 90000, 'groundnut': 40000,
  'gram': 25000, 'bajra': 22000, 'jowar': 22000, 'barley': 28000,
  'onion': 75000, 'banana': 120000, 'coconut': 60000, 'urad': 25000,
  'moong(green gram)': 25000, 'rapeseed & mustard': 30000, 'sunflower': 32000,
  'sesamum': 28000, 'chickpea': 25000, 'lentil': 26000, 'mustard': 30000,
  'cotton': 55000, 'arhar/tur': 28000, 'jute': 35000,
}

function getCostPerHa(crop) {
  const lower = (crop || '').toLowerCase()
  for (const [key, cost] of Object.entries(COST_PER_HA)) {
    if (lower.includes(key) || key.includes(lower)) return cost
  }
  return 35000
}

function formatINR(amount) {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${Math.round(amount)}`
}

function computeRisks(params) {
  const risks = []
  if (params.ph < 5.5) risks.push({ label: 'Acidic Soil Stress', icon: 'warning', color: 'text-tertiary' })
  if (params.ph > 8.5) risks.push({ label: 'Alkaline Soil Stress', icon: 'warning', color: 'text-tertiary' })
  if (params.rainfall < 50) risks.push({ label: 'Drought Risk', icon: 'water_drop', color: 'text-error' })
  if (params.rainfall > 400) risks.push({ label: 'Flood Risk', icon: 'flood', color: 'text-error' })
  if (params.temperature > 42) risks.push({ label: 'Heat Stress', icon: 'thermostat', color: 'text-error' })
  if (params.temperature < 5) risks.push({ label: 'Frost Risk', icon: 'ac_unit', color: 'text-blue-600' })
  if (params.humidity > 90) risks.push({ label: 'Fungal Risk', icon: 'bug_report', color: 'text-tertiary' })
  if (params.nitrogen < 20) risks.push({ label: 'Low Nitrogen', icon: 'science', color: 'text-tertiary' })
  if (risks.length === 0) risks.push({ label: 'No Major Risks', icon: 'check_circle', color: 'text-primary' })
  return risks
}

const AREA_HA = 5 // Default area for profit calculation

export default function WhatIfSimulator() {
  const { state: detectedState, city: detectedCity, latitude, longitude } = useLocation()
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [baseline, setBaseline] = useState({ ...DEFAULT_PARAMS })
  const [whatif, setWhatif] = useState({ ...DEFAULT_PARAMS })
  const [baselineResult, setBaselineResult] = useState(null)
  const [whatifResult, setWhatifResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [weatherFilled, setWeatherFilled] = useState(false)
  const [profitData, setProfitData] = useState(null)
  const [profitLoading, setProfitLoading] = useState(false)

  useEffect(() => {
    getStates().then(d => setStates(d.states || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (detectedState) {
      setBaseline(p => ({ ...p, state: detectedState }))
      setWhatif(p => ({ ...p, state: detectedState }))
    }
  }, [detectedState])

  // Load districts when state changes
  useEffect(() => {
    const state = baseline.state
    if (!state) { setDistricts([]); return }
    getYieldDistricts(state).then(d => {
      const dists = d.districts || []
      setDistricts(dists)
      if (dists.length > 0) {
        const cityUpper = (detectedCity || '').toUpperCase()
        const match = dists.find(x => x.toUpperCase() === cityUpper)
        setSelectedDistrict(match || dists[0])
      }
    }).catch(() => setDistricts([]))
  }, [baseline.state, detectedCity])

  // Auto-fill weather
  useEffect(() => {
    if (weatherFilled) return
    const lat = latitude || 25.3176
    const lon = longitude || 82.9739
    getWeather(lat, lon).then(data => {
      const c = data?.current
      if (c?.temperature) {
        const weatherParams = {
          temperature: Math.round(c.temperature * 10) / 10,
          humidity: c.humidity || 70,
          rainfall: c.rain_1h ? Math.round(c.rain_1h * 24 * 30) : 200,
        }
        setBaseline(p => ({ ...p, ...weatherParams }))
        setWhatif(p => ({ ...p, ...weatherParams }))
        setWeatherFilled(true)
      }
    }).catch(() => {})
  }, [latitude, longitude])

  const updateBaseline = (key, value) => setBaseline(p => ({ ...p, [key]: value }))
  const updateWhatif = (key, value) => setWhatif(p => ({ ...p, [key]: value }))

  // Compute profit for a crop
  async function computeProfit(crop, state, district, season) {
    try {
      const [yieldData, priceData] = await Promise.all([
        predictYield({ state, district, crop, season, area_ha: AREA_HA, year: 2026 }),
        getMarketPrices(crop, state, '', '', 90),
      ])
      const yieldPerHa = yieldData.predicted_yield_tonnes_per_ha || 0
      const totalProduction = yieldData.predicted_total_tonnes || 0
      const pricePerQuintal = priceData.latest_price || priceData.average_price || 2000
      const totalQuintals = totalProduction * 10
      const revenue = totalQuintals * pricePerQuintal
      const costPerHa = getCostPerHa(crop)
      const totalCost = costPerHa * AREA_HA
      const profit = revenue - totalCost

      return {
        crop,
        yieldPerHa: yieldPerHa.toFixed(2),
        totalProduction: totalProduction.toFixed(2),
        pricePerQuintal: Math.round(pricePerQuintal),
        revenue: Math.round(revenue),
        totalCost: Math.round(totalCost),
        costPerHa,
        profit: Math.round(profit),
        margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0',
      }
    } catch {
      return null
    }
  }

  const handleSimulate = async () => {
    setLoading(true)
    setError(null)
    setProfitData(null)

    try {
      // 1. Get crop recommendations
      const [bRes, wRes] = await Promise.all([
        recommendCrop({
          nitrogen: baseline.nitrogen, phosphorus: baseline.phosphorus, potassium: baseline.potassium,
          temperature: baseline.temperature, humidity: baseline.humidity, ph: baseline.ph, rainfall: baseline.rainfall,
          season: baseline.season, state: baseline.state || null, soil_type: baseline.soil_type || null,
        }),
        recommendCrop({
          nitrogen: whatif.nitrogen, phosphorus: whatif.phosphorus, potassium: whatif.potassium,
          temperature: whatif.temperature, humidity: whatif.humidity, ph: whatif.ph, rainfall: whatif.rainfall,
          season: whatif.season, state: whatif.state || null, soil_type: whatif.soil_type || null,
        }),
      ])
      setBaselineResult(bRes)
      setWhatifResult(wRes)

      // 2. Compute profit impact (if district is available)
      const bCrop = bRes.recommendations?.[0]?.crop
      const wCrop = wRes.recommendations?.[0]?.crop
      const state = baseline.state
      const district = selectedDistrict

      if (bCrop && wCrop && state && district) {
        setProfitLoading(true)
        const [bProfit, wProfit] = await Promise.all([
          computeProfit(bCrop, state, district, baseline.season === 'zaid' ? 'Whole Year' : baseline.season.charAt(0).toUpperCase() + baseline.season.slice(1)),
          computeProfit(wCrop, whatif.state || state, district, whatif.season === 'zaid' ? 'Whole Year' : whatif.season.charAt(0).toUpperCase() + whatif.season.slice(1)),
        ])
        if (bProfit && wProfit) {
          setProfitData({
            baseline: bProfit,
            whatif: wProfit,
            delta: wProfit.profit - bProfit.profit,
            deltaPct: bProfit.profit !== 0 ? (((wProfit.profit - bProfit.profit) / Math.abs(bProfit.profit)) * 100).toFixed(1) : '∞',
          })
        }
        setProfitLoading(false)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyBaselineToWhatif = () => setWhatif({ ...baseline })

  const inputClass = "w-full bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"

  function ParamInputs({ values, onChange, label }) {
    return (
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-4 bg-surface-container-low flex items-center justify-between">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary text-lg">
              {label === 'Current' ? 'fact_check' : 'edit_note'}
            </span>
            <AzureTranslate text={`${label} Conditions`} />
          </h3>
          {label === 'What-If' && (
            <button onClick={copyBaselineToWhatif}
              className="smart-chip bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-xs">content_copy</span>
              <AzureTranslate text="Copy Current" />
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {/* Location */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="State" /></label>
              <select className={inputClass} value={values.state}
                onChange={e => { onChange('state', e.target.value); if (label === 'Current') setWhatif(p => ({ ...p, state: e.target.value })) }}>
                <option value="">Select State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Season" /></label>
              <select className={inputClass} value={values.season}
                onChange={e => onChange('season', e.target.value)}>
                {SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* NPK */}
          <div>
            <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Soil NPK" /></label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { key: 'nitrogen', label: 'N' },
                { key: 'phosphorus', label: 'P' },
                { key: 'potassium', label: 'K' },
              ].map(f => (
                <div key={f.key} className="bg-surface-container-low rounded-xl p-2 text-center">
                  <span className="block text-[9px] font-bold text-on-surface-variant/40 uppercase">{f.label}</span>
                  <input type="number" value={values[f.key]} step="1"
                    onChange={e => onChange(f.key, parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-center font-headline font-bold text-primary p-0 focus:ring-0 focus:outline-none text-base" />
                </div>
              ))}
            </div>
          </div>

          {/* Weather + pH */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'temperature', label: 'Temp (°C)', step: 0.5 },
              { key: 'humidity', label: 'Humidity (%)', step: 1 },
              { key: 'rainfall', label: 'Rainfall (mm)', step: 5 },
              { key: 'ph', label: 'Soil pH', step: 0.1 },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
                  <AzureTranslate text={f.label} />
                </label>
                <input type="number" className={inputClass} value={values[f.key]} step={f.step}
                  onChange={e => onChange(f.key, parseFloat(e.target.value) || 0)} />
              </div>
            ))}
          </div>

          {/* Soil Type */}
          <div className="space-y-1">
            <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Soil Type" /></label>
            <select className={inputClass} value={values.soil_type}
              onChange={e => onChange('soil_type', e.target.value)}>
              <option value="">Any</option>
              {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Risk indicators */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {computeRisks(values).map((r, i) => (
              <span key={i} className={`smart-chip bg-surface-container-low ${r.color}`}>
                <span className="material-symbols-outlined text-xs">{r.icon}</span>
                <AzureTranslate text={r.label} />
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function ResultCard({ title, result, isWhatif }) {
    if (!result) return null
    const topRec = result.recommendations?.[0]
    if (!topRec) return null

    return (
      <div className={`bg-white rounded-2xl editorial-shadow overflow-hidden animate-fade-in-up ${isWhatif ? 'ring-2 ring-tertiary/20' : 'ring-2 ring-primary/20'}`}>
        <div className={`p-4 ${isWhatif ? 'bg-gradient-to-r from-tertiary/10 to-tertiary-fixed/20' : 'bg-gradient-to-r from-primary/10 to-secondary-container/30'}`}>
          <h4 className="font-headline font-bold text-sm flex items-center gap-2">
            <span className={`material-symbols-outlined text-lg ${isWhatif ? 'text-tertiary' : 'text-primary'}`}>
              {isWhatif ? 'compare_arrows' : 'verified'}
            </span>
            <AzureTranslate text={title} />
          </h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-headline font-extrabold text-xl capitalize"><AzureTranslate text={topRec.crop} /></div>
              <div className="font-label text-xs text-on-surface-variant/60"><AzureTranslate text="Top Recommendation" /></div>
            </div>
            <div className="text-right">
              <div className={`font-headline font-extrabold text-2xl ${isWhatif ? 'text-tertiary' : 'text-primary'}`}>{topRec.confidence_pct}%</div>
              <div className="font-label text-[10px] text-on-surface-variant/50"><AzureTranslate text="confidence" /></div>
            </div>
          </div>
          <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${isWhatif ? 'bg-gradient-to-r from-tertiary to-tertiary-container' : 'bg-gradient-to-r from-primary to-primary-container'}`}
              style={{ width: `${topRec.confidence_pct}%` }} />
          </div>

          {/* Other recommendations */}
          {result.recommendations?.slice(1, 3).map((rec, i) => (
            <div key={i} className="flex justify-between items-center bg-surface-container-low rounded-xl px-3 py-2">
              <span className="font-body text-sm font-semibold capitalize"><AzureTranslate text={rec.crop} /></span>
              <span className="font-label text-xs font-bold text-on-surface-variant">{rec.confidence_pct}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Compute comparison deltas
  const baseTop = baselineResult?.recommendations?.[0]
  const whatifTop = whatifResult?.recommendations?.[0]
  const confidenceDelta = baseTop && whatifTop ? (whatifTop.confidence_pct - baseTop.confidence_pct).toFixed(1) : null
  const cropChanged = baseTop && whatifTop && baseTop.crop !== whatifTop.crop

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
          <AzureTranslate text="What-If Simulator" /> 🔬
        </h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1">
          <AzureTranslate text="Test how changing soil, weather, or season affects crop recommendations & profit" />
        </p>
      </div>

      {/* District selector for profit analysis */}
      <div className="bg-white rounded-2xl editorial-shadow p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 space-y-1 w-full sm:w-auto">
          <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="District (for profit analysis)" /></label>
          <select className={inputClass} value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
            {districts.length > 0 ? (
              districts.map(d => <option key={d} value={d}>{d}</option>)
            ) : (
              <option value="">Select state first</option>
            )}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant/50">
          <span className="material-symbols-outlined text-sm text-primary">info</span>
          <AzureTranslate text={`Profit is calculated for ${AREA_HA} hectares using AI yield + market prices`} />
        </div>
      </div>

      {/* Input Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParamInputs values={baseline} onChange={updateBaseline} label="Current" />
        <ParamInputs values={whatif} onChange={updateWhatif} label="What-If" />
      </div>

      {/* Simulate Button */}
      <button onClick={handleSimulate} disabled={loading}
        className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
        <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'science'}</span>
        {loading ? <AzureTranslate text="Running Simulation..." /> : <AzureTranslate text="Run Simulation" />}
      </button>

      {error && (
        <div className="bg-error-container/30 text-on-error-container p-4 rounded-2xl flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-error">error</span>
          <AzureTranslate text={error} />
        </div>
      )}

      {/* Comparison Delta Banner */}
      {baseTop && whatifTop && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up ${cropChanged ? 'bg-tertiary-fixed/30' : 'bg-secondary-container/30'}`}>
          <span className="material-symbols-outlined text-2xl">
            {cropChanged ? 'swap_horiz' : 'compare_arrows'}
          </span>
          <div>
            <div className="font-headline font-bold text-sm">
              {cropChanged ? (
                <AzureTranslate text={`Recommendation changed: ${baseTop.crop} → ${whatifTop.crop}`} />
              ) : (
                <AzureTranslate text={`Same recommendation: ${baseTop.crop}`} />
              )}
            </div>
            <div className="font-label text-xs text-on-surface-variant/70 mt-0.5">
              <AzureTranslate text="Confidence" />: {baseTop.confidence_pct}% → {whatifTop.confidence_pct}%
              <span className={`ml-2 font-bold ${parseFloat(confidenceDelta) > 0 ? 'text-primary' : parseFloat(confidenceDelta) < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                ({parseFloat(confidenceDelta) > 0 ? '+' : ''}{confidenceDelta}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 💰 Profit Impact Card */}
      {profitLoading && (
        <div className="bg-white rounded-2xl editorial-shadow p-6 flex items-center justify-center gap-3 animate-fade-in">
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <span className="font-label text-sm text-on-surface-variant"><AzureTranslate text="Calculating profit impact..." /></span>
        </div>
      )}

      {profitData && !profitLoading && (
        <div className="bg-white rounded-2xl editorial-shadow overflow-hidden animate-fade-in-up">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-tertiary/5 flex items-center justify-between">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span>
              <AzureTranslate text="Profit Impact Analysis" /> 💰
            </h3>
            <span className="smart-chip bg-surface-container text-on-surface-variant">{AREA_HA} ha</span>
          </div>

          <div className="p-5">
            {/* Side-by-side profit comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Baseline */}
              <div className="rounded-2xl p-4 bg-primary/5 ring-1 ring-primary/20">
                <div className="font-label text-[10px] font-bold text-primary uppercase tracking-widest mb-2"><AzureTranslate text="Current" /></div>
                <div className="font-headline font-extrabold text-lg capitalize text-on-surface">{profitData.baseline.crop}</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Yield" /></span>
                    <span className="font-bold">{profitData.baseline.yieldPerHa} T/ha</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Price" /></span>
                    <span className="font-bold">₹{profitData.baseline.pricePerQuintal.toLocaleString()}/Q</span>
                  </div>
                  <div className="h-px bg-surface-container-high" />
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Revenue" /></span>
                    <span className="font-bold text-primary">{formatINR(profitData.baseline.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Cost" /></span>
                    <span className="font-bold text-error">{formatINR(profitData.baseline.totalCost)}</span>
                  </div>
                  <div className="h-px bg-surface-container-high" />
                  <div className="flex justify-between text-sm">
                    <span className="font-bold"><AzureTranslate text="Profit" /></span>
                    <span className={`font-headline font-extrabold text-lg ${profitData.baseline.profit >= 0 ? 'text-primary' : 'text-error'}`}>
                      {formatINR(profitData.baseline.profit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* What-If */}
              <div className="rounded-2xl p-4 bg-tertiary/5 ring-1 ring-tertiary/20">
                <div className="font-label text-[10px] font-bold text-tertiary uppercase tracking-widest mb-2"><AzureTranslate text="What-If" /></div>
                <div className="font-headline font-extrabold text-lg capitalize text-on-surface">{profitData.whatif.crop}</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Yield" /></span>
                    <span className="font-bold">{profitData.whatif.yieldPerHa} T/ha</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Price" /></span>
                    <span className="font-bold">₹{profitData.whatif.pricePerQuintal.toLocaleString()}/Q</span>
                  </div>
                  <div className="h-px bg-surface-container-high" />
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Revenue" /></span>
                    <span className="font-bold text-primary">{formatINR(profitData.whatif.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant/60"><AzureTranslate text="Cost" /></span>
                    <span className="font-bold text-error">{formatINR(profitData.whatif.totalCost)}</span>
                  </div>
                  <div className="h-px bg-surface-container-high" />
                  <div className="flex justify-between text-sm">
                    <span className="font-bold"><AzureTranslate text="Profit" /></span>
                    <span className={`font-headline font-extrabold text-lg ${profitData.whatif.profit >= 0 ? 'text-primary' : 'text-error'}`}>
                      {formatINR(profitData.whatif.profit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delta Impact Banner */}
            <div className={`rounded-2xl p-4 text-center ${
              profitData.delta > 0 ? 'bg-gradient-to-r from-primary to-primary-container' :
              profitData.delta < 0 ? 'bg-gradient-to-r from-error to-red-700' :
              'bg-surface-container-low'
            } ${profitData.delta !== 0 ? 'text-white' : 'text-on-surface'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="material-symbols-outlined text-xl">
                  {profitData.delta > 0 ? 'trending_up' : profitData.delta < 0 ? 'trending_down' : 'drag_handle'}
                </span>
                <span className="font-headline font-extrabold text-2xl sm:text-3xl">
                  {profitData.delta > 0 ? '+' : ''}{formatINR(profitData.delta)}
                </span>
              </div>
              <p className="font-label text-sm opacity-80">
                {profitData.delta > 0 ? (
                  <AzureTranslate text={`More profit with What-If conditions (+${profitData.deltaPct}%)`} />
                ) : profitData.delta < 0 ? (
                  <AzureTranslate text={`Less profit with What-If conditions (${profitData.deltaPct}%)`} />
                ) : (
                  <AzureTranslate text="No difference in profit between scenarios" />
                )}
              </p>
            </div>

            {/* Visual bar comparison */}
            <div className="mt-4 space-y-2">
              {[
                { label: 'Current', value: profitData.baseline.profit, color: 'from-primary to-primary-container' },
                { label: 'What-If', value: profitData.whatif.profit, color: 'from-tertiary to-tertiary-container' },
              ].map(bar => {
                const maxVal = Math.max(Math.abs(profitData.baseline.profit), Math.abs(profitData.whatif.profit), 1)
                const pct = (Math.abs(bar.value) / maxVal) * 100
                return (
                  <div key={bar.label} className="flex items-center gap-3">
                    <span className="font-label text-xs w-16 text-on-surface-variant/60"><AzureTranslate text={bar.label} /></span>
                    <div className="flex-1 h-6 bg-surface-container-low rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700 flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-white text-[10px] font-bold">{formatINR(bar.value)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-5 pb-4 font-label text-[10px] text-on-surface-variant/40">
            <AzureTranslate text="* Estimates based on AI yield predictions and recent market prices. Actual results may vary." />
          </div>
        </div>
      )}

      {/* No district hint */}
      {baseTop && whatifTop && !profitData && !profitLoading && !selectedDistrict && (
        <div className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-primary">info</span>
          <p className="font-label text-sm text-on-surface-variant/70">
            <AzureTranslate text="Select a district above to see profit impact analysis for both scenarios." />
          </p>
        </div>
      )}

      {/* Result Cards */}
      {(baselineResult || whatifResult) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResultCard title="Current Result" result={baselineResult} isWhatif={false} />
          <ResultCard title="What-If Result" result={whatifResult} isWhatif={true} />
        </div>
      )}

      {/* Empty State */}
      {!baselineResult && !whatifResult && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-4xl">science</span>
          </div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
            <AzureTranslate text="Ready to Simulate" />
          </h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm">
            <AzureTranslate text="Adjust the current and what-if parameters above, then click Run Simulation to compare outcomes side by side — including profit impact." />
          </p>
        </div>
      )}
    </div>
  )
}
