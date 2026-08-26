import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LocationProvider, useLocation as useDetectedLocation } from './contexts/LocationContext'

import LanguageSwitcher from './components/LanguageSwitcher'
import AzureTranslate from './components/AzureTranslate'
import Chatbot from './components/Chatbot'

import Dashboard from './pages/Dashboard'
import Recommend from './pages/Recommend'
import Fields from './pages/Fields'
import Market from './pages/Market'
import Planner from './pages/Planner'
import Profile from './pages/Profile'
import YieldPredict from './pages/YieldPredict'
import PestAlerts from './pages/PestAlerts'
import Fertilizer from './pages/Fertilizer'
import Community from './pages/Community'
import Feedback from './pages/Feedback'
import Login from './pages/Login'
import Landing from './pages/Landing'
import WhatIfSimulator from './pages/WhatIfSimulator'
import SmartAlerts from './pages/SmartAlerts'
import ProfitPlanner from './pages/ProfitPlanner'
import FieldScanner from './pages/FieldScanner'
import Weather from './pages/Weather'
import Schemes from './pages/Schemes'
import Loans from './pages/Loans'


/* =========================================================
   CROPMATRIX NAVIGATION
   ========================================================= */

const NAV_ITEMS = [
  {
    icon: 'dashboard',
    label: 'Dashboard',
    emoji: '📊',
    path: '/',
    end: true,
  },

  {
    icon: 'cloud',
    label: 'Weather',
    emoji: '☀️',
    path: '/weather',
  },

  {
    icon: 'psychology',
    label: 'Crop Advisory',
    emoji: '🧭',
    path: '/recommend',
  },

  {
    icon: 'document_scanner',
    label: 'Disease Scanner',
    emoji: '🔬',
    path: '/disease',
  },

  {
    icon: 'map',
    label: 'My Fields',
    emoji: '📍',
    path: '/fields',
  },

  {
    icon: 'agriculture',
    label: 'Rotation Planner',
    emoji: '🌿',
    path: '/planner',
  },

  {
    icon: 'trending_up',
    label: 'Market Prices',
    emoji: '📈',
    path: '/market',
  },

  {
    icon: 'query_stats',
    label: 'Yield Prediction',
    emoji: '🎯',
    path: '/yield',
  },

  {
    icon: 'warning',
    label: 'Pest Alerts',
    emoji: '⚠️',
    path: '/pests',
  },

  {
    icon: 'water_drop',
    label: 'Fertilizer',
    emoji: '🧪',
    path: '/fertilizer',
  },

  /* Decision Tools */

  {
    section: 'Decision Tools',
  },

  {
    icon: 'science',
    label: 'What-If Sim',
    emoji: '🔬',
    path: '/simulator',
  },

  {
    icon: 'notifications_active',
    label: 'Smart Alerts',
    emoji: '🚨',
    path: '/smart-alerts',
  },

  {
    icon: 'payments',
    label: 'Profit Planner',
    emoji: '💰',
    path: '/profit-planner',
  },

  /* Farmer Support */

  {
    section: 'Farmer Support',
  },

  {
    icon: 'account_balance',
    label: 'Schemes',
    emoji: '🏛️',
    path: '/schemes',
  },

  {
    icon: 'savings',
    label: 'Loans',
    emoji: '🌾',
    path: '/loans',
  },

  /* Social */

  {
    section: 'Social',
  },

  {
    icon: 'groups',
    label: 'Community',
    emoji: '💬',
    path: '/community',
  },

  {
    icon: 'forum',
    label: 'Feedback',
    emoji: '💭',
    path: '/feedback',
  },

  {
    icon: 'person',
    label: 'Profile',
    emoji: '👤',
    path: '/profile',
  },
]


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

const BOTTOM_NAV_ITEMS = [
  {
    icon: 'dashboard',
    label: 'Home',
    path: '/',
    end: true,
  },

  {
    icon: 'psychology',
    label: 'Advisory',
    path: '/recommend',
  },

  {
    icon: 'map',
    label: 'Fields',
    path: '/fields',
  },

  {
    icon: 'trending_up',
    label: 'Market',
    path: '/market',
  },
]


