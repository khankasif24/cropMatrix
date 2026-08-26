import { useState, useEffect } from 'react'
import { useLocation } from '../contexts/LocationContext'
import { useLanguage } from '../contexts/LanguageContext'
import AzureTranslate from '../components/AzureTranslate'

/* ── Weather Code → Label + Emoji ── */
const WMO = {
  0: { label: 'Clear Sky', icon: '☀️', bg: 'from-amber-400 to-orange-500' },
  1: { label: 'Mainly Clear', icon: '🌤️', bg: 'from-amber-300 to-yellow-400' },
  2: { label: 'Partly Cloudy', icon: '⛅', bg: 'from-sky-300 to-blue-400' },
  3: { label: 'Overcast', icon: '☁️', bg: 'from-slate-400 to-gray-500' },
  45: { label: 'Fog', icon: '🌫️', bg: 'from-gray-300 to-slate-400' },
  48: { label: 'Rime Fog', icon: '🌫️', bg: 'from-gray-300 to-slate-400' },
  51: { label: 'Light Drizzle', icon: '🌦️', bg: 'from-sky-400 to-blue-500' },
  53: { label: 'Drizzle', icon: '🌦️', bg: 'from-sky-400 to-blue-500' },
  55: { label: 'Dense Drizzle', icon: '🌧️', bg: 'from-blue-400 to-indigo-500' },
  61: { label: 'Light Rain', icon: '🌧️', bg: 'from-blue-400 to-indigo-500' },
  63: { label: 'Moderate Rain', icon: '🌧️', bg: 'from-blue-500 to-indigo-600' },
  65: { label: 'Heavy Rain', icon: '🌧️', bg: 'from-indigo-500 to-purple-600' },
  71: { label: 'Light Snow', icon: '🌨️', bg: 'from-blue-200 to-indigo-300' },
  73: { label: 'Snow', icon: '❄️', bg: 'from-blue-300 to-indigo-400' },
  75: { label: 'Heavy Snow', icon: '❄️', bg: 'from-indigo-300 to-purple-400' },
  80: { label: 'Rain Showers', icon: '🌦️', bg: 'from-sky-500 to-blue-600' },
  81: { label: 'Moderate Showers', icon: '🌧️', bg: 'from-blue-500 to-indigo-600' },
  82: { label: 'Violent Showers', icon: '⛈️', bg: 'from-indigo-600 to-purple-700' },
  95: { label: 'Thunderstorm', icon: '⛈️', bg: 'from-gray-700 to-slate-800' },
  96: { label: 'Thunderstorm + Hail', icon: '⛈️', bg: 'from-gray-800 to-slate-900' },
  99: { label: 'Heavy Hailstorm', icon: '⛈️', bg: 'from-gray-800 to-slate-900' },
}
const getWmo = (code) => WMO[code] || WMO[0]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* UV label helper */
const uvLabel = (uv) => {
  if (uv <= 2) return { text: 'Low', color: 'text-primary', bg: 'bg-primary/10' }
  if (uv <= 5) return { text: 'Moderate', color: 'text-tertiary', bg: 'bg-tertiary-fixed/30' }
  if (uv <= 7) return { text: 'High', color: 'text-error', bg: 'bg-error/10' }
  return { text: 'Very High', color: 'text-error', bg: 'bg-error/20' }
}

/* Soil moisture advice */
const soilAdvice = (moisture) => {
  if (moisture == null) return 'No data'
  if (moisture < 15) return 'Very dry — consider irrigating immediately'
  if (moisture < 25) return 'Low moisture — plan irrigation within 1–2 days'
  if (moisture < 40) return 'Adequate moisture — no immediate action needed'
  return 'High moisture — delay irrigation, monitor drainage'
}

