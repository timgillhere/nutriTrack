import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'
import DiaryDay from './components/DiaryDay'
import MacroRing from './components/MacroRing'
import HistoryView from './components/HistoryView'
import ProfileView from './components/ProfileView'
import RecipesView from './components/RecipesView'
import BottomNav from './components/BottomNav'
import ExportModal from './components/ExportModal'
import { pruneSearchCache } from './services/foodApi'

// Prune stale search cache once per session
pruneSearchCache()

export default function App() {
  const { user } = useAuth()
  const [tab, setTab] = useState('diary')
  const [exportOpen, setExportOpen] = useState(false)

  if (user === undefined) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🥗</div>
          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Top bar */}
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <span className="text-2xl">🥗</span>
        <span className="text-lg font-bold text-gray-900 flex-1">NutriTrack</span>
        {tab === 'diary' && (
          <button
            onClick={() => setExportOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            title="Export to AI"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        )}
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 64 }}>
        {tab === 'diary'      && <DiaryDay />}
        {tab === 'recipes'    && <RecipesView />}
        {tab === 'nutrition'  && <MacroRing />}
        {tab === 'history'    && <HistoryView />}
        {tab === 'profile'    && <ProfileView />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  )
}
