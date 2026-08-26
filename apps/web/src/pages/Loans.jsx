import AzureTranslate from '../components/AzureTranslate'

const FEATURES = [
  { icon: 'money_off', title: '0% Interest', desc: 'No interest charged to farmers', color: 'bg-emerald-100 text-emerald-700' },
  { icon: 'smartphone', title: 'Easy Apply', desc: 'Simple mobile-first application', color: 'bg-blue-100 text-blue-700' },
  { icon: 'grass', title: 'Farm Essentials', desc: 'Seeds, fertilizer, sprays & tools', color: 'bg-amber-100 text-amber-700' },
  { icon: 'bolt', title: 'Quick Processing', desc: 'Fast approval, minimal paperwork', color: 'bg-purple-100 text-purple-700' },
]

const PURPOSES = [
  { emoji: '🌾', label: 'Seeds', amount: '₹1,000–₹5,000' },
  { emoji: '🧪', label: 'Fertilizer', amount: '₹2,000–₹10,000' },
  { emoji: '💊', label: 'Pesticides', amount: '₹1,000–₹8,000' },
  { emoji: '🔧', label: 'Small Equipment', amount: '₹5,000–₹25,000' },
]

export default function Loans() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
          <AzureTranslate text="Farmer Loans" /> 🌾
        </h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1">
          <AzureTranslate text="Small, interest-free loans for urgent farm needs" />
        </p>
      </div>

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-8 text-white text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-bold mb-5">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <AzureTranslate text="COMING SOON" />
          </div>

          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl mb-2">
            <AzureTranslate text="0% Interest Loans" />
          </h2>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-6">
            <AzureTranslate text="Small loans designed for farmers — for seeds, fertilizer, and urgent farm expenses. No interest, no hidden fees." />
          </p>

          <div className="flex items-center justify-center gap-6">
            <div>
              <div className="font-headline font-extrabold text-3xl">₹1K</div>
              <div className="text-white/50 text-xs uppercase tracking-wider"><AzureTranslate text="Min" /></div>
            </div>
            <div className="flex-1 max-w-[200px] h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-white/60 rounded-full" />
            </div>
            <div>
              <div className="font-headline font-extrabold text-3xl">₹25K</div>
              <div className="text-white/50 text-xs uppercase tracking-wider"><AzureTranslate text="Max" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl editorial-shadow p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center flex-shrink-0`}>
              <span className="material-symbols-outlined text-lg">{f.icon}</span>
            </div>
            <div>
              <h4 className="font-headline font-bold text-sm text-on-surface"><AzureTranslate text={f.title} /></h4>
              <p className="font-label text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed"><AzureTranslate text={f.desc} /></p>
            </div>
          </div>
        ))}
      </div>

      {/* Loan Purposes */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 bg-surface-container-low">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">category</span>
            <AzureTranslate text="What You Can Use It For" />
          </h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {PURPOSES.map((p, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-4 text-center">
              <span className="text-3xl block mb-2">{p.emoji}</span>
              <div className="font-headline font-bold text-sm text-on-surface"><AzureTranslate text={p.label} /></div>
              <div className="font-label text-xs text-primary font-bold mt-1">{p.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-5 bg-surface-container-low">
          <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">route</span>
            <AzureTranslate text="How It Will Work" />
          </h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {[
              { step: 1, icon: 'person', title: 'Verify Identity', desc: 'Simple Aadhaar-based verification' },
              { step: 2, icon: 'edit_note', title: 'Choose Amount', desc: 'Select how much you need (₹1K–₹25K)' },
              { step: 3, icon: 'verified', title: 'Quick Approval', desc: 'Instant eligibility check and approval' },
              { step: 4, icon: 'account_balance', title: 'Direct Transfer', desc: 'Money sent directly to your bank account' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                  <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                  {i < 3 && <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4 bg-primary/20" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-label text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{s.step}</span>
                    <h4 className="font-headline font-bold text-sm text-on-surface"><AzureTranslate text={s.title} /></h4>
                  </div>
                  <p className="font-label text-xs text-on-surface-variant/60 mt-0.5 ml-7"><AzureTranslate text={s.desc} /></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming Soon CTA */}
      <div className="bg-gradient-to-r from-surface-container-low to-surface-container rounded-2xl p-6 text-center ring-1 ring-primary/10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary text-3xl">notifications_active</span>
        </div>
        <h3 className="font-headline font-extrabold text-xl text-on-surface mb-2">
          <AzureTranslate text="Launching Soon" />
        </h3>
        <p className="text-sm text-on-surface-variant/60 max-w-md mx-auto mb-5">
          <AzureTranslate text="We're partnering with banks and financial institutions to bring zero-interest micro-loans directly to farmers. Stay tuned!" />
        </p>
        <button disabled
          className="px-8 py-3.5 bg-primary/40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mx-auto cursor-not-allowed">
          <span className="material-symbols-outlined text-sm">lock</span>
          <AzureTranslate text="Apply Now — Coming Soon" />
        </button>
        <p className="font-label text-[10px] text-on-surface-variant/40 mt-3">
          <AzureTranslate text="No data is collected. This feature is under development." />
        </p>
      </div>

      {/* Trust Section */}
      <div className="bg-white rounded-2xl editorial-shadow p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary">shield</span>
        </div>
        <div>
          <h4 className="font-headline font-bold text-on-surface mb-1"><AzureTranslate text="Built for Farmers" /></h4>
          <ul className="space-y-1.5 font-label text-sm text-on-surface-variant/60 leading-relaxed list-disc pl-5">
            <li><AzureTranslate text="Zero interest — the farmer never pays interest" /></li>
            <li><AzureTranslate text="Revenue comes from lender partnerships, not from farmers" /></li>
            <li><AzureTranslate text="Simple process — designed for rural mobile users" /></li>
            <li><AzureTranslate text="Transparent — no hidden charges, no surprises" /></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
