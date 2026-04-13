import { useState, useEffect } from 'react'
import { getDiaryEntries } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'

const today = () => new Date().toISOString().slice(0, 10)

function DonutRing({ value, max, color, size = 120, stroke = 12 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, value / (max || 1))
  const dash = pct * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

export default function MacroRing() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getDiaryEntries(user.uid, today())
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [user])

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
  const proteinGoal = profile?.proteinGoal || 150
  const carbsGoal = Math.round((calorieGoal * 0.45) / 4)
  const fatGoal = Math.round((calorieGoal * 0.30) / 9)

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  const macros = [
    { label: 'Protein', value: Math.round(totals.protein), goal: proteinGoal, color: '#3b82f6', unit: 'g' },
    { label: 'Carbs', value: Math.round(totals.carbs), goal: carbsGoal, color: '#eab308', unit: 'g' },
    { label: 'Fat', value: Math.round(totals.fat), goal: fatGoal, color: '#f87171', unit: 'g' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      {/* Calorie ring */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm flex flex-col items-center">
        <p className="text-sm font-medium text-gray-500 mb-4">Calories Today</p>
        <div className="relative">
          <DonutRing value={totals.kcal} max={calorieGoal} color="#22c55e" size={160} stroke={14} />
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <p className="text-3xl font-bold text-gray-900">{totals.kcal}</p>
            <p className="text-sm text-gray-400">of {calorieGoal}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full mt-5">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">{totals.kcal}</p>
            <p className="text-xs text-gray-500">Eaten</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-700">{Math.max(0, calorieGoal - totals.kcal)}</p>
            <p className="text-xs text-gray-500">Remaining</p>
          </div>
        </div>
      </div>

      {/* Macro rings */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
        {macros.map(m => (
          <div key={m.label} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center">
            <div className="relative">
              <DonutRing value={m.value} max={m.goal} color={m.color} size={80} stroke={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-base font-bold" style={{ color: m.color }}>{m.value}</p>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-700 mt-2">{m.label}</p>
            <p className="text-xs text-gray-400">{m.value}/{m.goal}{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Meal breakdown */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
        <p className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-50">Meal Breakdown</p>
        {[
          { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
          { id: 'lunch', label: 'Lunch', emoji: '☀️' },
          { id: 'dinner', label: 'Dinner', emoji: '🌙' },
          { id: 'snacks', label: 'Snacks', emoji: '🍎' },
        ].map(m => {
          const mEntries = entries.filter(e => e.meal === m.id)
          const kcal = mEntries.reduce((s, e) => s + (e.kcal || 0), 0)
          const protein = mEntries.reduce((s, e) => s + (e.protein || 0), 0)
          return (
            <div key={m.id} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-xl mr-3">{m.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{m.label}</p>
                <p className="text-xs text-gray-400">{mEntries.length} items</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">{kcal} kcal</p>
                <p className="text-xs text-blue-400">{Math.round(protein)}g protein</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
