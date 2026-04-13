import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * BarcodeDetector support matrix:
 *   Chrome / Edge (Android + desktop)  ✅  real-time
 *   Safari 17.4+ (iOS + macOS)         ✅  real-time
 *   Firefox                            ❌  → photo fallback
 *   Chrome on iOS                      ❌  (uses WebKit < 17.4 on older devices) → photo fallback
 *
 * Photo fallback: user taps "Take Photo", selects/captures image,
 * html5-qrcode scans the static image file. Works on every browser.
 */

const EAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const doneRef = useRef(false)

  const [mode, setMode] = useState(null)  // 'realtime' | 'photo' | null
  const [error, setError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if ('BarcodeDetector' in window) {
      startRealtime()
    } else {
      setMode('photo')
    }
    return stop
  }, [])

  const stop = () => {
    doneRef.current = true
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const finish = (code) => {
    if (doneRef.current) return
    doneRef.current = true
    stop()
    onDetected(code)
  }

  // ── Real-time path (BarcodeDetector + getUserMedia) ───────────────────────
  const startRealtime = async () => {
    setMode('realtime')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector({ formats: EAN_FORMATS })

      const tick = async () => {
        if (doneRef.current) return
        if (videoRef.current?.readyState >= 2) {
          try {
            const found = await detector.detect(videoRef.current)
            if (found.length) { finish(found[0].rawValue); return }
          } catch { /* no result this frame */ }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setError(describeError(err))
    }
  }

  // ── Photo fallback (file input → Html5Qrcode.scanFile) ────────────────────
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    try {
      const scanner = new Html5Qrcode('_offscreen_scanner_')
      const result = await scanner.scanFile(file, false)
      finish(result)
    } catch {
      setError('No barcode found in that photo — try again closer to the barcode, with good lighting.')
      setPhotoLoading(false)
    }
    // reset input so the same file can be retried
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden div required by Html5Qrcode even for file scanning */}
      <div id="_offscreen_scanner_" style={{ display: 'none' }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-safe py-3 bg-black/80">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 active:bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-semibold">Scan Barcode</span>
        <div className="w-10" />
      </div>

      {/* ── Real-time view ── */}
      {mode === 'realtime' && !error && (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Aim overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darken area outside the scan box */}
            <div className="absolute inset-0" style={{
              background: 'rgba(0,0,0,0.45)',
              WebkitMaskImage: 'radial-gradient(340px 160px at 50% 50%, transparent 55%, black 80%)',
              maskImage: 'radial-gradient(340px 160px at 50% 50%, transparent 55%, black 80%)',
            }} />
            <div className="relative w-72 h-36">
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px]',
                'top-0 right-0 border-t-[3px] border-r-[3px]',
                'bottom-0 left-0 border-b-[3px] border-l-[3px]',
                'bottom-0 right-0 border-b-[3px] border-r-[3px]',
              ].map((cls, i) => (
                <span key={i} className={`absolute w-7 h-7 border-green-400 ${cls}`} />
              ))}
              <div className="absolute inset-x-2 top-1/2 h-px bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)] animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ── Photo fallback ── */}
      {mode === 'photo' && !photoLoading && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl">
            📷
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Take a photo of the barcode</p>
            <p className="text-white/50 text-sm mt-1">
              Your browser doesn't support live scanning — take a clear photo instead
            </p>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-900/30 rounded-xl px-4 py-3">{error}</p>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-2xl py-4 text-base transition-colors"
          >
            Take Photo / Choose Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          <button onClick={onClose} className="text-white/40 text-sm">
            Search by name instead
          </button>
        </div>
      )}

      {/* ── Processing photo ── */}
      {photoLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Reading barcode…</p>
        </div>
      )}

      {/* ── Camera error on real-time path ── */}
      {mode === 'realtime' && error && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <p className="text-4xl">📷</p>
          <p className="text-white font-medium">{error}</p>
          <button
            onClick={() => { setError(''); setMode('photo') }}
            className="bg-white/10 text-white rounded-xl px-6 py-3 text-sm font-medium"
          >
            Try photo instead
          </button>
          <button onClick={onClose} className="text-white/40 text-sm">Search by name</button>
        </div>
      )}

      {/* Hint text */}
      {mode === 'realtime' && !error && (
        <p className="shrink-0 text-center text-white/40 text-xs py-4 pb-safe">
          Hold steady — align barcode within the frame
        </p>
      )}
    </div>
  )
}

const describeError = (err) => {
  const msg = String(err?.message || err)
  if (/NotAllowed|Permission|denied/i.test(msg))
    return 'Camera access was denied. Please allow camera permission in your browser settings.'
  if (/NotFound|no camera/i.test(msg))
    return 'No camera found on this device.'
  if (location.protocol === 'http:')
    return 'Camera requires HTTPS. This works on your Vercel deployment — on local dev, use the photo option instead.'
  return 'Could not start the camera.'
}
