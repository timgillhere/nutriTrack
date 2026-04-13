import { useState, useEffect, useCallback } from 'react'
import { getDiaryEntries, deleteDiaryEntry } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import AddFoodSheet from './AddFoodSheet'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

const fmt = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

const today = () => new Date().toISOString().slice(0, 10)

export default function DiaryDay() {
  const { user, profile } = useAuth()
  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingMeal, setAddingMeal] = useState(null) // meal id when sheet open

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getDiaryEntries(user.uid, date)
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }, [user, date])

  useEffect(() => { load() }, [load])

  const handleDelete = async (entryId) => {
    await deleteDiaryEntry(user.uid, date, entryId)
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  const handleAdded = (newEntry) => {
    setEntries(prev => [...prev, newEntry])
    setAddingMeal(null)
  }

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + (e.kcal || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calorieGoal = profile?.calorieGoal || 2000
  const caloriePct = Math.min(100, Math.round((totals.kcal / calorieGoal) * 100))

  const changeDate = (delta) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().slice(0, 10))
  }

  const dateObj = new Date(date + 'T12:00:00')
  const isToday = date === today()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Date nav */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900">{isToday ? 'Today' : fmt(dateObj)}</p>
          {!isToday && <p className="text-xs text-gray-400">{dateObj.toLocaleDateString('en-GB')}</p>}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Calorie summary bar */}
      <div className="bg-white px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {totals.kcal} <span className="text-gray-400 font-normal">/ {calorieGoal} kcal</span>
          </span>
          <span className="text-sm font-medium text-green-600">{calorieGoal - totals.kcal} left</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${caloriePct >= 100 ? 'bg-red-400' : 'bg-green-400'}`}
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Protein', value: Math.round(totals.protein), unit: 'g', color: 'text-blue-500' },
            { label: 'Carbs', value: Math.round(totals.carbs), unit: 'g', color: 'text-yellow-500' },
            { label: 'Fat', value: Math.round(totals.fat), unit: 'g', color: 'text-red-400' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className={`text-sm font-semibold ${m.color}`}>{m.value}{m.unit}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meal sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          MEALS.map(m => {
            const mealEntries = entries.filter(e => e.meal === m.id)
            const mealKcal = mealEntries.reduce((s, e) => s + (e.kcal || 0), 0)
            return (
              <div key={m.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{m.emoji}</span>
                    <span className="font-semibold text-gray-800">{m.label}</span>
                    {mealKcal > 0 && (
                      <span className="text-xs text-gray-400">{mealKcal} kcal</span>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingMeal(m.id)}
                    className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 active:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                    </svg>
                  </button>
                </div>
                {mealEntries.length === 0 ? (
                  <button
                    onClick={() => setAddingMeal(m.id)}
                    className="w-full px-4 py-4 text-sm text-gray-300 text-left hover:bg-gray-50 transition-colors"
                  >
                    Tap + to add food…
                  </button>
                ) : (
                  mealEntries.map(entry => (
                    <FoodRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
                  ))
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add food sheet */}
      {addingMeal && (
        <AddFoodSheet
          defaultMeal={addingMeal}
          date={date}
          onAdded={handleAdded}
          onClose={() => setAddingMeal(null)}
        />
      )}
    </div>
  )
}

function FoodRow({ entry, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{entry.foodName}</p>
        <p className="text-xs text-gray-400">{entry.servingSize}g</p>
      </div>
      <div className="text-right mr-4">
        <p className="text-sm font-semibold text-gray-700">{entry.kcal} kcal</p>
        <p className="text-xs text-blue-400">{entry.protein}g protein</p>
      </div>
      {confirming ? (
        <div className="flex gap-1">
          <button onClick={() => { onDelete(); setConfirming(false) }} className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg bg-red-50">Delete</button>
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 px-2 py-1">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      )}
    </div>
  )
}
