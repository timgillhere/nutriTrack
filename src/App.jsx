import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'
import DiaryDay from './components/DiaryDay'
import MacroRing from './components/MacroRing'
import HistoryView from './components/HistoryView'
import ProfileView from './components/ProfileView'
import BottomNav from './components/BottomNav'

export default function App() {
  const { user } = useAuth()
  const [tab, setTab] = useState('diary')

  // Still loading auth state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🥗</div>
          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-white shadow-xl">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
        <span className="text-2xl">🥗</span>
        <span className="text-lg font-bold text-gray-900">NutriTrack</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {tab === 'diary'     && <DiaryDay />}
        {tab === 'nutrition' && <MacroRing />}
        {tab === 'history'   && <HistoryView />}
        {tab === 'profile'   && <ProfileView />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