/* =========================================================
   PAGE TITLES
   ========================================================= */

const PAGE_TITLES = {
  '/': 'Dashboard',

  '/recommend': 'Crop Advisory',

  '/disease': 'Disease Scanner',

  '/pests': 'Pest Alerts',

  '/fields': 'My Fields',

  '/planner': 'Rotation Planner',

  '/fertilizer': 'Fertilizer & Remedies',

  '/market': 'Market Prices',

  '/yield': 'Yield Prediction',

  '/community': 'Community Hub',

  '/feedback': 'Feedback',

  '/profile': 'Profile',

  '/weather': 'Weather',

  '/simulator': 'What-If Simulator',

  '/smart-alerts': 'Smart Alerts',

  '/profit-planner': 'Profit Planner',

  '/field-scanner': 'Disease Scanner',

  '/schemes': 'Government Schemes',

  '/loans': 'Farmer Loans',
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({ isOpen, onClose }) {

  const { logout, user } = useAuth()

  const location = useLocation()


  /* Close sidebar when page changes */

  useEffect(() => {

    onClose()

  }, [location.pathname])


  return (

    <>

      {/* Mobile Overlay */}

      {isOpen && (

        <div

          className="
          fixed
          inset-0
          bg-black/30
          z-[199]
          md:hidden
          animate-fade-in
          "

          onClick={onClose}

        />

      )}


      {/* Sidebar */}

      <aside

        className={`
        fixed
        md:sticky
        top-0
        left-0
        h-screen
        z-[200]

        w-[260px]

        bg-[#f5f7f6]

        flex
        flex-col

        transition-transform
        duration-300
        ease-out

        overflow-y-auto
        hide-scrollbar

        ${
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0'
        }
        `}

      >


        {/* =================================================
            CROPMATRIX BRAND
            ================================================= */}

        <div className="px-5 pt-6 pb-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">


              {/* Logo */}

              <div
                className="
                w-11
                h-11
                rounded-2xl
                bg-primary/10
                flex
                items-center
                justify-center
                "
              >

                <span

                  className="
                  material-symbols-outlined
                  text-primary
                  text-xl
                  "

                  style={{
                    fontVariationSettings: "'FILL' 1",
                  }}

                >

                  eco

                </span>

              </div>


              {/* Brand Name */}

              <div>

                <h1
                  className="
                  font-headline
                  font-extrabold
                  text-primary
                  text-lg
                  tracking-tight
                  leading-none
                  "
                >

                  CropMatrix

                </h1>


                <p
                  className="
                  font-label
                  text-[10px]
                  tracking-[0.15em]
                  text-primary/50
                  uppercase
                  mt-0.5
                  "
                >

                  <AzureTranslate text="AI-Powered Agriculture" />

                </p>

              </div>

            </div>


            {/* Mobile Close */}

            <button

              className="
              md:hidden
              p-2
              rounded-xl
              hover:bg-surface-container
              text-on-surface-variant
              "

              onClick={onClose}

            >

              <span
                className="
                material-symbols-outlined
                text-lg
                "
              >

                close

              </span>

            </button>

          </div>

        </div>


        {/* =================================================
            NAVIGATION
            ================================================= */}

        <nav
          className="
          flex-1
          space-y-0.5
          px-3
          overflow-y-auto
          hide-scrollbar
          "
        >

          {NAV_ITEMS.map((item, idx) => {


            /* Section Divider */

            if (item.section) {

              return (

                <div
                  key={`section-${item.section}`}
                  className="
                  px-4
                  pt-4
                  pb-1
                  "
                >

                  <span
                    className="
                    font-label
                    text-[10px]
                    font-bold
                    text-on-surface-variant/40
                    uppercase
                    tracking-widest
                    "
                  >

                    <AzureTranslate text={item.section} />

                  </span>

                </div>

              )

            }


            return (

              <NavLink

                key={item.path}

                to={item.path}

                end={item.end}

                className={({ isActive }) =>

                  isActive

                    ? `
                      flex
                      items-center
                      gap-3
                      bg-white
                      text-on-surface
                      font-bold
                      rounded-2xl
                      px-4
                      py-3
                      editorial-shadow
                      transition-all
                      font-body
                      text-[13px]
                    `

                    : `
                      flex
                      items-center
                      gap-3
                      text-on-surface-variant/70
                      px-4
                      py-2.5
                      hover:bg-white/50
                      rounded-2xl
                      transition-all
                      duration-200
                      font-body
                      text-[13px]
                      hover:text-on-surface
                    `

                }

              >

                {({ isActive }) => (

                  <>

                    <span

                      className={`
                      material-symbols-outlined
                      text-lg
                      ${
                        isActive
                          ? 'text-primary'
                          : ''
                      }
                      `}

                      style={
                        isActive

                          ? {
                              fontVariationSettings:
                                "'FILL' 1",
                            }

                          : {}
                      }

                    >

                      {item.icon}

                    </span>


                    <span>

                      {isActive
                        ? `${item.emoji} `
                        : ''
                      }

                      <AzureTranslate
                        text={item.label}
                      />

                    </span>

                  </>

                )}

              </NavLink>

            )

          })}

        </nav>


        {/* =================================================
            SIDEBAR BOTTOM
            ================================================= */}

        <div
          className="
          px-4
          pb-5
          pt-3
          space-y-3
          mt-auto
          "
        >


          {/* Crop Cycle CTA */}

          <NavLink

            to="/recommend"

            className="
            w-full
            flex
            items-center
            justify-center
            gap-2
            bg-primary
            text-white
            px-4
            py-3.5
            rounded-full
            font-bold
            text-sm
            hover:bg-primary-container
            transition-colors
            shadow-lg
            shadow-primary/20
            "

          >

            <span
              className="
              material-symbols-outlined
              text-lg
              "
            >

              add_circle

            </span>


            <AzureTranslate
              text="New Crop Cycle"
            />

          </NavLink>


          {/* User */}

          {user && (

            <div
              className="
              flex
              items-center
              gap-3
              px-3
              py-3
              "
            >


              {/* Avatar */}

              <div
                className="
                w-10
                h-10
                rounded-full
                bg-primary
                flex
                items-center
                justify-center
                text-white
                font-bold
                text-sm
                flex-shrink-0
                "
              >

                {
                  (
                    user.name ||
                    user.phone ||
                    '?'
                  )[0].toUpperCase()
                }

              </div>


              {/* User Details */}

              <div
                className="
                min-w-0
                flex-1
                "
              >

                <p
                  className="
                  font-bold
                  text-[13px]
                  text-on-surface
                  truncate
                  "
                >

                  {user.name || user.phone}

                </p>


                <p
                  className="
                  font-label
                  text-[10px]
                  text-on-surface-variant/50
                  uppercase
                  tracking-wider
                  "
                >

                  <AzureTranslate
                    text="CropMatrix User"
                  />

                  {' '}🌱

                </p>

              </div>


              {/* Logout */}

              <button

                onClick={logout}

                className="
                p-1.5
                rounded-lg
                hover:bg-error/10
                text-on-surface-variant/40
                hover:text-error
                transition-colors
                "

                title="Logout"

              >

                <span
                  className="
                  material-symbols-outlined
                  text-lg
                  "
                >

                  logout

                </span>

              </button>

            </div>

          )}

        </div>

      </aside>

    </>

  )

}


/* =========================================================
   TOP BAR
   ========================================================= */

function TopBar({ onMenuToggle }) {

  const location = useLocation()

  const { user } = useAuth()

  let detectedLoc = null


  try {

    detectedLoc = useDetectedLocation()

  } catch (e) {

    detectedLoc = null

  }


  const title =
    PAGE_TITLES[location.pathname] ||
    'CropMatrix'


  return (

    <header
      className="
      bg-white/80
      glass-effect
      sticky
      top-0
      z-50
      flex
      justify-between
      items-center
      w-full
      px-4
      md:px-8
      py-3
      max-w-screen-2xl
      mx-auto
      "
    >


      {/* Left */}

      <div
        className="
        flex
        items-center
        gap-3
        "
      >


        {/* Mobile Menu */}

        <button

          className="
          md:hidden
          p-2
          rounded-xl
          hover:bg-surface-container
          text-on-surface
          "

          onClick={onMenuToggle}

          aria-label="Open menu"

        >

          <span
            className="
            material-symbols-outlined
            "
          >

            menu

          </span>

        </button>


        {/* Page Title */}

        <div>

          <h2
            className="
            font-headline
            font-bold
            text-lg
            text-on-surface
            tracking-tight
            "
          >

            <AzureTranslate
              text={title}
            />

          </h2>

        </div>

      </div>


      {/* Right */}

      <div
        className="
        flex
        items-center
        gap-2
        "
      >


        {/* Location */}

        {detectedLoc?.city && (

          <div
            className="
            hidden
            sm:flex
            items-center
            gap-1
            bg-surface-container
            rounded-full
            px-3
            py-1.5
            shadow-sm
            border
            border-surface-variant/20
            hover:bg-surface-container-high
            transition-colors
            "
          >

            <span

              className="
              material-symbols-outlined
              text-primary
              text-sm
              flex-shrink-0
              "

              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}

            >

              pin_drop

            </span>


            <span
              className="
              font-label
              text-xs
              font-semibold
              text-on-surface
              truncate
              max-w-[120px]
              "
            >

              {detectedLoc.city}

              {
                detectedLoc.state
                  ? `, ${detectedLoc.state}`
                  : ''
              }

            </span>

          </div>

        )}


        {/* Language */}

        <div>

          <LanguageSwitcher />

        </div>


        {/* Search */}

        <button

          className="
          p-2
          rounded-xl
          hover:bg-surface-container
          transition-colors
          hidden
          sm:flex
          "

          title="Search"

        >

          <span
            className="
            material-symbols-outlined
            text-on-surface-variant
            "
          >

            search

          </span>

        </button>


        {/* Notifications */}

        <button

          className="
          p-2
          rounded-xl
          hover:bg-surface-container
          transition-colors
          hidden
          sm:flex
          relative
          "

          title="Notifications"

        >

          <span
            className="
            material-symbols-outlined
            text-on-surface-variant
            "
          >

            notifications

          </span>


          <span
            className="
            absolute
            top-1.5
            right-1.5
            w-2
            h-2
            bg-error
            rounded-full
            "
          />

        </button>


        {/* User Avatar */}

        {user && (

          <NavLink

            to="/profile"

            className="
            hidden
            sm:flex
            items-center
            gap-2
            bg-surface-container
            rounded-full
            pl-1.5
            pr-4
            py-1
            hover:bg-surface-container-high
            transition-colors
            "

          >

            <div
              className="
              w-8
              h-8
              rounded-full
              bg-primary
              flex
              items-center
              justify-center
              text-white
              font-bold
              text-xs
              "
            >

              {
                (
                  user.name ||
                  user.phone ||
                  '?'
                )[0].toUpperCase()
              }

            </div>


            <span
              className="
              font-label
              text-xs
              font-semibold
              text-on-surface
              truncate
              max-w-[100px]
              "
            >

              {user.name || user.phone}

            </span>

          </NavLink>

        )}

      </div>

    </header>

  )

}


