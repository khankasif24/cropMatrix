import { useState, useEffect } from 'react'
import { getWeather, getPestAlerts, getMarketPrices, getSeasonInfo, getStates } from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import AzureTranslate from '../components/AzureTranslate'

const SEVERITY = {
  severe: { label: 'Severe', color: 'bg-error text-white', icon: 'emergency', dotColor: 'bg-error' },
  warning: { label: 'Warning', color: 'bg-tertiary text-white', icon: 'warning', dotColor: 'bg-tertiary' },
  info: { label: 'Info', color: 'bg-primary text-white', icon: 'info', dotColor: 'bg-primary' },
}

const ALERT_TYPES = {
  weather: { label: 'Weather', icon: 'thunderstorm', bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
  pest: { label: 'Pest Risk', icon: 'bug_report', bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600' },
  irrigation: { label: 'Irrigation', icon: 'water_drop', bg: 'bg-cyan-50', border: 'border-cyan-200', iconColor: 'text-cyan-600' },
  market: { label: 'Market', icon: 'trending_down', bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
  advisory: { label: 'Advisory', icon: 'lightbulb', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
}

function generateAlerts(weather, pestData, marketData, seasonInfo) {
  const alerts = []
  const now = new Date()

  // ── Weather-based alerts ──
  const current = weather?.current || {}
  const forecast = weather?.forecast || []

  if (current.temperature > 42) {
    alerts.push({
      type: 'weather', severity: 'severe',
      title: `Extreme Heat: ${Math.round(current.temperature)}°C`,
      description: 'Dangerously high temperature detected. Crop wilting and heat stress are likely.',
      action: 'Increase irrigation frequency. Apply shade nets for sensitive crops. Avoid field work during peak hours.',
    })
  } else if (current.temperature > 38) {
    alerts.push({
      type: 'weather', severity: 'warning',
      title: `High Temperature: ${Math.round(current.temperature)}°C`,
      description: 'Elevated temperatures may stress crops, especially during flowering stage.',
      action: 'Monitor soil moisture closely. Consider mulching to retain moisture.',
    })
  }

  if (current.temperature < 4) {
    alerts.push({
      type: 'weather', severity: 'severe',
      title: `Frost Risk: ${Math.round(current.temperature)}°C`,
      description: 'Near-freezing temperatures can damage Rabi crops and young seedlings.',
      action: 'Cover sensitive crops with frost cloth. Irrigate fields in the evening to release warmth overnight.',
    })
  }

  if (current.humidity > 90) {
    alerts.push({
      type: 'pest', severity: 'warning',
      title: `High Humidity: ${current.humidity}% — Fungal Risk`,
      description: 'Persistent high humidity creates ideal conditions for fungal diseases like blight and mildew.',
      action: 'Apply preventive fungicide spray. Ensure proper field drainage. Space plants for airflow.',
    })
  } else if (current.humidity > 85) {
    alerts.push({
      type: 'pest', severity: 'info',
      title: `Elevated Humidity: ${current.humidity}%`,
      description: 'Humidity is above normal. Monitor leaves for signs of fungal infection.',
      action: 'Inspect crops daily for discoloration or spots.',
    })
  }

  // Forecast-based alerts
  const heavyRainDays = forecast.filter(d => d.rainfall_mm > 50)
  if (heavyRainDays.length > 0) {
    const totalRain = heavyRainDays.reduce((s, d) => s + d.rainfall_mm, 0)
    alerts.push({
      type: 'weather', severity: totalRain > 150 ? 'severe' : 'warning',
      title: `Heavy Rainfall Expected: ${Math.round(totalRain)}mm in ${heavyRainDays.length} day(s)`,
      description: `Significant rainfall forecast on ${heavyRainDays.map(d => d.day_name).join(', ')}. Waterlogging risk.`,
      action: 'Ensure drainage channels are clear. Postpone fertilizer application. Harvest ripe produce early.',
    })
  }

  const noRainHot = forecast.filter(d => d.rainfall_mm < 2 && d.temp_max > 35)
  if (noRainHot.length >= 3) {
    alerts.push({
      type: 'irrigation', severity: 'warning',
      title: `Dry Spell Ahead: ${noRainHot.length} hot, dry days forecast`,
      description: 'No rain expected with high temperatures. Soil moisture will deplete rapidly.',
      action: 'Schedule irrigation immediately. Use drip irrigation if available to conserve water.',
    })
  } else if (forecast.length > 0) {
    const avgRain = forecast.reduce((s, d) => s + d.rainfall_mm, 0) / forecast.length
    if (avgRain < 5 && current.temperature > 30) {
      alerts.push({
        type: 'irrigation', severity: 'info',
        title: 'Low Rainfall Forecast — Consider Irrigation',
        description: 'Forecast indicates minimal rainfall in the coming days with warm temperatures.',
        action: 'Plan supplemental irrigation for moisture-sensitive crops.',
      })
    }
  }

  const stormDays = forecast.filter(d => d.wind_speed_max && d.wind_speed_max * 3.6 > 60)
  if (stormDays.length > 0) {
    alerts.push({
      type: 'weather', severity: 'severe',
      title: `Strong Winds Expected: ${Math.round(stormDays[0].wind_speed_max * 3.6)} km/h`,
      description: `High wind speeds forecast on ${stormDays.map(d => d.day_name).join(', ')}. Risk of crop lodging.`,
      action: 'Stake tall crops. Secure greenhouse covers. Avoid spraying pesticides in wind.',
    })
  }

  // ── Pest-based alerts ──
  const pestCrops = pestData?.crops || []
  if (pestCrops.length > 0) {
    const topCropsWithPests = pestCrops.filter(c => c.pest_count > 0).slice(0, 3)
    topCropsWithPests.forEach(crop => {
      const topPest = crop.top_pests?.[0]
      if (topPest) {
        alerts.push({
          type: 'pest', severity: 'info',
          title: `${crop.crop}: ${topPest.pest_name || topPest.name || 'Pest'} risk`,
          description: `${crop.crop} in your region is commonly affected by ${topPest.pest_name || topPest.name || 'pests'} during this season. ${crop.note || ''}`,
          action: topPest.management?.[0] || topPest.control || 'Apply appropriate pest management measures. Consult your local KVK for guidance.',
        })
      }
    })
  }

  // ── Market-based alerts ──
  if (marketData) {
    if (marketData.trend === 'down' && marketData.latest_price > 0) {
      alerts.push({
        type: 'market', severity: 'warning',
        title: `${marketData.commodity || 'Crop'} Prices Declining — ₹${marketData.latest_price}/Quintal`,
        description: `Market prices for ${marketData.commodity || 'your crop'} show a downward trend. Average: ₹${marketData.average_price}/Q.`,
        action: 'Consider storing produce if feasible. Compare prices across nearby mandis before selling.',
      })
    } else if (marketData.trend === 'up' && marketData.latest_price > 0) {
      alerts.push({
        type: 'market', severity: 'info',
        title: `${marketData.commodity || 'Crop'} Prices Rising — ₹${marketData.latest_price}/Quintal`,
        description: `Good news! Prices for ${marketData.commodity || 'your crop'} are trending upward.`,
        action: 'Consider selling current stock at favorable prices. Monitor for peak before prices stabilize.',
      })
    }
  }

  // ── Season advisory ──
  if (seasonInfo) {
    const month = now.getMonth() + 1
    if (seasonInfo.key === 'kharif' && (month === 6 || month === 7)) {
      alerts.push({
        type: 'advisory', severity: 'info',
        title: 'Kharif Sowing Window Open',
        description: 'The monsoon sowing window is active. Ideal time for Rice, Maize, Cotton, and Soybean.',
        action: 'Prepare fields and begin sowing. Use treated seeds for better germination.',
      })
    }
    if (seasonInfo.key === 'rabi' && (month === 10 || month === 11)) {
      alerts.push({
        type: 'advisory', severity: 'info',
        title: 'Rabi Sowing Window Open',
        description: 'Winter crop sowing has begun. Ideal for Wheat, Mustard, Gram, and Peas.',
        action: 'Complete land preparation. Arrange for seeds and DAP/Urea fertilizer.',
      })
    }
  }

  // Sort: severe first, then warning, then info
  const orderMap = { severe: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => (orderMap[a.severity] || 2) - (orderMap[b.severity] || 2))

  return alerts
}

export default function SmartAlerts() {
  const { state: detectedState, latitude, longitude } = useLocation()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedState, setSelectedState] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [states, setStates] = useState([])
  const [filter, setFilter] = useState('all')
  const [seasonInfo, setSeasonInfo] = useState(null)

  useEffect(() => {
    getStates().then(d => setStates(d.states || [])).catch(() => {})
    getSeasonInfo().then(d => {
      setSeasonInfo(d)
      setSelectedSeason(d.key || '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (detectedState && !selectedState) setSelectedState(detectedState)
  }, [detectedState])

  useEffect(() => {
    if (!selectedState && !latitude) return
    fetchAlerts()
  }, [selectedState, selectedSeason, latitude, longitude])

  async function fetchAlerts() {
    setLoading(true)
    setError(null)
    try {
      const lat = latitude || 25.3176
      const lon = longitude || 82.9739
      const state = selectedState || detectedState || ''
      const season = selectedSeason || ''

      const [weatherData, pestData, marketData] = await Promise.all([
        getWeather(lat, lon).catch(() => null),
        state ? getPestAlerts(state, season).catch(() => null) : Promise.resolve(null),
        getMarketPrices('Wheat', state, '', '', 30).catch(() => null),
      ])

      const generated = generateAlerts(weatherData, pestData, marketData, seasonInfo)
      setAlerts(generated)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)
  const alertCounts = {
    all: alerts.length,
    weather: alerts.filter(a => a.type === 'weather').length,
    pest: alerts.filter(a => a.type === 'pest').length,
    irrigation: alerts.filter(a => a.type === 'irrigation').length,
    market: alerts.filter(a => a.type === 'market').length,
    advisory: alerts.filter(a => a.type === 'advisory').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
            <AzureTranslate text="Smart Alerts" /> 🚨
          </h1>
          <p className="font-label text-sm text-on-surface-variant/60 mt-1">
            <AzureTranslate text="Real-time actionable alerts based on weather, pests, and market conditions" />
          </p>
        </div>
        <button onClick={fetchAlerts} disabled={loading}
          className="smart-chip bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">{loading ? 'hourglass_empty' : 'refresh'}</span>
          <AzureTranslate text={loading ? 'Refreshing...' : 'Refresh Alerts'} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl editorial-shadow p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="State" /></label>
            <select className="w-full bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={selectedState} onChange={e => setSelectedState(e.target.value)}>
              <option value="">Auto-detect</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Season" /></label>
            <select className="w-full bg-surface-container-highest rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
              <option value="kharif">Kharif</option>
              <option value="rabi">Rabi</option>
              <option value="zaid">Zaid</option>
            </select>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider"><AzureTranslate text="Location" /></label>
            <div className="flex items-center gap-1.5 bg-surface-container-low rounded-xl px-3 py-2.5 text-sm">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pin_drop</span>
              <span className="font-medium truncate">{selectedState || detectedState || 'Detecting...'}</span>
            </div>
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          {['all', 'weather', 'pest', 'irrigation', 'market', 'advisory'].map(type => (
            <button key={type} onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}>
              {type !== 'all' && (
                <span className="material-symbols-outlined text-xs">{ALERT_TYPES[type]?.icon || 'info'}</span>
              )}
              <AzureTranslate text={type === 'all' ? 'All' : ALERT_TYPES[type]?.label || type} />
              {alertCounts[type] > 0 && (
                <span className={`ml-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                  filter === type ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>{alertCounts[type]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="spinner" />
          <span className="font-label text-sm text-on-surface-variant"><AzureTranslate text="Analyzing conditions..." /></span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-error-container/30 text-on-error-container p-4 rounded-2xl flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-error">error</span>
          <AzureTranslate text={error} />
        </div>
      )}

      {/* Alert Cards */}
      {!loading && filteredAlerts.length > 0 && (
        <div className="space-y-3 stagger-children">
          {filteredAlerts.map((alert, i) => {
            const typeInfo = ALERT_TYPES[alert.type] || ALERT_TYPES.advisory
            const sevInfo = SEVERITY[alert.severity] || SEVERITY.info

            return (
              <div key={i} className={`bg-white rounded-2xl editorial-shadow overflow-hidden border-l-4 ${typeInfo.border} hover:-translate-y-0.5 transition-all duration-200`}>
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`material-symbols-outlined ${typeInfo.iconColor}`}>{typeInfo.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-headline font-bold text-sm text-on-surface">
                          <AzureTranslate text={alert.title} />
                        </h3>
                        <span className={`smart-chip ${sevInfo.color} flex-shrink-0`}>
                          <span className="material-symbols-outlined text-[10px]">{sevInfo.icon}</span>
                          <AzureTranslate text={sevInfo.label} />
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-on-surface-variant/70 mt-1.5 leading-relaxed">
                        <AzureTranslate text={alert.description} />
                      </p>

                      {/* Action */}
                      <div className="mt-3 bg-surface-container-low rounded-xl p-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-sm mt-0.5 flex-shrink-0">task_alt</span>
                        <div>
                          <div className="font-label text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
                            <AzureTranslate text="Recommended Action" />
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            <AzureTranslate text={alert.action} />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAlerts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-4xl">verified_user</span>
          </div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
            <AzureTranslate text="All Clear!" />
          </h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm">
            <AzureTranslate text="No alerts for the selected filters. Your crops appear to be in safe conditions. Keep monitoring regularly." />
          </p>
        </div>
      )}

      {/* Summary Footer */}
      {!loading && alerts.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl p-4 font-label text-xs text-on-surface-variant/50">
          <strong><AzureTranslate text="Alert Summary" />:</strong>{' '}
          {alerts.filter(a => a.severity === 'severe').length} <AzureTranslate text="severe" /> ·{' '}
          {alerts.filter(a => a.severity === 'warning').length} <AzureTranslate text="warnings" /> ·{' '}
          {alerts.filter(a => a.severity === 'info').length} <AzureTranslate text="advisories" /> |{' '}
          <strong><AzureTranslate text="State" />:</strong> {selectedState || detectedState || 'N/A'} |{' '}
          <strong><AzureTranslate text="Season" />:</strong> {selectedSeason || 'Auto'}
        </div>
      )}
    </div>
  )
}
