import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWeather, getMarketPrices, healthCheck } from '../services/api'
import { useLocation } from '../contexts/LocationContext'
import { useAuth } from '../contexts/AuthContext'
import AzureTranslate from '../components/AzureTranslate'

export default function Dashboard() {

  const [weather, setWeather] = useState(null)
  const [prices, setPrices] = useState(null)
  const [status, setStatus] = useState(null)
  const [weatherAlerts, setWeatherAlerts] = useState([])

  const {
    latitude,
    longitude,
    city,
    state: locState
  } = useLocation()

  const { user } = useAuth()


  /* =========================================================
     BACKEND HEALTH
     ========================================================= */

  useEffect(() => {

    healthCheck()
      .then(setStatus)
      .catch(() => setStatus({ status: 'offline' }))

  }, [])


  /* =========================================================
     LIVE WEATHER + MARKET DATA
     ========================================================= */

  useEffect(() => {

    const lat = latitude || 25.3176
    const lon = longitude || 82.9739

    getWeather(lat, lon)
      .then(data => {
        setWeather(data)
        setWeatherAlerts(data?.alerts || [])
      })
      .catch(console.error)

    const commodity = 'Wheat'
    const state = locState || ''

    getMarketPrices(
      commodity,
      state,
      '',
      '',
      30
    )
      .then(setPrices)
      .catch(console.error)

  }, [latitude, longitude, locState])


  /* =========================================================
     DERIVED VALUES
     ========================================================= */

  const userName =
    user?.name ||
    'Farmer'

  const currentTemp =
    weather?.current?.temperature

  const currentHumidity =
    weather?.current?.humidity

  const currentCondition =
    weather?.current?.description ||
    'Weather unavailable'

  const windSpeed =
    weather?.current?.wind_speed

  const locationText =
    city ||
    locState ||
    'Your Farm'


  /* =========================================================
     WEATHER ICON
     ========================================================= */

  const getConditionEmoji = (condition) => {

    if (!condition)
      return '☀️'

    const lower =
      condition.toLowerCase()

    if (
      lower.includes('clear') ||
      lower.includes('sun')
    )
      return '☀️'

    if (
      lower.includes('partly cloud') ||
      lower.includes('few cloud')
    )
      return '⛅'

    if (lower.includes('cloud'))
      return '☁️'

    if (
      lower.includes('rain') ||
      lower.includes('drizzle')
    )
      return '🌧️'

    if (
      lower.includes('storm') ||
      lower.includes('thunder')
    )
      return '⛈️'

    if (lower.includes('snow'))
      return '❄️'

    if (
      lower.includes('mist') ||
      lower.includes('fog') ||
      lower.includes('haze')
    )
      return '🌫️'

    return '🌤️'
  }


  const weatherEmoji =
    getConditionEmoji(currentCondition)


  /* =========================================================
     QUICK ACTIONS
     ========================================================= */

  const quickActions = [

    {
      path: '/recommend',
      icon: 'psychology',
      title: 'AI Crop Advisory',
      description: 'Find suitable crops',
      emoji: '🌱'
    },

    {
      path: '/disease',
      icon: 'document_scanner',
      title: 'Disease Scanner',
      description: 'Scan crop health',
      emoji: '🔬'
    },

    {
      path: '/fields',
      icon: 'add_location_alt',
      title: 'Manage Fields',
      description: 'Add your farm',
      emoji: '📍'
    },

    {
      path: '/fertilizer',
      icon: 'water_drop',
      title: 'Fertilizer Advisor',
      description: 'Nutrient guidance',
      emoji: '🧪'
    }

  ]


  /* =========================================================
     INTELLIGENCE TOOLS
     ========================================================= */

  const intelligenceTools = [

    {
      path: '/yield',
      icon: 'query_stats',
      title: 'Yield Prediction',
      description:
        'Estimate potential crop production using available farm information.'
    },

    {
      path: '/simulator',
      icon: 'science',
      title: 'What-If Simulator',
      description:
        'Test how changing farm conditions may affect recommendations.'
    },

    {
      path: '/profit-planner',
      icon: 'payments',
      title: 'Profit Planner',
      description:
        'Compare estimated crop costs, revenue and profitability.'
    },

    {
      path: '/smart-alerts',
      icon: 'notifications_active',
      title: 'Smart Alerts',
      description:
        'View weather, crop and market-related alerts in one place.'
    }

  ]


  return (

    <div className="max-w-7xl mx-auto space-y-7 animate-fade-in">


      {/* =====================================================
          WEATHER ALERT
          ===================================================== */}

      {weatherAlerts.length > 0 && (

        <div className="
          rounded-2xl
          border
          border-amber-200
          bg-amber-50
          px-5
          py-4
          flex
          items-start
          gap-3
        ">

          <span className="
            material-symbols-outlined
            text-amber-600
          ">
            warning
          </span>

          <div>

            <p className="
              font-bold
              text-amber-900
              text-sm
            ">
              <AzureTranslate text="Weather Alert" />
            </p>

            <p className="
              text-sm
              text-amber-800/70
              mt-1
            ">
              <AzureTranslate
                text={weatherAlerts[0]?.message || ''}
              />
            </p>

          </div>

        </div>

      )}


      {/* =====================================================
          CROPMATRIX HERO
          ===================================================== */}

      <section className="
        relative
        overflow-hidden
        rounded-[2rem]
        bg-emerald-950
        text-white
        px-6
        py-9
        md:px-10
        md:py-11
      ">

        {/* Background glow */}

        <div className="
          absolute
          -right-20
          -top-20
          w-80
          h-80
          bg-emerald-500/20
          rounded-full
          blur-3xl
        " />

        <div className="
          absolute
          -left-20
          -bottom-32
          w-80
          h-80
          bg-lime-400/10
          rounded-full
          blur-3xl
        " />


        <div className="
          relative
          z-10
          grid
          gap-8
          lg:grid-cols-[1.4fr_0.6fr]
          lg:items-center
        ">


          {/* Welcome */}

          <div>

            <div className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-emerald-400/20
              bg-emerald-400/10
              px-4
              py-2
              text-[11px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-emerald-200
            ">

              <span className="
                w-2
                h-2
                bg-lime-300
                rounded-full
              " />

              CROPMATRIX INTELLIGENCE

            </div>


            <h1 className="
              mt-6
              text-3xl
              md:text-5xl
              font-black
              tracking-tight
              leading-tight
            ">

              <AzureTranslate
                text={`Welcome, ${userName}`}
              />

              <span className="
                block
                text-emerald-300
                mt-1
              ">
                <AzureTranslate
                  text="Let's grow smarter today."
                />
              </span>

            </h1>


            <p className="
              mt-5
              max-w-xl
              text-sm
              md:text-base
              leading-7
              text-emerald-100/65
            ">

              <AzureTranslate
                text="Your CropMatrix dashboard brings weather, crop intelligence, market information and farm decision tools together in one place."
              />

            </p>


            <div className="
              mt-7
              flex
              flex-wrap
              gap-3
            ">

              <Link
                to="/recommend"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-emerald-400
                  px-6
                  py-3
                  text-sm
                  font-black
                  text-emerald-950
                  hover:bg-lime-300
                  transition
                "
              >

                <span className="
                  material-symbols-outlined
                  text-lg
                ">
                  auto_awesome
                </span>

                <AzureTranslate
                  text="Get AI Advisory"
                />

              </Link>


              <Link
                to="/disease"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/15
                  bg-white/5
                  px-6
                  py-3
                  text-sm
                  font-bold
                  text-white
                  hover:bg-white/10
                  transition
                "
              >

                <span className="
                  material-symbols-outlined
                  text-lg
                ">
                  document_scanner
                </span>

                <AzureTranslate
                  text="Scan Crop"
                />

              </Link>

            </div>

          </div>


          {/* System card */}

          <div className="
            rounded-[1.5rem]
            border
            border-white/10
            bg-white/10
            backdrop-blur-xl
            p-5
          ">

            <p className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.2em]
              text-emerald-200/60
            ">
              FARM INTELLIGENCE STATUS
            </p>


            <div className="
              mt-5
              space-y-4
            ">


              {/* Location */}

              <div className="
                flex
                items-center
                gap-3
              ">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-white/10
                  flex
                  items-center
                  justify-center
                ">

                  <span className="
                    material-symbols-outlined
                    text-emerald-300
                  ">
                    location_on
                  </span>

                </div>

                <div>

                  <p className="
                    text-xs
                    text-emerald-100/50
                  ">
                    <AzureTranslate text="Location" />
                  </p>

                  <p className="
                    font-bold
                    text-sm
                  ">
                    {locationText}
                  </p>

                </div>

              </div>


              {/* Backend */}

              <div className="
                flex
                items-center
                gap-3
              ">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-white/10
                  flex
                  items-center
                  justify-center
                ">

                  <span className="
                    material-symbols-outlined
                    text-emerald-300
                  ">
                    dns
                  </span>

                </div>

                <div>

                  <p className="
                    text-xs
                    text-emerald-100/50
                  ">
                    <AzureTranslate text="CropMatrix Engine" />
                  </p>

                  <p className="
                    font-bold
                    text-sm
                  ">

                    {status?.status === 'offline'
                      ? 'Offline'
                      : 'Connected'}

                  </p>

                </div>

              </div>


              {/* Weather */}

              <div className="
                flex
                items-center
                gap-3
              ">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-white/10
                  flex
                  items-center
                  justify-center
                  text-xl
                ">
                  {weatherEmoji}
                </div>

                <div>

                  <p className="
                    text-xs
                    text-emerald-100/50
                  ">
                    <AzureTranslate text="Current Weather" />
                  </p>

                  <p className="
                    font-bold
                    text-sm
                  ">

                    {currentTemp !== undefined
                      ? `${Math.round(currentTemp)}°C`
                      : 'Loading...'}

                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          QUICK ACTIONS
          ===================================================== */}

      <section>

        <div className="
          flex
          items-end
          justify-between
          mb-4
        ">

          <div>

            <p className="
              text-xs
              font-black
              uppercase
              tracking-[0.18em]
              text-primary
            ">
              <AzureTranslate text="Quick Actions" />
            </p>

            <h2 className="
              mt-1
              text-2xl
              font-black
              text-on-surface
            ">
              <AzureTranslate
                text="What do you want to do?"
              />
            </h2>

          </div>

        </div>


        <div className="
          grid
          grid-cols-2
          lg:grid-cols-4
          gap-4
        ">

          {quickActions.map(action => (

            <Link
              key={action.path}
              to={action.path}
              className="
                group
                rounded-[1.5rem]
                bg-white
                border
                border-emerald-100
                p-5
                hover:-translate-y-1
                hover:shadow-lg
                transition-all
              "
            >

              <div className="
                flex
                items-center
                justify-between
              ">

                <div className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-emerald-50
                  text-emerald-600
                  flex
                  items-center
                  justify-center
                  group-hover:bg-emerald-600
                  group-hover:text-white
                  transition
                ">

                  <span className="
                    material-symbols-outlined
                  ">
                    {action.icon}
                  </span>

                </div>

                <span className="text-xl">
                  {action.emoji}
                </span>

              </div>


              <h3 className="
                mt-5
                font-black
                text-sm
                text-on-surface
              ">
                <AzureTranslate
                  text={action.title}
                />
              </h3>


              <p className="
                mt-1
                text-xs
                text-on-surface-variant/60
              ">
                <AzureTranslate
                  text={action.description}
                />
              </p>

            </Link>

          ))}

        </div>

      </section>


      {/* =====================================================
          LIVE FARM SNAPSHOT
          ===================================================== */}

      <section>

        <div className="mb-4">

          <p className="
            text-xs
            font-black
            uppercase
            tracking-[0.18em]
            text-primary
          ">
            LIVE DATA
          </p>

          <h2 className="
            mt-1
            text-2xl
            font-black
            text-on-surface
          ">
            <AzureTranslate text="Farm Snapshot" />
          </h2>

        </div>


        <div className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
        ">


          {/* Weather */}

          <Link
            to="/weather"
            className="
              rounded-[1.7rem]
              bg-white
              border
              border-emerald-100
              p-6
              hover:shadow-lg
              transition
            "
          >

            <div className="
              flex
              items-start
              justify-between
            ">

              <div>

                <p className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                ">
                  <AzureTranslate text="Weather" />
                </p>

                <h3 className="
                  mt-2
                  text-4xl
                  font-black
                  text-on-surface
                ">

                  {currentTemp !== undefined
                    ? `${Math.round(currentTemp)}°`
                    : '--'}

                </h3>

              </div>

              <div className="text-4xl">
                {weatherEmoji}
              </div>

            </div>


            <p className="
              mt-5
              text-sm
              font-bold
              text-on-surface
            ">
              <AzureTranslate
                text={currentCondition}
              />
            </p>


            <div className="
              mt-5
              grid
              grid-cols-2
              gap-3
            ">

              <div className="
                rounded-xl
                bg-blue-50
                p-3
              ">

                <p className="
                  text-[10px]
                  uppercase
                  font-bold
                  text-blue-500
                ">
                  Humidity
                </p>

                <p className="
                  mt-1
                  font-black
                  text-blue-900
                ">
                  {currentHumidity ?? '--'}%
                </p>

              </div>


              <div className="
                rounded-xl
                bg-emerald-50
                p-3
              ">

                <p className="
                  text-[10px]
                  uppercase
                  font-bold
                  text-emerald-500
                ">
                  Wind
                </p>

                <p className="
                  mt-1
                  font-black
                  text-emerald-900
                ">
                  {windSpeed ?? '--'}
                </p>

              </div>

            </div>

          </Link>


          {/* Market */}

          <Link
            to="/market"
            className="
              rounded-[1.7rem]
              bg-white
              border
              border-emerald-100
              p-6
              hover:shadow-lg
              transition
            "
          >

            <div className="
              flex
              items-center
              justify-between
            ">

              <div className="
                w-11
                h-11
                rounded-2xl
                bg-emerald-50
                text-emerald-600
                flex
                items-center
                justify-center
              ">

                <span className="
                  material-symbols-outlined
                ">
                  trending_up
                </span>

              </div>

              <span className="
                text-[10px]
                font-black
                text-emerald-600
                uppercase
                tracking-wider
              ">
                LIVE
              </span>

            </div>


            <p className="
              mt-5
              text-xs
              font-bold
              uppercase
              tracking-wider
              text-slate-400
            ">
              <AzureTranslate text="Wheat Market" />
            </p>


            <h3 className="
              mt-2
              text-3xl
              font-black
              text-on-surface
            ">

              {prices?.latest_price
                ? `₹${prices.latest_price.toLocaleString()}`
                : 'Loading...'}

            </h3>


            <p className="
              mt-2
              text-sm
              text-on-surface-variant/60
            ">
              <AzureTranslate
                text="Latest available market price"
              />
            </p>


            <div className="
              mt-6
              flex
              items-center
              gap-1
              text-sm
              font-bold
              text-primary
            ">

              <AzureTranslate
                text="Open Market Intelligence"
              />

              <span className="
                material-symbols-outlined
                text-sm
              ">
                arrow_forward
              </span>

            </div>

          </Link>


          {/* Crop Health */}

          <Link
            to="/disease"
            className="
              rounded-[1.7rem]
              bg-emerald-950
              text-white
              p-6
              hover:shadow-xl
              transition
              relative
              overflow-hidden
            "
          >

            <div className="
              absolute
              -right-10
              -bottom-10
              opacity-10
            ">

              <span className="
                material-symbols-outlined
                text-[150px]
              ">
                psychiatry
              </span>

            </div>


            <div className="relative z-10">

              <div className="
                w-11
                h-11
                rounded-2xl
                bg-emerald-400
                text-emerald-950
                flex
                items-center
                justify-center
              ">

                <span className="
                  material-symbols-outlined
                ">
                  document_scanner
                </span>

              </div>


              <p className="
                mt-5
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-emerald-200/60
              ">
                CROPMATRIX VISION
              </p>


              <h3 className="
                mt-2
                text-2xl
                font-black
              ">
                <AzureTranslate
                  text="Check Crop Health"
                />
              </h3>


              <p className="
                mt-3
                text-sm
                leading-6
                text-emerald-100/60
              ">
                <AzureTranslate
                  text="Upload a crop image and use the disease scanner for crop-health analysis."
                />
              </p>


              <div className="
                mt-6
                inline-flex
                items-center
                gap-2
                text-sm
                font-bold
                text-emerald-300
              ">

                <AzureTranslate
                  text="Start Scan"
                />

                <span className="
                  material-symbols-outlined
                  text-sm
                ">
                  arrow_forward
                </span>

              </div>

            </div>

          </Link>

        </div>

      </section>


      {/* =====================================================
          CROPMATRIX INTELLIGENCE TOOLS
          ===================================================== */}

      <section className="
        rounded-[2rem]
        bg-[#f1f7f4]
        p-6
        md:p-8
      ">

        <div>

          <p className="
            text-xs
            font-black
            uppercase
            tracking-[0.18em]
            text-primary
          ">
            CROPMATRIX AI
          </p>

          <h2 className="
            mt-1
            text-2xl
            font-black
            text-on-surface
          ">
            <AzureTranslate
              text="Decision Intelligence"
            />
          </h2>

          <p className="
            mt-2
            text-sm
            text-on-surface-variant/60
          ">
            <AzureTranslate
              text="Use CropMatrix tools to analyze different farming decisions."
            />
          </p>

        </div>


        <div className="
          mt-6
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-4
        ">

          {intelligenceTools.map(tool => (

            <Link
              key={tool.path}
              to={tool.path}
              className="
                group
                bg-white
                rounded-[1.5rem]
                p-5
                border
                border-emerald-100
                hover:-translate-y-1
                hover:shadow-lg
                transition-all
              "
            >

              <div className="
                w-11
                h-11
                rounded-2xl
                bg-emerald-50
                text-emerald-600
                flex
                items-center
                justify-center
                group-hover:bg-emerald-600
                group-hover:text-white
                transition
              ">

                <span className="
                  material-symbols-outlined
                ">
                  {tool.icon}
                </span>

              </div>


              <h3 className="
                mt-5
                font-black
                text-sm
                text-on-surface
              ">
                <AzureTranslate
                  text={tool.title}
                />
              </h3>


              <p className="
                mt-2
                text-xs
                leading-5
                text-on-surface-variant/60
              ">
                <AzureTranslate
                  text={tool.description}
                />
              </p>

            </Link>

          ))}

        </div>

      </section>


      {/* =====================================================
          FARMER SUPPORT
          ===================================================== */}

      <section>

        <div className="mb-4">

          <p className="
            text-xs
            font-black
            uppercase
            tracking-[0.18em]
            text-primary
          ">
            FARMER SUPPORT
          </p>

          <h2 className="
            mt-1
            text-2xl
            font-black
            text-on-surface
          ">
            <AzureTranslate
              text="Beyond the Farm"
            />
          </h2>

        </div>


        <div className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-4
        ">


          <Link
            to="/schemes"
            className="
              rounded-2xl
              border
              border-emerald-100
              bg-white
              p-5
              flex
              items-center
              gap-4
              hover:shadow-md
              transition
            "
          >

            <div className="
              w-12
              h-12
              rounded-2xl
              bg-orange-50
              text-orange-600
              flex
              items-center
              justify-center
            ">

              <span className="
                material-symbols-outlined
              ">
                account_balance
              </span>

            </div>

            <div>

              <p className="font-black">
                <AzureTranslate
                  text="Government Schemes"
                />
              </p>

              <p className="
                text-xs
                text-slate-500
                mt-1
              ">
                <AzureTranslate
                  text="Explore farmer schemes"
                />
              </p>

            </div>

          </Link>


          <Link
            to="/loans"
            className="
              rounded-2xl
              border
              border-emerald-100
              bg-white
              p-5
              flex
              items-center
              gap-4
              hover:shadow-md
              transition
            "
          >

            <div className="
              w-12
              h-12
              rounded-2xl
              bg-blue-50
              text-blue-600
              flex
              items-center
              justify-center
            ">

              <span className="
                material-symbols-outlined
              ">
                savings
              </span>

            </div>

            <div>

              <p className="font-black">
                <AzureTranslate
                  text="Farmer Loans"
                />
              </p>

              <p className="
                text-xs
                text-slate-500
                mt-1
              ">
                <AzureTranslate
                  text="Financial support information"
                />
              </p>

            </div>

          </Link>


          <Link
            to="/community"
            className="
              rounded-2xl
              border
              border-emerald-100
              bg-white
              p-5
              flex
              items-center
              gap-4
              hover:shadow-md
              transition
            "
          >

            <div className="
              w-12
              h-12
              rounded-2xl
              bg-purple-50
              text-purple-600
              flex
              items-center
              justify-center
            ">

              <span className="
                material-symbols-outlined
              ">
                groups
              </span>

            </div>

            <div>

              <p className="font-black">
                <AzureTranslate
                  text="Farmer Community"
                />
              </p>

              <p className="
                text-xs
                text-slate-500
                mt-1
              ">
                <AzureTranslate
                  text="Connect and share knowledge"
                />
              </p>

            </div>

          </Link>

        </div>

      </section>


      {/* =====================================================
          CROPMATRIX FOOTER
          ===================================================== */}

      <div className="
        pt-4
        pb-6
        flex
        flex-col
        sm:flex-row
        items-center
        justify-between
        gap-3
        text-xs
        text-on-surface-variant/40
      ">

        <div className="
          flex
          items-center
          gap-2
        ">

          <span className="
            material-symbols-outlined
            text-primary
            text-lg
          ">
            eco
          </span>

          <span className="font-bold">
            CropMatrix
          </span>

          <span>
            • AI-Powered Smart Agriculture
          </span>

        </div>


        <span>
          <AzureTranslate
            text="Intelligence from sowing to selling"
          />
        </span>

      </div>

    </div>

  )
}