import { useState } from 'react'
import FoodSearch from './FoodSearch'
import AddFoodModal from './AddFoodModal'
import { addDiaryEntry } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'

export default function AddFoodSheet({ defaultMeal, date, onAdded, onClose }) {
  const { user } = useAuth()
  const [selectedFood, setSelectedFood] = useState(null)

  const handleAdd = async (entry) => {
    const id = await addDiaryEntry(user.uid, date, entry)
    onAdded({ id, ...entry })
  }

  if (selectedFood) {
    return (
      <AddFoodModal
        food={selectedFood}
        defaultMeal={defaultMeal}
        onAdd={handleAdd}
        onClose={() => setSelectedFood(null)}
      />
    )
  }

  return (
    // Full-screen overlay on mobile — no partial sheet so keyboard doesn't hide content
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header — always visible, never scrolls */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">Add Food</h2>
      </div>

      {/* Search fills rest of screen */}
      <div className="flex-1 overflow-hidden flex flex-col pt-3">
        <FoodSearch onSelect={setSelectedFood} />
      </div>
    </div>
  )
}