export default function Weather() {
  const { t } = useLanguage()
  const { latitude, longitude, city, state } = useLocation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const lat = latitude || 25.3176
    const lon = longitude || 82.9739
    fetchWeather(lat, lon)
  }, [latitude, longitude])

  async function fetchWeather(lat, lon) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index',
        hourly: 'temperature_2m,weather_code,precipitation_probability',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant',
        timezone: 'auto',
        forecast_days: 7,
      })
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      if (!res.ok) throw new Error('Weather API failed')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in gap-4">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse-soft">
          <span className="material-symbols-outlined text-primary text-4xl">cloud</span>
        </div>
        <div className="spinner" />
        <span className="font-label text-sm text-on-surface-variant"><AzureTranslate text="Fetching weather data..." /></span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in gap-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-error/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-error text-4xl">cloud_off</span>
        </div>
        <h3 className="font-headline font-bold text-lg text-on-surface"><AzureTranslate text="Could not load weather" /></h3>
        <p className="text-sm text-on-surface-variant/60">{error}</p>
        <button onClick={() => fetchWeather(latitude || 25.3176, longitude || 82.9739)}
          className="px-6 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 mt-2">
          <AzureTranslate text="Retry" />
        </button>
      </div>
    )
  }

  const cur = data?.current || {}
  const daily = data?.daily || {}
  const hourly = data?.hourly || {}
  const curWmo = getWmo(cur.weather_code)

  /* Next 24 hours (from current hour) */
  const nowIdx = new Date().getHours()
  const hourlySlice = []
  for (let i = nowIdx; i < Math.min(nowIdx + 24, (hourly.time || []).length); i++) {
    hourlySlice.push({
      time: new Date(hourly.time[i]).toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true }),
      temp: Math.round(hourly.temperature_2m[i]),
      code: hourly.weather_code[i],
      precip: hourly.precipitation_probability?.[i] || 0,
    })
  }

  /* Max temp range for bar chart scaling */
  const allMaxTemps = daily.temperature_2m_max || []
  const allMinTemps = daily.temperature_2m_min || []
  const globalMax = Math.max(...allMaxTemps, 45)
  const globalMin = Math.min(...allMinTemps, 0)
  const tempRange = globalMax - globalMin || 1

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
          <AzureTranslate text="Weather Forecast" /> 🌤️
        </h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1">
          <AzureTranslate text="7-day forecast and agricultural weather intelligence for" /> {city || 'your location'}{state ? `, ${state}` : ''}
        </p>
      </div>

      {/* ── Current Weather Hero ── */}
      <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${curWmo.bg} p-6 md:p-8 text-white shadow-xl`}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Left — Temp & Condition */}
          <div className="md:col-span-1 text-center md:text-left">
            <div className="text-7xl md:text-8xl mb-2">{curWmo.icon}</div>
            <div className="font-headline font-extrabold text-6xl md:text-7xl tracking-tighter">
              {Math.round(cur.temperature_2m || 0)}°
            </div>
            <div className="font-label text-lg text-white/80 mt-1 capitalize">
              <AzureTranslate text={curWmo.label} />
            </div>
            <div className="font-label text-sm text-white/60 mt-1">
              <AzureTranslate text="Feels like" /> {Math.round(cur.apparent_temperature || 0)}°C
            </div>
          </div>

          {/* Middle — Details Grid */}
          <div className="md:col-span-1 grid grid-cols-2 gap-3">
            {[
              { icon: 'water_drop', label: 'Humidity', value: `${cur.relative_humidity_2m || 0}%` },
              { icon: 'air', label: 'Wind', value: `${Math.round(cur.wind_speed_10m || 0)} km/h` },
              { icon: 'compress', label: 'Pressure', value: `${Math.round(cur.surface_pressure || 0)} hPa` },
              { icon: 'wb_sunny', label: 'UV Index', value: `${(cur.uv_index || 0).toFixed(1)}` },
            ].map((item, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
                <span className="material-symbols-outlined text-white/70 text-lg mb-1 block">{item.icon}</span>
                <div className="font-headline font-bold text-lg">{item.value}</div>
                <div className="font-label text-[10px] text-white/60 uppercase tracking-wider">
                  <AzureTranslate text={item.label} />
                </div>
              </div>
            ))}
          </div>

          {/* Right — Sunrise/Sunset */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="text-3xl">🌅</div>
              <div>
                <div className="font-label text-[10px] text-white/60 uppercase tracking-wider"><AzureTranslate text="Sunrise" /></div>
                <div className="font-headline font-bold text-lg">
                  {daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="text-3xl">🌇</div>
              <div>
                <div className="font-label text-[10px] text-white/60 uppercase tracking-wider"><AzureTranslate text="Sunset" /></div>
                <div className="font-headline font-bold text-lg">
                  {daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="text-3xl">🌧️</div>
              <div>
                <div className="font-label text-[10px] text-white/60 uppercase tracking-wider"><AzureTranslate text="Precipitation" /></div>
                <div className="font-headline font-bold text-lg">{cur.precipitation || 0} mm</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hourly Forecast (Next 24h) ── */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 bg-surface-container-low flex items-center justify-between">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <AzureTranslate text="Hourly Forecast" />
          </h3>
          <span className="smart-chip bg-primary/10 text-primary"><AzureTranslate text="Next 24 Hours" /></span>
        </div>
        <div className="p-5 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3 min-w-max">
            {hourlySlice.map((h, i) => {
              const wmo = getWmo(h.code)
              return (
                <div key={i} className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl min-w-[70px] transition-all ${
                  i === 0 ? 'bg-primary/10 ring-2 ring-primary/20' : 'bg-surface-container-low/50 hover:bg-surface-container-low'
                }`}>
                  <span className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase">
                    {i === 0 ? <AzureTranslate text="Now" /> : h.time}
                  </span>
                  <span className="text-2xl">{wmo.icon}</span>
                  <span className="font-headline font-bold text-sm text-on-surface">{h.temp}°</span>
                  {h.precip > 0 && (
                    <span className="font-label text-[10px] text-primary font-bold">💧 {h.precip}%</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 7-Day Forecast ── */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 bg-surface-container-low flex items-center justify-between">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <AzureTranslate text="7-Day Forecast" />
          </h3>
        </div>
        <div className="divide-y divide-surface-container-high/40">
          {(daily.time || []).map((date, idx) => {
            const d = new Date(date)
            const wmo = getWmo(daily.weather_code?.[idx])
            const maxT = Math.round(daily.temperature_2m_max?.[idx] || 0)
            const minT = Math.round(daily.temperature_2m_min?.[idx] || 0)
            const precipProb = daily.precipitation_probability_max?.[idx] || 0
            const precipSum = daily.precipitation_sum?.[idx] || 0
            const wind = Math.round(daily.wind_speed_10m_max?.[idx] || 0)
            const uvMax = daily.uv_index_max?.[idx] || 0
            const uv = uvLabel(uvMax)
            const isToday = idx === 0
            // Bar position
            const barLeft = ((minT - globalMin) / tempRange) * 100
            const barWidth = ((maxT - minT) / tempRange) * 100

            return (
              <div key={date} className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                isToday ? 'bg-primary/5' : 'hover:bg-surface-container-low/30'
              }`}>
                {/* Day */}
                <div className="w-16 flex-shrink-0">
                  <div className="font-headline font-bold text-sm text-on-surface">
                    {isToday ? <AzureTranslate text="Today" /> : DAY_NAMES[d.getDay()]}
                  </div>
                  <div className="font-label text-[10px] text-on-surface-variant/40">
                    {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {/* Icon */}
                <div className="text-2xl flex-shrink-0 w-10 text-center">{wmo.icon}</div>

                {/* Condition */}
                <div className="hidden sm:block w-28 flex-shrink-0">
                  <div className="font-label text-xs text-on-surface-variant capitalize truncate">
                    <AzureTranslate text={wmo.label} />
                  </div>
                </div>

                {/* Temp bar */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-label text-xs text-on-surface-variant/50 w-8 text-right">{minT}°</span>
                  <div className="flex-1 h-2 bg-surface-container-low rounded-full relative overflow-hidden">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                      style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 4)}%` }}
                    />
                  </div>
                  <span className="font-headline font-bold text-xs text-on-surface w-8">{maxT}°</span>
                </div>

                {/* Extras */}
                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                  {precipProb > 0 && (
                    <span className="smart-chip bg-primary/10 text-primary text-[10px]">
                      💧 {precipProb}%{precipSum > 0 ? ` · ${precipSum.toFixed(1)}mm` : ''}
                    </span>
                  )}
                  <span className={`smart-chip ${uv.bg} ${uv.color} text-[10px]`}>
                    UV {uvMax.toFixed(0)}
                  </span>
                  <span className="font-label text-[10px] text-on-surface-variant/40 w-16 text-right">
                    💨 {wind} km/h
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Agricultural Insights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UV Advisory */}
        <div className="bg-white rounded-2xl editorial-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-tertiary-fixed/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary">wb_sunny</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface text-sm"><AzureTranslate text="UV Advisory" /></h4>
              <p className="font-label text-[10px] text-on-surface-variant/50"><AzureTranslate text="Crop exposure guidance" /></p>
            </div>
          </div>
          <div className="space-y-2">
            {(daily.time || []).slice(0, 4).map((date, idx) => {
              const uvMax = daily.uv_index_max?.[idx] || 0
              const uv = uvLabel(uvMax)
              return (
                <div key={date} className="flex items-center justify-between py-2 border-b border-surface-container-high/40 last:border-0">
                  <span className="font-label text-xs text-on-surface-variant">
                    {idx === 0 ? <AzureTranslate text="Today" /> : new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className={`smart-chip ${uv.bg} ${uv.color} text-[10px]`}>
                    UV {uvMax.toFixed(0)} — <AzureTranslate text={uv.text} />
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rainfall Summary */}
        <div className="bg-white rounded-2xl editorial-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">water_drop</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface text-sm"><AzureTranslate text="Rainfall Outlook" /></h4>
              <p className="font-label text-[10px] text-on-surface-variant/50"><AzureTranslate text="Next 7 days total" /></p>
            </div>
          </div>
          {(() => {
            const totalRain = (daily.precipitation_sum || []).reduce((s, v) => s + (v || 0), 0)
            const maxRainDay = (daily.precipitation_sum || []).reduce((max, v, i) => (v || 0) > (max.v || 0) ? { v, i } : max, { v: 0, i: 0 })
            return (
              <div className="space-y-3">
                <div className="text-center py-3">
                  <div className="text-4xl mb-2">🌧️</div>
                  <div className="font-headline font-extrabold text-3xl text-primary">{totalRain.toFixed(1)} <span className="text-base font-normal text-on-surface-variant">mm</span></div>
                  <div className="font-label text-xs text-on-surface-variant/50 mt-1"><AzureTranslate text="Total expected rainfall" /></div>
                </div>
                <div className="flex gap-1 items-end justify-center h-16">
                  {(daily.precipitation_sum || []).map((rain, idx) => {
                    const maxRain = Math.max(...(daily.precipitation_sum || [1]), 1)
                    const height = ((rain || 0) / maxRain) * 100
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-full bg-primary/20 rounded-t-sm overflow-hidden relative" style={{ height: '48px' }}>
                          <div className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(height, 2)}%` }} />
                        </div>
                        <span className="font-label text-[9px] text-on-surface-variant/40">{DAY_NAMES[new Date(daily.time[idx]).getDay()]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Wind Summary */}
        <div className="bg-white rounded-2xl editorial-shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-secondary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">air</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface text-sm"><AzureTranslate text="Wind Conditions" /></h4>
              <p className="font-label text-[10px] text-on-surface-variant/50"><AzureTranslate text="7-day wind speeds" /></p>
            </div>
          </div>
          <div className="space-y-2">
            {(daily.time || []).map((date, idx) => {
              const wind = Math.round(daily.wind_speed_10m_max?.[idx] || 0)
              const maxWind = Math.max(...(daily.wind_speed_10m_max || [1]))
              const barW = (wind / maxWind) * 100
              return (
                <div key={date} className="flex items-center gap-2">
                  <span className="font-label text-[10px] text-on-surface-variant/50 w-8">
                    {idx === 0 ? 'Now' : DAY_NAMES[new Date(date).getDay()]}
                  </span>
                  <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${barW}%` }} />
                  </div>
                  <span className="font-headline font-bold text-[10px] text-on-surface w-12 text-right">{wind} km/h</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 bg-secondary-container/10 rounded-xl">
            <p className="font-label text-xs text-on-surface-variant/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">info</span>
              <AzureTranslate text="Avoid spraying pesticides when wind exceeds 15 km/h" />
            </p>
          </div>
        </div>
      </div>

      {/* ── Farming Tips Based on Weather ── */}
      <div className="bg-white rounded-2xl editorial-shadow p-5 md:p-6 flex gap-4 items-start">
        <div className="w-11 h-11 rounded-2xl bg-tertiary-fixed/30 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-tertiary">tips_and_updates</span>
        </div>
        <div>
          <h4 className="font-headline font-bold text-on-surface mb-2">
            <AzureTranslate text="Weather-Based Farming Tips" />
          </h4>
          <ul className="space-y-1.5 font-label text-sm text-on-surface-variant/60 leading-relaxed list-disc pl-5">
            {(() => {
              const tips = []
              const totalRain = (daily.precipitation_sum || []).reduce((s, v) => s + (v || 0), 0)
              const maxTemp = Math.max(...(daily.temperature_2m_max || [0]))
              const avgWind = (daily.wind_speed_10m_max || []).reduce((s, v) => s + v, 0) / (daily.wind_speed_10m_max?.length || 1)

              if (totalRain > 20) tips.push('Heavy rainfall expected — delay fertilizer application and ensure field drainage is clear')
              else if (totalRain > 5) tips.push('Moderate rain forecasted — ideal time for sowing if soil is prepared')
              else tips.push('Dry spell ahead — plan irrigation schedule and consider mulching to conserve soil moisture')

              if (maxTemp > 40) tips.push('Extreme heat warning — provide shade for nurseries and increase watering frequency')
              else if (maxTemp > 35) tips.push('High temperatures forecasted — consider early morning or evening irrigation to reduce evaporation')

              if (avgWind > 20) tips.push('Strong winds expected — secure greenhouse covers and delay foliar spray applications')

              const maxUv = Math.max(...(daily.uv_index_max || [0]))
              if (maxUv > 7) tips.push('Very high UV levels — transplant seedlings in evening hours for better survival rates')

              tips.push('Monitor hourly forecast before planning field operations for the day')

              return tips.map((tip, i) => (
                <li key={i}><AzureTranslate text={tip} /></li>
              ))
            })()}
          </ul>
        </div>
      </div>
    </div>
  )
}