/* =========================================================
   MOBILE BOTTOM NAVIGATION
   ========================================================= */

function BottomNav() {

  const [moreOpen, setMoreOpen] =
    useState(false)

  const location = useLocation()


  useEffect(() => {

    setMoreOpen(false)

  }, [location.pathname])


  const moreItems = NAV_ITEMS.filter(

    item =>

      !item.section &&

      !BOTTOM_NAV_ITEMS.some(

        bottom =>
          bottom.path === item.path

      )

  )


  return (

    <>

      {/* Overlay */}

      {moreOpen && (

        <div

          className="
          fixed
          inset-0
          bg-black/30
          z-[140]
          md:hidden
          "

          onClick={() =>
            setMoreOpen(false)
          }

        />

      )}


      {/* More Drawer */}

      <div

        className={`
        fixed
        bottom-0
        left-0
        right-0
        z-[145]
        md:hidden

        bg-white

        rounded-t-3xl

        shadow-2xl

        transition-transform
        duration-300
        ease-out

        ${
          moreOpen
            ? 'translate-y-0'
            : 'translate-y-full'
        }
        `}

      >

        <div

          className="
          flex
          justify-center
          py-3
          cursor-pointer
          "

          onClick={() =>
            setMoreOpen(false)
          }

        >

          <div
            className="
            w-10
            h-1
            bg-outline-variant
            rounded-full
            "
          />

        </div>


        <div
          className="
          grid
          grid-cols-4
          gap-1.5
          px-4
          pb-6
          "
        >

          {moreItems.map(item => (

            <NavLink

              key={item.path}

              to={item.path}

              className={({ isActive }) => `
              flex
              flex-col
              items-center
              gap-1.5
              p-3
              rounded-2xl
              text-center
              transition-colors

              ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }
              `}

            >

              <span
                className="
                material-symbols-outlined
                "
              >

                {item.icon}

              </span>


              <span
                className="
                font-label
                text-[10px]
                font-bold
                leading-tight
                "
              >

                <AzureTranslate
                  text={item.label}
                />

              </span>

            </NavLink>

          ))}

        </div>

      </div>


      {/* Bottom Navigation */}

      <nav
        className="
        md:hidden
        fixed
        bottom-0
        left-0
        right-0
        bg-white/95
        glass-effect
        z-[150]
        bottom-safe-area
        "
      >

        <div
          className="
          flex
          justify-around
          items-center
          py-1.5
          px-2
          "
        >

          {BOTTOM_NAV_ITEMS.map(item => (

            <NavLink

              key={item.path}

              to={item.path}

              end={item.end}

              className={({ isActive }) => `
              flex
              flex-col
              items-center
              gap-0.5
              py-1.5
              px-3
              rounded-2xl
              min-w-[56px]
              transition-colors

              ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant/50'
              }
              `}

            >

              {({ isActive }) => (

                <>

                  {isActive ? (

                    <div
                      className="
                      bg-primary/10
                      px-4
                      py-1
                      rounded-full
                      "
                    >

                      <span

                        className="
                        material-symbols-outlined
                        text-xl
                        "

                        style={{
                          fontVariationSettings:
                            "'FILL' 1",
                        }}

                      >

                        {item.icon}

                      </span>

                    </div>

                  ) : (

                    <span
                      className="
                      material-symbols-outlined
                      text-xl
                      "
                    >

                      {item.icon}

                    </span>

                  )}


                  <span
                    className="
                    font-label
                    text-[10px]
                    font-bold
                    "
                  >

                    <AzureTranslate
                      text={item.label}
                    />

                  </span>

                </>

              )}

            </NavLink>

          ))}


          {/* More */}

          <button

            className={`
            flex
            flex-col
            items-center
            gap-0.5
            py-1.5
            px-3
            rounded-2xl
            min-w-[56px]
            transition-colors

            ${
              moreOpen
                ? 'text-primary'
                : 'text-on-surface-variant/50'
            }
            `}

            onClick={() =>
              setMoreOpen(prev => !prev)
            }

          >

            <span
              className="
              material-symbols-outlined
              text-xl
              "
            >

              {
                moreOpen
                  ? 'close'
                  : 'more_horiz'
              }

            </span>


            <span
              className="
              font-label
              text-[10px]
              font-bold
              "
            >

              <AzureTranslate
                text={
                  moreOpen
                    ? 'Close'
                    : 'More'
                }
              />

            </span>

          </button>

        </div>

      </nav>

    </>

  )

}


