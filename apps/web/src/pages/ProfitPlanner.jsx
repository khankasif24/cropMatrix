import { useState, useEffect } from 'react'
import { predictYield, getMarketPrices, getYieldDistricts, getStates } from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import AzureTranslate from '../components/AzureTranslate'

const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Cotton(lint)', 'Sugarcane', 'Soyabean',
  'Potato', 'Groundnut', 'Gram', 'Bajra', 'Jowar', 'Barley',
  'Onion', 'Banana', 'Coconut', 'Urad', 'Moong(Green Gram)',
  'Rapeseed & Mustard', 'Sunflower', 'Sesamum',
]

const SEASONS = ['Kharif', 'Rabi', 'Whole Year', 'Summer', 'Autumn', 'Winter']

// Estimated cost per hectare in INR — simplified reference
const COST_PER_HA = {
  'rice': 45000, 'wheat': 35000, 'maize': 30000, 'cotton(lint)': 55000,
  'sugarcane': 80000, 'soyabean': 28000, 'potato': 90000, 'groundnut': 40000,
  'gram': 25000, 'bajra': 22000, 'jowar': 22000, 'barley': 28000,
  'onion': 75000, 'banana': 120000, 'coconut': 60000, 'urad': 25000,
  'moong(green gram)': 25000, 'rapeseed & mustard': 30000, 'sunflower': 32000,
  'sesamum': 28000,
}

function getCostPerHa(crop) {
  return COST_PER_HA[crop.toLowerCase()] || 35000
}

function formatINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${Math.round(amount)}`
}

export default function ProfitPlanner() {
  const { state: detectedState, city: detectedCity } = useLocation()
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [form, setForm] = useState({
    crop: 'Wheat', state: '', district: '', season: 'Rabi', area_ha: 5, year: 2026,
  })
  const [result, setResult] = useState(null)
  const [comparison, setComparison] = useState([])
  const [loading, setLoading] = useState(false)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStates().then(d => setStates(d.states || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (detectedState && !form.state) setForm(f => ({ ...f, state: detectedState }))
  }, [detectedState])

  useEffect(() => {
    if (!form.state) { setDistricts([]); return }
    getYieldDistricts(form.state).then(d => {
      const dists = d.districts || []
      setDistricts(dists)
      if (dists.length > 0) {
        const cityUpper = (detectedCity || '').toUpperCase()
        const match = dists.find(x => x.toUpperCase() === cityUpper)
        setForm(f => ({ ...f, district: match || dists[0] }))
      }
    }).catch(() => setDistricts([]))
  }, [form.state, detectedCity])

  async function calculateProfit() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const [yieldData, priceData] = await Promise.all([
        predictYield({
          state: form.state, district: form.district, crop: form.crop,
          season: form.season, area_ha: form.area_ha, year: form.year,
        }),
        getMarketPrices(form.crop, form.state, '', '', 90),
      ])

      const yieldPerHa = yieldData.predicted_yield_tonnes_per_ha || 0
      const totalProduction = yieldData.predicted_total_tonnes || 0
      const pricePerQuintal = priceData.latest_price || priceData.average_price || 2000

      // 1 tonne = 10 quintals
      const totalQuintals = totalProduction * 10
      const revenue = totalQuintals * pricePerQuintal
      const costPerHa = getCostPerHa(form.crop)
      const totalCost = costPerHa * form.area_ha
      const profit = revenue - totalCost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0

      setResult({
        crop: form.crop,
        yieldPerHa: yieldPerHa.toFixed(2),
        totalProduction: totalProduction.toFixed(2),
        totalQuintals: totalQuintals.toFixed(1),
        pricePerQuintal: Math.round(pricePerQuintal),
        priceTrend: priceData.trend || 'stable',
        revenue: Math.round(revenue),
        totalCost: Math.round(totalCost),
        costPerHa,
        profit: Math.round(profit),
        margin: margin.toFixed(1),
        area: form.area_ha,
        state: form.state,
        district: form.district,
        season: form.season,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function compareTopCrops() {
    if (!result) return
    setComparisonLoading(true)
    const otherCrops = ['Rice', 'Wheat', 'Maize', 'Soyabean', 'Gram', 'Groundnut']
      .filter(c => c !== form.crop)
      .slice(0, 3)

    const results = []
    for (const crop of otherCrops) {
      try {
        const [y, p] = await Promise.all([
          predictYield({ state: form.state, district: form.district, crop, season: form.season, area_ha: form.area_ha, year: form.year }),
          getMarketPrices(crop, form.state, '', '', 90),
        ])
        const totalProd = y.predicted_total_tonnes || 0
        const price = p.latest_price || p.average_price || 2000
        const rev = totalProd * 10 * price
        const cost = getCostPerHa(crop) * form.area_ha
        results.push({
          crop, yield: (y.predicted_yield_tonnes_per_ha || 0).toFixed(2),
          price: Math.round(price), revenue: Math.round(rev), cost: Math.round(cost),
          profit: Math.round(rev - cost), margin: rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '0',
        })
      } catch {
        // skip failed crops
      }
    }
    // Add current crop
    results.unshift({
      crop: result.crop, yield: result.yieldPerHa, price: result.pricePerQuintal,
      revenue: result.revenue, cost: result.totalCost, profit: result.profit,
      margin: result.margin, isCurrent: true,
    })
    results.sort((a, b) => b.profit - a.profit)
    setComparison(results)
    setComparisonLoading(false)
  }

  const inputClass = "w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
  const profitPositive = result && result.profit >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
          <AzureTranslate text="Profit Planner" /> 💰
        </h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1">
          <AzureTranslate text="Estimate revenue, costs, and profit for any crop using AI predictions" />
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
          <div className="p-5 bg-surface-container-low flex items-center justify-between">
            <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calculate</span>
              <AzureTranslate text="Plan Parameters" />
            </h3>
            <span className="smart-chip bg-secondary-container text-on-secondary-container"><AzureTranslate text="AI + Market" /></span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Crop" /></label>
                <select className={inputClass} value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Season" /></label>
                <select className={inputClass} value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                  {SEASONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="State" /></label>
                <select className={inputClass} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="District" /></label>
                <select className={inputClass} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}>
                  {districts.length > 0 ? (
                    districts.map(d => <option key={d} value={d}>{d}</option>)
                  ) : (
                    <option value="">Select state first</option>
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Area (Hectares)" /></label>
                <input type="number" className={inputClass} value={form.area_ha} step="0.5" min="0.1"
                  onChange={e => setForm(f => ({ ...f, area_ha: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Year" /></label>
                <input type="number" className={inputClass} value={form.year} min="2020" max="2030"
                  onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || 2026 }))} />
              </div>
            </div>

            <button onClick={calculateProfit} disabled={loading || !form.state || !form.district}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-container transition-all disabled:opacity-60">
              <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'payments'}</span>
              {loading ? <AzureTranslate text="Calculating..." /> : <AzureTranslate text="Calculate Profit" />}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {error && (
            <div className="bg-error-container/30 text-on-error-container p-4 rounded-2xl flex items-center gap-2 mb-4 animate-fade-in">
              <span className="material-symbols-outlined text-error">error</span> <AzureTranslate text={error} />
            </div>
          )}

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-4xl">payments</span>
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-2"><AzureTranslate text="Plan Your Profit" /></h3>
              <p className="text-sm text-on-surface-variant/60 max-w-sm">
                <AzureTranslate text="Select your crop, location, and area to get AI-powered profit estimates using yield predictions and live market prices." />
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="spinner" /><span className="font-label text-sm text-on-surface-variant"><AzureTranslate text="Running profit analysis..." /></span>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Profit Hero Card */}
              <div className={`rounded-2xl overflow-hidden editorial-shadow ${profitPositive ? 'bg-gradient-to-br from-primary to-primary-container' : 'bg-gradient-to-br from-error to-red-700'} text-white`}>
                <div className="p-6 text-center">
                  <div className="font-label text-xs uppercase tracking-widest text-white/60 mb-1"><AzureTranslate text="Estimated Profit" /></div>
                  <div className="font-headline font-extrabold text-5xl md:text-6xl">
                    {profitPositive ? '' : '-'}{formatINR(Math.abs(result.profit))}
                  </div>
                  <div className="mt-2 font-label text-sm text-white/70">
                    <AzureTranslate text={`${result.crop} · ${result.area} ha · ${result.season}`} />
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`smart-chip ${profitPositive ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                      <span className="material-symbols-outlined text-xs">{profitPositive ? 'trending_up' : 'trending_down'}</span>
                      {result.margin}% <AzureTranslate text="margin" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl editorial-shadow p-4 text-center">
                  <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Revenue" /></div>
                  <div className="font-headline font-extrabold text-xl text-primary">{formatINR(result.revenue)}</div>
                  <div className="font-label text-xs text-on-surface-variant/60 mt-0.5">{result.totalQuintals}Q × ₹{result.pricePerQuintal}</div>
                </div>
                <div className="bg-white rounded-2xl editorial-shadow p-4 text-center">
                  <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Total Cost" /></div>
                  <div className="font-headline font-extrabold text-xl text-error">{formatINR(result.totalCost)}</div>
                  <div className="font-label text-xs text-on-surface-variant/60 mt-0.5">₹{result.costPerHa.toLocaleString()}/ha</div>
                </div>
                <div className="bg-white rounded-2xl editorial-shadow p-4 text-center">
                  <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Yield" /></div>
                  <div className="font-headline font-extrabold text-xl text-on-surface">{result.yieldPerHa} <span className="text-sm font-normal">T/ha</span></div>
                  <div className="font-label text-xs text-on-surface-variant/60 mt-0.5">{result.totalProduction}T <AzureTranslate text="total" /></div>
                </div>
                <div className="bg-white rounded-2xl editorial-shadow p-4 text-center">
                  <div className="font-label text-[10px] font-bold uppercase text-on-surface-variant/40 mb-1"><AzureTranslate text="Market Price" /></div>
                  <div className="font-headline font-extrabold text-xl text-on-surface">₹{result.pricePerQuintal.toLocaleString()}</div>
                  <div className="font-label text-xs text-on-surface-variant/60 mt-0.5 flex items-center justify-center gap-1">
                    <span className={`material-symbols-outlined text-xs ${result.priceTrend === 'up' ? 'text-primary' : 'text-error'}`}>
                      {result.priceTrend === 'up' ? 'trending_up' : 'trending_down'}
                    </span>
                    <AzureTranslate text={result.priceTrend} /> <AzureTranslate text="trend" />
                  </div>
                </div>
              </div>

              {/* Compare Button */}
              <button onClick={compareTopCrops} disabled={comparisonLoading}
                className="w-full py-3 bg-surface-container-low text-on-surface font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-surface-container transition-colors disabled:opacity-60">
                <span className="material-symbols-outlined">{comparisonLoading ? 'hourglass_empty' : 'compare'}</span>
                {comparisonLoading ? <AzureTranslate text="Comparing..." /> : <AzureTranslate text="Compare with Other Crops" />}
              </button>

              {/* Comparison Table */}
              {comparison.length > 0 && (
                <div className="bg-white rounded-2xl editorial-shadow overflow-hidden animate-fade-in-up">
                  <div className="p-4 bg-surface-container-low">
                    <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-primary">leaderboard</span>
                      <AzureTranslate text="Crop Profit Comparison" />
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-variant/30 text-on-surface-variant/50 font-label text-[10px] uppercase tracking-wider">
                          <th className="text-left p-3"><AzureTranslate text="Crop" /></th>
                          <th className="text-right p-3"><AzureTranslate text="Yield" /></th>
                          <th className="text-right p-3"><AzureTranslate text="Price" /></th>
                          <th className="text-right p-3"><AzureTranslate text="Profit" /></th>
                          <th className="text-right p-3"><AzureTranslate text="Margin" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.map((c, i) => (
                          <tr key={i} className={`border-b border-surface-variant/10 ${c.isCurrent ? 'bg-primary/5' : ''} ${i === 0 ? 'font-bold' : ''}`}>
                            <td className="p-3 font-headline font-bold flex items-center gap-1.5">
                              {i === 0 && <span className="material-symbols-outlined text-primary text-sm">emoji_events</span>}
                              <AzureTranslate text={c.crop} />
                              {c.isCurrent && <span className="smart-chip bg-primary/10 text-primary !text-[8px] !py-0">current</span>}
                            </td>
                            <td className="p-3 text-right">{c.yield} T/ha</td>
                            <td className="p-3 text-right">₹{c.price.toLocaleString()}</td>
                            <td className={`p-3 text-right font-bold ${c.profit >= 0 ? 'text-primary' : 'text-error'}`}>{formatINR(c.profit)}</td>
                            <td className="p-3 text-right">{c.margin}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Visual Bars */}
                  <div className="p-4 space-y-2">
                    {comparison.map((c, i) => {
                      const maxProfit = Math.max(...comparison.map(x => Math.abs(x.profit)), 1)
                      const pct = Math.abs(c.profit) / maxProfit * 100
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="font-label text-xs w-24 truncate font-semibold"><AzureTranslate text={c.crop} /></span>
                          <div className="flex-1 h-5 bg-surface-container-low rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${c.profit >= 0 ? 'bg-gradient-to-r from-primary to-primary-container' : 'bg-gradient-to-r from-error to-red-400'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`font-label text-xs w-16 text-right font-bold ${c.profit >= 0 ? 'text-primary' : 'text-error'}`}>{formatINR(c.profit)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-surface-container-low rounded-2xl p-4 font-label text-xs text-on-surface-variant/50">
                <strong>⚠️ <AzureTranslate text="Disclaimer" />:</strong>{' '}
                <AzureTranslate text="Profit estimates are based on AI predictions and historical market data. Actual results may vary due to weather, market conditions, and farming practices. Cost estimates are approximations." />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
