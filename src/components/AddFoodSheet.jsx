import { useState } from 'react'
import BarcodeScanner from './BarcodeScanner'
import FoodSearch from './FoodSearch'
import AddFoodModal from './AddFoodModal'
import { fetchByBarcode } from '../services/foodApi'
import { addDiaryEntry } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'

export default function AddFoodSheet({ defaultMeal, date, onAdded, onClose }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('search')
  const [scanning, setScanning] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const [scanError, setScanError] = useState('')
  const [scanLoading, setScanLoading] = useState(false)

  const handleBarcode = async (barcode) => {
    setScanning(false)
    setScanLoading(true)
    setScanError('')
    try {
      const food = await fetchByBarcode(barcode)
      setSelectedFood(food)
    } catch {
      setScanError(`Product not found for barcode ${barcode}. Try searching by name instead.`)
    } finally {
      setScanLoading(false)
    }
  }

  const handleAdd = async (entry) => {
    const id = await addDiaryEntry(user.uid, date, entry)
    onAdded({ id, ...entry })
  }

  if (scanning) {
    return <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
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

      {/* Tabs — always visible */}
      <div className="shrink-0 flex gap-2 px-4 py-3">
        <button
          onClick={() => setTab('search')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'search' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => { setTab('scan'); setScanError('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'scan' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          📷 Scan Barcode
        </button>
      </div>

      {/* Content fills rest of screen */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'search' && (
          <FoodSearch onSelect={setSelectedFood} />
        )}

        {tab === 'scan' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {scanLoading ? (
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Looking up product…</p>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mb-5">
                  <BarcodeIcon />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Scan a barcode</h3>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Use your camera to scan the barcode on the product packaging
                </p>
                {scanError && (
                  <p className="text-red-500 text-sm text-center mb-4 bg-red-50 rounded-xl px-4 py-3">{scanError}</p>
                )}
                <button
                  onClick={() => setScanning(true)}
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-2xl py-4 text-base transition-colors"
                >
                  Open Camera
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BarcodeIcon() {
  return (
    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 8v8M10 8v8M13 8v8M16 8v8"/>
    </svg>
  )
}
