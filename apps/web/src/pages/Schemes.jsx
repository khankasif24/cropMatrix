import { useState, useMemo } from 'react'
import AzureTranslate from '../components/AzureTranslate'
import schemesData from '../data/schemes.json'

const CATEGORIES = ['All', 'Income Support', 'Insurance', 'Credit', 'Infrastructure', 'Solar', 'Market', 'Soil', 'Organic', 'Equipment', 'Sustainability']

const CATEGORY_COLORS = {
  'Income Support': 'bg-emerald-100 text-emerald-700',
  'Insurance': 'bg-blue-100 text-blue-700',
  'Credit': 'bg-amber-100 text-amber-700',
  'Infrastructure': 'bg-purple-100 text-purple-700',
  'Solar': 'bg-yellow-100 text-yellow-700',
  'Market': 'bg-cyan-100 text-cyan-700',
  'Soil': 'bg-orange-100 text-orange-700',
  'Organic': 'bg-green-100 text-green-700',
  'Equipment': 'bg-red-100 text-red-700',
  'Sustainability': 'bg-teal-100 text-teal-700',
}

export default function Schemes() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    return schemesData.filter(s => {
      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [search, selectedCategory])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">
          <AzureTranslate text="Government Schemes" /> 🏛️
        </h1>
        <p className="font-label text-sm text-on-surface-variant/60 mt-1">
          <AzureTranslate text="Discover benefits, check eligibility, and apply directly to official portals" />
        </p>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl editorial-shadow p-4 space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search schemes..."
            className="w-full bg-surface-container-highest rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => c === 'All' || schemesData.some(s => s.category === c)).map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}>
              {cat === 'All' ? '🏛️ All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-lg mt-0.5">verified</span>
        <div>
          <p className="font-headline font-bold text-sm text-on-surface"><AzureTranslate text="Official Government Portals Only" /></p>
          <p className="font-label text-xs text-on-surface-variant/60 mt-1">
            <AzureTranslate text="All links direct to official government websites. Fasal.AI does not process applications — we help you discover and access schemes." />
          </p>
        </div>
      </div>

      {/* Scheme Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-4">search_off</span>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-1"><AzureTranslate text="No schemes found" /></h3>
          <p className="text-sm text-on-surface-variant/60"><AzureTranslate text="Try a different search term or category" /></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(scheme => {
            const isExpanded = expandedId === scheme.id
            return (
              <div key={scheme.id} className="bg-white rounded-2xl editorial-shadow overflow-hidden flex flex-col hover:-translate-y-0.5 transition-all">
                {/* Card Header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{scheme.emoji}</span>
                      <div>
                        <h3 className="font-headline font-extrabold text-base text-on-surface leading-tight">{scheme.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[scheme.category] || 'bg-surface-container text-on-surface-variant'}`}>
                          {scheme.category}
                        </span>
                      </div>
                    </div>
                    <span className="smart-chip bg-primary/10 text-primary text-[9px]">
                      <span className="material-symbols-outlined text-[10px]">verified</span> Official
                    </span>
                  </div>

                  <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-3">
                    <AzureTranslate text={scheme.description} />
                  </p>

                  {/* Eligibility */}
                  <div className="bg-surface-container-low rounded-xl p-3 mb-3">
                    <div className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1">
                      <AzureTranslate text="Eligibility" />
                    </div>
                    <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                      <AzureTranslate text={scheme.eligibility} />
                    </p>
                  </div>

                  {/* Expandable details */}
                  <button onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
                    className="text-primary text-xs font-bold flex items-center gap-1 hover:underline mb-3">
                    <span className="material-symbols-outlined text-sm">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                    <AzureTranslate text={isExpanded ? 'Show Less' : 'View Benefits & Documents'} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Benefits */}
                      <div>
                        <div className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1.5">
                          <AzureTranslate text="Benefits" />
                        </div>
                        <ul className="space-y-1">
                          {scheme.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-on-surface-variant/70">
                              <span className="material-symbols-outlined text-primary text-xs mt-0.5">check_circle</span>
                              <AzureTranslate text={b} />
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Documents */}
                      <div>
                        <div className="font-label text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-1.5">
                          <AzureTranslate text="Required Documents" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {scheme.documents.map((d, i) => (
                            <span key={i} className="smart-chip bg-surface-container-low text-on-surface-variant text-[10px]">
                              <span className="material-symbols-outlined text-[10px]">description</span>
                              <AzureTranslate text={d} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-4 pt-0 flex gap-2">
                  <a href={scheme.apply_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-colors text-sm shadow-sm shadow-primary/20">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <AzureTranslate text="Apply Now" />
                  </a>
                  {scheme.check_status && (
                    <a href={scheme.check_status} target="_blank" rel="noopener noreferrer"
                      className="py-3 px-4 bg-surface-container-low text-on-surface-variant font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-surface-container transition-colors text-sm">
                      <span className="material-symbols-outlined text-sm">fact_check</span>
                      <AzureTranslate text="Status" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="bg-surface-container-low rounded-2xl p-4 font-label text-xs text-on-surface-variant/50 text-center">
        <AzureTranslate text="Information sourced from official government portals. Scheme details may change — always verify on the official website before applying." />
      </div>
    </div>
  )
}