/* =========================================================
   AUTHENTICATION GUARD
   ========================================================= */

function ProtectedRoute({ children }) {

  const {
    isAuthenticated,
    loading,
  } = useAuth()


  if (loading) {

    return (

      <div
        className="
        flex
        items-center
        justify-center
        min-h-screen
        bg-surface
        "
      >

        <div
          className="
          flex
          flex-col
          items-center
          gap-4
          "
        >

          <div
            className="
            w-14
            h-14
            rounded-2xl
            bg-primary/10
            flex
            items-center
            justify-center
            animate-pulse-soft
            "
          >

            <span

              className="
              material-symbols-outlined
              text-primary
              text-3xl
              "

              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}

            >

              eco

            </span>

          </div>


          <div className="spinner" />


          <span
            className="
            font-label
            text-sm
            text-on-surface-variant
            "
          >

            Loading CropMatrix...

          </span>

        </div>

      </div>

    )

  }


  if (!isAuthenticated) {

    return (
      <Navigate
        to="/landing"
        replace
      />
    )

  }


  return children

}


/* =========================================================
   APPLICATION LAYOUT
   ========================================================= */

function AppLayout() {

  const [sidebarOpen, setSidebarOpen] =
    useState(false)


  return (

    <div
      className="
      flex
      min-h-screen
      bg-surface
      "
    >


      {/* Sidebar */}

      <Sidebar

        isOpen={sidebarOpen}

        onClose={() =>
          setSidebarOpen(false)
        }

      />


      {/* Main */}

      <main
        className="
        flex-1
        min-w-0
        md:ml-0
        relative
        "
      >


        <TopBar

          onMenuToggle={() =>
            setSidebarOpen(
              prev => !prev
            )
          }

        />


        <div
          className="
          p-4
          md:p-8
          max-w-screen-2xl
          mx-auto
          pb-24
          md:pb-8
          "
        >

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/recommend"
              element={<Recommend />}
            />

            <Route
              path="/disease"
              element={<FieldScanner />}
            />

            <Route
              path="/pests"
              element={<PestAlerts />}
            />

            <Route
              path="/fields"
              element={<Fields />}
            />

            <Route
              path="/planner"
              element={<Planner />}
            />

            <Route
              path="/fertilizer"
              element={<Fertilizer />}
            />

            <Route
              path="/market"
              element={<Market />}
            />

            <Route
              path="/yield"
              element={<YieldPredict />}
            />

            <Route
              path="/community"
              element={<Community />}
            />

            <Route
              path="/feedback"
              element={<Feedback />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

            <Route
              path="/weather"
              element={<Weather />}
            />

            <Route
              path="/simulator"
              element={<WhatIfSimulator />}
            />

            <Route
              path="/smart-alerts"
              element={<SmartAlerts />}
            />

            <Route
              path="/profit-planner"
              element={<ProfitPlanner />}
            />

            <Route
              path="/field-scanner"
              element={<FieldScanner />}
            />

            <Route
              path="/schemes"
              element={<Schemes />}
            />

            <Route
              path="/loans"
              element={<Loans />}
            />

          </Routes>

        </div>

      </main>


      {/* Mobile Navigation */}

      <BottomNav />


      {/* CropMatrix AI Assistant */}

      <Chatbot />

    </div>

  )

}


/* =========================================================
   ROUTER
   ========================================================= */

function AppRouter() {

  return (

    <Routes>

      <Route
        path="/landing"
        element={<Landing />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route

        path="/*"

        element={

          <ProtectedRoute>

            <AppLayout />

          </ProtectedRoute>

        }

      />

    </Routes>

  )

}


/* =========================================================
   CROPMATRIX APP ENTRY
   ========================================================= */

function App() {

  return (

    <BrowserRouter>

      <AuthProvider>

        <LocationProvider>

          <LanguageProvider>

            <AppRouter />

          </LanguageProvider>

        </LocationProvider>

      </AuthProvider>

    </BrowserRouter>

  )

}


export default App