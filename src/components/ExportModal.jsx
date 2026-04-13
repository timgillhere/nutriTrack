import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveUserProfile, getDiaryEntriesForDates } from '../services/firebase'

// ─── Date helpers ─────────────────────────────────────────────────────────────
const isoToday = () => new Date().toISOString().slice(0, 10)

const offsetDate = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const datesInRange = (start, end) => {
  const dates = []
  const cur = new Date(start + 'T12:00:00')
  const last = new Date(end + 'T12:00:00')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const fmtLong = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

const fmtShort = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

// ─── Preset date ranges ───────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Today',         start: () => isoToday(),      end: () => isoToday() },
  { label: 'Yesterday',     start: () => offsetDate(-1),   end: () => offsetDate(-1) },
  { label: 'Last 7 days',   start: () => offsetDate(-6),   end: () => isoToday() },
  { label: 'Last 2 weeks',  start: () => offsetDate(-13),  end: () => isoToday() },
  { label: 'Last month',    start: () => offsetDate(-29),  end: () => isoToday() },
  { label: 'Last 6 months', start: () => offsetDate(-179), end: () => isoToday() },
  { label: 'Last year',     start: () => offsetDate(-364), end: () => isoToday() },
]

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks']
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

// ─── Build the export text ────────────────────────────────────────────────────
function buildExportText(promptPrefix, startDate, endDate, dayData) {
  const lines = []

  if (promptPrefix.trim()) {
    lines.push(promptPrefix.trim())
    lines.push('')
  }

  const dateRange = startDate === endDate
    ? fmtShort(startDate)
    : `${fmtShort(startDate)} – ${fmtShort(endDate)}`

  lines.push(`Food diary: ${dateRange}`)
  lines.push('─'.repeat(48))
  lines.push('')

  let totalKcal = 0
  let totalProtein = 0
  let trackedDays = 0

  for (const { date, entries } of dayData) {
    if (!entries.length) continue
    trackedDays++

    const dayKcal = entries.reduce((s, e) => s + (e.kcal || 0), 0)
    const dayProtein = entries.reduce((s, e) => s + (e.protein || 0), 0)
    totalKcal += dayKcal
    totalProtein += dayProtein

    lines.push(fmtLong(date))
    for (const mealId of MEAL_ORDER) {
      const mealEntries = entries.filter(e => e.meal === mealId)
      if (!mealEntries.length) continue
      lines.push(`  ${MEAL_LABELS[mealId]}:`)
      for (const e of mealEntries) {
        lines.push(`    • ${e.foodName} (${e.servingSize}g) — ${e.kcal} kcal, ${e.protein}g protein`)
      }
    }
    lines.push(`  Day total: ${dayKcal} kcal | ${Math.round(dayProtein)}g protein`)
    lines.push('')
  }

  if (trackedDays === 0) {
    lines.push('No food entries recorded for this period.')
    return lines.join('\n')
  }

  lines.push('─'.repeat(48))
  lines.push('Summary:')
  lines.push(`  Days tracked: ${trackedDays}`)
  if (trackedDays > 1) {
    lines.push(`  Average calories: ${Math.round(totalKcal / trackedDays)} kcal/day`)
    lines.push(`  Average protein:  ${Math.round(totalProtein / trackedDays)}g/day`)
  }
  lines.push(`  Total calories: ${totalKcal} kcal`)
  lines.push(`  Total protein:  ${Math.round(totalProtein)}g`)

  return lines.join('\n')
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, onChange }) {
  const today = isoToday()
  const activePreset = PRESETS.find(p => p.start() === startDate && p.end() === endDate)?.label

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.start(), p.end())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activePreset === p.label
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={e => onChange(e.target.value, endDate)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
        <span className="text-gray-400 text-sm font-medium shrink-0">to</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={today}
          onChange={e => onChange(startDate, e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
      </div>
    </div>
  )
}

// ─── ExportModal ──────────────────────────────────────────────────────────────
export default function ExportModal({ onClose }) {
  const { user, profile, refreshProfile } = useAuth()

  const [aiPrompt, setAiPrompt] = useState(profile?.aiPrompt || '')
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  const [startDate, setStartDate] = useState(() => offsetDate(-6))
  const [endDate, setEndDate] = useState(isoToday)
  const [exporting, setExporting] = useState(false)
  const [exportText, setExportText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSavePrompt = async () => {
    setSavingPrompt(true)
    await saveUserProfile(user.uid, { aiPrompt })
    await refreshProfile()
    setSavingPrompt(false)
    setPromptSaved(true)
    setTimeout(() => setPromptSaved(false), 2000)
  }

  const handleRangeChange = useCallback((s, e) => {
    setStartDate(s)
    setEndDate(e)
    setExportText('')
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setExportText('')
    try {
      const dates = datesInRange(startDate, endDate)
      const dayData = await getDiaryEntriesForDates(user.uid, dates)
      setExportText(buildExportText(aiPrompt, startDate, endDate, dayData))
    } finally {
      setExporting(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
    } catch {
      const ta = document.getElementById('export-output')
      if (ta) { ta.select(); document.execCommand('copy') }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const dateCount = datesInRange(startDate, endDate).length

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">Export to AI</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-10">

        {/* AI prompt prefix */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">AI prompt prefix</label>
          <textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="e.g. Please analyse my food diary and give me personalised nutritional advice, highlighting any deficiencies and suggesting improvements."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none placeholder-gray-300"
          />
          <p className="text-xs text-gray-400 mt-1.5 mb-3">
            This text is prepended to every export so it's ready to paste straight into your AI of choice.
          </p>
          <button
            type="button"
            onClick={handleSavePrompt}
            disabled={savingPrompt}
            className={`w-full font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50 ${
              promptSaved
                ? 'bg-green-100 text-green-600'
                : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
            }`}
          >
            {promptSaved ? 'Prompt saved!' : savingPrompt ? 'Saving…' : 'Save prompt'}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Date range */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">Date range</label>
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleRangeChange} />
          <p className="text-xs text-gray-400 mt-2">{dateCount} day{dateCount !== 1 ? 's' : ''} selected</p>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-semibold rounded-xl py-3.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Fetching diary data…
            </>
          ) : 'Generate Export'}
        </button>

        {/* Export output */}
        {exportText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Ready to paste</p>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {copied ? 'Copied!' : 'Copy all'}
              </button>
            </div>
            <textarea
              id="export-output"
              readOnly
              value={exportText}
              rows={14}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-xs font-mono text-gray-700 bg-gray-50 focus:outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}
