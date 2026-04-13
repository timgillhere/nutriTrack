import { useState, useEffect } from 'react'
import { getDiaryEntries } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

const isoDate = (d) => d.toISOString().slice(0, 10)
const today = () => isoDate(new Date())

// Build an array of the past N days
function buildWeekDays(anchorDate, count = 7) {
  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchorDate + 'T12:00:00')
    d.setDate(d.getDate() - i)
    days.push(isoDate(d))
  }
  return days
}

export default function HistoryView() {
  const { user, profile } = useAuth()
  const [selected, setSelected] = useState(today())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const days = buildWeekDays(today(), 7)
  const calorieGoal = profile?.calorieGoal || 2000

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getDiaryEntries(user.uid, selected)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [user, selected])

  const totals = entries.reduce(
    (acc, e) => ({ kcal: acc.kcal + (e.kcal || 0), protein: acc.protein + (e.protein || 0) }),
    { kcal: 0, protein: 0 }
  )

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Week strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Past 7 Days</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map(d => {
            const dateObj = new Date(d + 'T12:00:00')
            const isToday = d === today()
            const isSelected = d === selected
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={`flex flex-col items-center min-w-[48px] py-2 px-1 rounded-xl transition-colors ${
                  isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>
                  {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span className={`text-base font-semibold ${isSelected ? 'text-white' : isToday ? 'text-green-500' : 'text-gray-800'}`}>
                  {dateObj.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day summary */}
      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-2xl font-bold text-gray-900">{totals.kcal} kcal</p>
          <p className="text-sm text-blue-500">{Math.round(totals.protein)}g protein</p>
        </div>
        <div className="relative w-16 h-16">
          <svg width="64" height="64" className="-rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={totals.kcal >= calorieGoal ? '#f87171' : '#22c55e'}
              strokeWidth="8"
              strokeDasharray={`${Math.min(1, totals.kcal / calorieGoal) * 163.4} 163.4`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">
              {Math.round((totals.kcal / calorieGoal) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-gray-400 text-sm">No entries for this day</p>
          </div>
        ) : (
          MEALS.map(m => {
            const mealEntries = entries.filter(e => e.meal === m.id)
            if (!mealEntries.length) return null
            return (
              <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center px-4 py-2.5 border-b border-gray-50">
                  <span className="text-lg mr-2">{m.emoji}</span>
                  <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
                </div>
                {mealEntries.map(e => (
                  <div key={e.id} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.foodName}</p>
                      <p className="text-xs text-gray-400">{e.servingSize}g</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">{e.kcal} kcal</p>
                      <p className="text-xs text-blue-400">{e.protein}g P</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
