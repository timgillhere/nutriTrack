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
    // Full-screen fixed container so the app never overflows the viewport
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Top bar */}
      <header className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <span className="text-2xl">🥗</span>
        <span className="text-lg font-bold text-gray-900">NutriTrack</span>
      </header>

      {/* Scrollable content — leaves room for fixed bottom nav (64px) + safe area */}
      <main className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 64 }}>
        {tab === 'diary'     && <DiaryDay />}
        {tab === 'nutrition' && <MacroRing />}
        {tab === 'history'   && <HistoryView />}
        {tab === 'profile'   && <ProfileView />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
