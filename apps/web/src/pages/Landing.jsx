import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import AzureTranslate from '../components/AzureTranslate';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStart = () => navigate(isAuthenticated ? '/' : '/login');

  const features = [
    {
      icon: 'psychology',
      title: 'AI Crop Advisory',
      description:
        'Get intelligent crop recommendations using soil, season, weather and location data.',
    },
    {
      icon: 'document_scanner',
      title: 'Disease Detection',
      description:
        'Scan crop leaves and identify possible diseases with AI-powered analysis.',
    },
    {
      icon: 'cloud',
      title: 'Smart Weather',
      description:
        'Use local weather information and alerts to make better farming decisions.',
    },
    {
      icon: 'trending_up',
      title: 'Market Intelligence',
      description:
        'Track crop prices and market trends before deciding when and where to sell.',
    },
    {
      icon: 'water_drop',
      title: 'Fertilizer Advisor',
      description:
        'Receive fertilizer and nutrient recommendations based on crop requirements.',
    },
    {
      icon: 'query_stats',
      title: 'Yield Prediction',
      description:
        'Estimate expected crop yield and use insights to plan your farming cycle.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#09261f] antialiased">

      {/* ================= NAVBAR ================= */}

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          {/* Brand */}

          <div
            className="flex cursor-pointer items-center gap-3"
            onClick={() => navigate('/landing')}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/10">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                eco
              </span>
            </div>

            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight text-emerald-950">
                CropMatrix
              </div>

              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700/60">
                <AzureTranslate text="AI Farming Intelligence" />
              </div>
            </div>
          </div>

          {/* Desktop links */}

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#home" className="transition hover:text-emerald-600">
              <AzureTranslate text="Home" />
            </a>

            <a href="#features" className="transition hover:text-emerald-600">
              <AzureTranslate text="Features" />
            </a>

            <a href="#how" className="transition hover:text-emerald-600">
              <AzureTranslate text="How it works" />
            </a>

            <a href="#about" className="transition hover:text-emerald-600">
              <AzureTranslate text="About" />
            </a>
          </div>

          {/* Right actions */}

          <div className="flex items-center gap-3">

            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => navigate('/login')}
              className="hidden rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-bold text-emerald-900 transition hover:border-emerald-500 hover:text-emerald-600 sm:inline-flex"
            >
              <AzureTranslate text="Login" />
            </button>

            <button
              onClick={handleStart}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-700"
            >
              <AzureTranslate text="Get Started" />
            </button>

          </div>
        </nav>
      </header>


      <main id="home" className="pt-[76px]">

        {/* ================= HERO ================= */}

        <section className="relative overflow-hidden bg-emerald-950">

          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">

            {/* Hero content */}

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-lime-400" />

                <AzureTranslate text="Intelligence for Indian Agriculture" />
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
                <AzureTranslate text="Farm smarter with" />

                <span className="block bg-gradient-to-r from-emerald-300 to-lime-300 bg-clip-text text-transparent">
                  CropMatrix
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-emerald-50/70 sm:text-lg">
                <AzureTranslate text="One intelligent agriculture platform for crop recommendations, disease detection, weather insights, market intelligence, fertilizer planning and yield prediction." />
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">

                <button
                  onClick={handleStart}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 py-4 text-sm font-black text-emerald-950 transition hover:-translate-y-1 hover:bg-lime-300"
                >
                  <span className="material-symbols-outlined">
                    agriculture
                  </span>

                  <AzureTranslate text="Start Farming Smarter" />
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById('features')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <AzureTranslate text="Explore Features" />

                  <span className="material-symbols-outlined">
                    arrow_downward
                  </span>
                </button>

              </div>


              {/* Trust indicators */}

              <div className="mt-12 flex flex-wrap gap-6 text-sm text-emerald-100/60">

                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">
                    psychology
                  </span>
                  AI Powered
                </div>

                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">
                    translate
                  </span>
                  Multilingual
                </div>

                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">
                    location_on
                  </span>
                  India Focused
                </div>

              </div>
            </div>


            {/* ================= HERO DASHBOARD CARD ================= */}

            <div className="relative">

              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">

                <div className="rounded-[1.6rem] bg-white p-6">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        CROPMATRIX
                      </p>

                      <h3 className="mt-1 text-xl font-black text-slate-900">
                        Farm Intelligence
                      </h3>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <span className="material-symbols-outlined">
                        monitoring
                      </span>
                    </div>

                  </div>


                  <div className="mt-7 grid grid-cols-2 gap-4">

                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <span className="material-symbols-outlined text-emerald-600">
                        partly_cloudy_day
                      </span>

                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Weather
                      </p>

                      <p className="text-lg font-black text-slate-900">
                        Smart Insights
                      </p>
                    </div>


                    <div className="rounded-2xl bg-amber-50 p-4">
                      <span className="material-symbols-outlined text-amber-600">
                        pest_control
                      </span>

                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Crop Health
                      </p>

                      <p className="text-lg font-black text-slate-900">
                        AI Detection
                      </p>
                    </div>


                    <div className="rounded-2xl bg-blue-50 p-4">
                      <span className="material-symbols-outlined text-blue-600">
                        trending_up
                      </span>

                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Market
                      </p>

                      <p className="text-lg font-black text-slate-900">
                        Price Trends
                      </p>
                    </div>


                    <div className="rounded-2xl bg-lime-50 p-4">
                      <span className="material-symbols-outlined text-lime-700">
                        psychiatry
                      </span>

                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Advisory
                      </p>

                      <p className="text-lg font-black text-slate-900">
                        Personalized
                      </p>
                    </div>

                  </div>


                  <div className="mt-5 rounded-2xl bg-emerald-950 p-5 text-white">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
                        <span className="material-symbols-outlined">
                          auto_awesome
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-emerald-200">
                          CropMatrix Intelligence
                        </p>

                        <p className="font-bold">
                          Better data. Better decisions.
                        </p>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>


        {/* ================= FEATURES ================= */}

        <section
          id="features"
          className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
        >

          <div className="mx-auto max-w-3xl text-center">

            <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-600">
              <AzureTranslate text="CropMatrix Intelligence" />
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-emerald-950 sm:text-5xl">
              <AzureTranslate text="One platform for the complete farming cycle" />
            </h2>

            <p className="mt-5 text-base leading-8 text-slate-500">
              <AzureTranslate text="Transform agricultural data into practical decisions farmers can understand and use." />
            </p>

          </div>


          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

            {features.map((feature) => (

              <article
                key={feature.title}
                className="group rounded-[1.75rem] border border-emerald-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >

                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">

                  <span className="material-symbols-outlined text-2xl">
                    {feature.icon}
                  </span>

                </div>

                <h3 className="mt-6 text-xl font-black text-emerald-950">
                  <AzureTranslate text={feature.title} />
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  <AzureTranslate text={feature.description} />
                </p>

              </article>

            ))}

          </div>
        </section>


        {/* ================= HOW IT WORKS ================= */}

        <section
          id="how"
          className="border-y border-emerald-100 bg-white py-24"
        >

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="text-center">

              <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-600">
                <AzureTranslate text="How CropMatrix Works" />
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
                <AzureTranslate text="From farm data to better decisions" />
              </h2>

            </div>


            <div className="mt-14 grid gap-6 md:grid-cols-3">

              {[
                {
                  number: '01',
                  icon: 'add_location_alt',
                  title: 'Add Farm Information',
                  text: 'Provide your location, soil conditions, crop and farming details.',
                },

                {
                  number: '02',
                  icon: 'model_training',
                  title: 'AI Analysis',
                  text: 'CropMatrix analyzes your data using machine learning and agricultural intelligence.',
                },

                {
                  number: '03',
                  icon: 'task_alt',
                  title: 'Take Better Action',
                  text: 'Receive understandable recommendations, predictions and alerts.',
                },
              ].map((step) => (

                <div
                  key={step.number}
                  className="relative rounded-[2rem] bg-[#f7faf8] p-8"
                >

                  <span className="absolute right-7 top-5 text-5xl font-black text-emerald-900/5">
                    {step.number}
                  </span>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">

                    <span className="material-symbols-outlined">
                      {step.icon}
                    </span>

                  </div>

                  <h3 className="mt-6 text-xl font-black text-emerald-950">
                    <AzureTranslate text={step.title} />
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    <AzureTranslate text={step.text} />
                  </p>

                </div>

              ))}

            </div>

          </div>
        </section>


        {/* ================= ABOUT ================= */}

        <section
          id="about"
          className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
        >

          <div className="overflow-hidden rounded-[2.5rem] bg-emerald-950 px-6 py-14 text-white sm:px-12 lg:px-16">

            <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_0.6fr]">

              <div>

                <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                  CROPMATRIX
                </p>

                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                  <AzureTranslate text="Intelligence from sowing to selling." />
                </h2>

                <p className="mt-5 max-w-2xl leading-8 text-emerald-100/70">
                  <AzureTranslate text="CropMatrix brings crop intelligence, disease analysis, weather, market information and farm planning together into one farmer-friendly platform." />
                </p>

              </div>


              <div className="lg:text-right">

                <button
                  onClick={handleStart}
                  className="rounded-full bg-emerald-400 px-8 py-4 font-black text-emerald-950 transition hover:bg-lime-300"
                >
                  <AzureTranslate text="Launch CropMatrix" />
                </button>

              </div>

            </div>

          </div>
        </section>


        {/* ================= FOOTER ================= */}

        <footer className="border-t border-emerald-100 bg-white">

          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row lg:px-8">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">

                <span className="material-symbols-outlined text-lg">
                  eco
                </span>

              </div>

              <div>
                <p className="font-black text-emerald-950">
                  CropMatrix
                </p>

                <p className="text-xs text-slate-400">
                  AI-Powered Smart Agriculture Platform
                </p>
              </div>

            </div>


            <p className="text-center text-xs text-slate-400">
              CropMatrix • Smarter Agriculture Through Intelligence
            </p>

          </div>

        </footer>

      </main>
    </div>
  );
}