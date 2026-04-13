import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveUserProfile, logOut } from '../services/firebase'

export default function ProfileView() {
  const { user, profile, refreshProfile } = useAuth()
  const [calorieGoal, setCalorieGoal] = useState(String(profile?.calorieGoal || 2000))
  const [proteinGoal, setProteinGoal] = useState(String(profile?.proteinGoal || 150))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await saveUserProfile(user.uid, {
      calorieGoal: parseInt(calorieGoal) || 2000,
      proteinGoal: parseInt(proteinGoal) || 150,
    })
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-6 text-center border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-2">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" />
          ) : '👤'}
        </div>
        <p className="font-semibold text-gray-900">{user?.displayName || user?.email}</p>
        <p className="text-sm text-gray-400">{user?.email}</p>
      </div>

      {/* Goals form */}
      <form onSubmit={handleSave} className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Daily Goals</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-600 mb-1 block">Calorie target (kcal)</span>
            <input
              type="number"
              value={calorieGoal}
              onChange={e => setCalorieGoal(e.target.value)}
              min="500"
              max="5000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600 mb-1 block">Protein target (g)</span>
            <input
              type="number"
              value={proteinGoal}
              onChange={e => setProteinGoal(e.target.value)}
              min="30"
              max="500"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className={`w-full mt-4 font-semibold rounded-xl py-3 transition-colors ${
            saved
              ? 'bg-green-100 text-green-600'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } disabled:opacity-50`}
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Goals'}
        </button>
      </form>

      {/* Tips */}
      <div className="mx-4 mt-3 bg-green-50 rounded-2xl p-4">
        <p className="text-sm font-semibold text-green-800 mb-2">Goal guidance</p>
        <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
          <li>For fat loss: 300–500 kcal below your maintenance</li>
          <li>For muscle building: 1.6–2.2g protein per kg of bodyweight</li>
          <li>A gradual approach (0.5–1% body weight/week) preserves muscle</li>
        </ul>
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-3">
        <button
          onClick={logOut}
          className="w-full border border-gray-200 text-gray-600 font-medium rounded-2xl py-3 hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
