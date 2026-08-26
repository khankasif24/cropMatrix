import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import AzureTranslate from '../components/AzureTranslate'

export default function Login() {
  const {
    login,
    register,
    loginWithGoogle,
    googleLoading,
    isAuthenticated
  } = useAuth()

  const navigate = useNavigate()

  const [isRegister, setIsRegister] = useState(false)

  const [form, setForm] = useState({
    phone: '',
    password: '',
    name: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        if (!form.name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }

        await register(
          form.phone,
          form.password,
          form.name
        )
      } else {
        await login(
          form.phone,
          form.password
        )
      }

      navigate('/')
    } catch (err) {
      setError(
        err.message ||
        'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')

    try {
      await loginWithGoogle()
    } catch (err) {
      setError(
        err.message ||
        'Google login failed'
      )
    }
  }

  return (
    <div className="min-h-screen flex bg-surface">

      {/* =====================================================
          LEFT HERO PANEL
      ===================================================== */}

      <div className="hidden lg:flex flex-1 relative overflow-hidden">

        {/* Agriculture Background */}

        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80"
          alt="Agricultural field"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay */}

        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-900/85 to-emerald-700/80" />


        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* =================================================
              CROPMATRIX BRAND
          ================================================= */}

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">

              <span
                className="material-symbols-outlined text-white text-2xl"
                style={{
                  fontVariationSettings: "'FILL' 1"
                }}
              >
                eco
              </span>

            </div>


            <div>

              <h1 className="font-headline font-extrabold text-white text-xl tracking-tight">
                CropMatrix
              </h1>

              <p className="font-label text-[10px] text-white/60 uppercase tracking-[0.15em]">
                <AzureTranslate text="AI Farming Intelligence" />
              </p>

            </div>

          </div>


          {/* =================================================
              HERO CONTENT
          ================================================= */}

          <div className="space-y-6 max-w-lg">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100">

              <span className="w-2 h-2 rounded-full bg-lime-300" />

              <AzureTranslate text="Smart Agriculture Platform" />

            </div>


            <h2 className="font-headline font-extrabold text-5xl text-white leading-tight tracking-tight">

              <AzureTranslate text="Smarter Farming" />

              <br />

              <span className="text-lime-300">
                <AzureTranslate text="Powered by AI" />
              </span>

              <br />

              <AzureTranslate text="Built for Bharat" />

            </h2>


            <p className="text-white/70 text-base leading-relaxed">

              <AzureTranslate text="CropMatrix combines AI crop advisory, disease detection, weather intelligence, yield prediction and market insights in one powerful farming platform." />

            </p>

          </div>


          {/* =================================================
              FEATURE CARDS
          ================================================= */}

          <div className="grid grid-cols-2 gap-4 max-w-lg">

            {[
              {
                icon: 'query_stats',
                title: 'Yield Prediction',
                desc: 'ML-powered forecasting'
              },

              {
                icon: 'psychology',
                title: 'AI Advisory',
                desc: 'Smart crop recommendations'
              },

              {
                icon: 'trending_up',
                title: 'Market Intelligence',
                desc: 'Crop price insights'
              },

              {
                icon: 'document_scanner',
                title: 'Disease Detection',
                desc: 'AI crop health analysis'
              }

            ].map((feature, i) => (

              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 hover:bg-white/15 transition-colors border border-white/5"
              >

                <span className="material-symbols-outlined text-emerald-200 text-xl mb-2 block">
                  {feature.icon}
                </span>

                <h3 className="font-headline font-bold text-white text-sm">
                  <AzureTranslate text={feature.title} />
                </h3>

                <p className="font-label text-[11px] text-white/50 mt-0.5">
                  <AzureTranslate text={feature.desc} />
                </p>

              </div>

            ))}

          </div>

        </div>

      </div>


      {/* =====================================================
          RIGHT LOGIN PANEL
      ===================================================== */}

      <div className="flex-1 lg:max-w-[520px] flex items-center justify-center p-6 md:p-12 bg-white relative">


        {/* Language */}

        <div className="absolute top-4 right-4 z-10 hidden sm:block">
          <LanguageSwitcher />
        </div>


        <div className="w-full max-w-[380px]">


          {/* =================================================
              MOBILE CROPMATRIX LOGO
          ================================================= */}

          <div className="lg:hidden flex items-center gap-3 mb-10">

            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">

              <span
                className="material-symbols-outlined text-primary text-2xl"
                style={{
                  fontVariationSettings: "'FILL' 1"
                }}
              >
                eco
              </span>

            </div>


            <div>

              <h1 className="font-headline font-extrabold text-primary text-xl tracking-tight">
                CropMatrix
              </h1>

              <p className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-[0.15em]">
                <AzureTranslate text="AI Farming Intelligence" />
              </p>

            </div>

          </div>


          {/* =================================================
              FORM HEADING
          ================================================= */}

          <div className="mb-8">

            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">

              {isRegister ? (
                <>
                  <AzureTranslate text="Create Account" /> 👋
                </>
              ) : (
                <>
                  <AzureTranslate text="Welcome Back" /> 👋
                </>
              )}

            </h2>


            <p className="text-sm text-on-surface-variant/60 mt-2 leading-relaxed">

              {isRegister
                ? (
                  <AzureTranslate text="Join CropMatrix and unlock intelligent farming tools" />
                )
                : (
                  <AzureTranslate text="Login to your CropMatrix farming intelligence dashboard" />
                )
              }

            </p>

          </div>


          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (

            <div className="bg-error-container/30 text-on-error-container p-3.5 rounded-2xl text-sm mb-5 flex items-center gap-2.5 animate-fade-in">

              <span className="material-symbols-outlined text-error text-lg">
                error
              </span>

              <span className="text-[13px]">
                {error}
              </span>

            </div>

          )}


          {/* =================================================
              GOOGLE LOGIN
          ================================================= */}

          <button
            id="google-login-btn"
            className="w-full py-3.5 px-4 rounded-2xl bg-surface-container-low text-on-surface text-sm font-semibold flex items-center justify-center gap-3 hover:bg-surface-container transition-all disabled:opacity-50"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            type="button"
          >

            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
            >

              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />

              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />

              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />

              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />

            </svg>


            <span>

              {googleLoading
                ? <AzureTranslate text="Redirecting..." />
                : <AzureTranslate text="Continue with Google" />
              }

            </span>

          </button>


          {/* =================================================
              DIVIDER
          ================================================= */}

          <div className="flex items-center gap-4 my-6">

            <span className="flex-1 h-px bg-surface-container-high" />

            <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-bold">
              <AzureTranslate text="or" />
            </span>

            <span className="flex-1 h-px bg-surface-container-high" />

          </div>


          {/* =================================================
              LOGIN / REGISTER FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >


            {/* Name */}

            {isRegister && (

              <div className="space-y-1.5">

                <label className="font-label text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
                  <AzureTranslate text="Full Name" />
                </label>

                <input
                  id="name-input"
                  type="text"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      name: e.target.value
                    }))
                  }
                  autoComplete="name"
                  className="w-full py-3.5 px-4 rounded-2xl bg-surface-container-highest text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/30 transition-all"
                />

              </div>

            )}


            {/* Phone */}

            <div className="space-y-1.5">

              <label className="font-label text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
                <AzureTranslate text="Phone Number" />
              </label>

              <input
                id="phone-input"
                type="tel"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    phone: e.target.value
                  }))
                }
                autoComplete="tel"
                required
                className="w-full py-3.5 px-4 rounded-2xl bg-surface-container-highest text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/30 transition-all"
              />

            </div>


            {/* Password */}

            <div className="space-y-1.5">

              <label className="font-label text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
                <AzureTranslate text="Password" />
              </label>

              <input
                id="password-input"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    password: e.target.value
                  }))
                }
                autoComplete={
                  isRegister
                    ? 'new-password'
                    : 'current-password'
                }
                required
                className="w-full py-3.5 px-4 rounded-2xl bg-surface-container-highest text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/30 transition-all"
              />

            </div>


            {/* Submit */}

            <button
              id="submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-container hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >

              {loading ? (

                <>

                  <div className="spinner-sm !border-white/30 !border-t-white" />

                  <AzureTranslate text="Please wait..." />

                </>

              ) : isRegister ? (

                <>

                  <span className="material-symbols-outlined text-lg">
                    person_add
                  </span>

                  <AzureTranslate text="Create CropMatrix Account" />

                </>

              ) : (

                <>

                  <span className="material-symbols-outlined text-lg">
                    login
                  </span>

                  <AzureTranslate text="Login to CropMatrix" />

                </>

              )}

            </button>

          </form>


          {/* =================================================
              LOGIN / REGISTER SWITCH
          ================================================= */}

          <div className="mt-8 text-center">

            <span className="text-sm text-on-surface-variant/40">

              {isRegister
                ? <AzureTranslate text="Already have an account? " />
                : <AzureTranslate text="Don't have an account? " />
              }

            </span>


            <button
              id="toggle-auth-mode"
              className="text-primary font-bold text-sm hover:underline"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
            >

              {isRegister
                ? <AzureTranslate text="Login" />
                : <AzureTranslate text="Register" />
              }

            </button>

          </div>


          {/* =================================================
              TRUST INDICATORS
          ================================================= */}

          <div className="mt-10 flex items-center justify-center gap-6">

            {[
              {
                icon: 'lock',
                label: 'Secured'
              },

              {
                icon: 'sync',
                label: 'Sync Ready'
              },

              {
                icon: 'agriculture',
                label: 'Farmer First'
              }

            ].map((badge, i) => (

              <div
                key={i}
                className="flex items-center gap-1.5 text-on-surface-variant/30"
              >

                <span className="material-symbols-outlined text-sm">
                  {badge.icon}
                </span>

                <span className="font-label text-[10px] font-bold uppercase tracking-wider">
                  {badge.label}
                </span>

              </div>

            ))}

          </div>


          {/* =================================================
              BACK TO LANDING
          ================================================= */}

          <div className="mt-7 text-center">

            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant/40 hover:text-primary transition-colors"
            >

              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>

              <AzureTranslate text="Back to CropMatrix" />

            </button>

          </div>

        </div>

      </div>

    </div>
  )
}