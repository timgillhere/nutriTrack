import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Barcode formats recognised by the native BarcodeDetector API
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectedRef = useRef(false)
  const fallbackRef = useRef(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState(null) // 'native' | 'fallback' | null

  useEffect(() => {
    const supportsNative = 'BarcodeDetector' in window

    if (supportsNative) {
      startNative()
    } else {
      startFallback()
    }

    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (fallbackRef.current) {
      fallbackRef.current.stop().catch(() => {})
    }
  }

  const handleDetected = (code) => {
    if (detectedRef.current) return
    detectedRef.current = true
    cleanup()
    onDetected(code)
  }

  // --- Native BarcodeDetector path (Chrome on Android, Safari 17+) ---
  const startNative = async () => {
    setMode('native')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector({ formats: NATIVE_FORMATS })

      const scan = async () => {
        if (detectedRef.current) return
        if (videoRef.current?.readyState === 4) {
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              handleDetected(barcodes[0].rawValue)
              return
            }
          } catch { /* continue scanning */ }
        }
        rafRef.current = requestAnimationFrame(scan)
      }
      rafRef.current = requestAnimationFrame(scan)
    } catch (err) {
      setError(cameraError(err))
    }
  }

  // --- html5-qrcode fallback path (Firefox, older Safari) ---
  const startFallback = () => {
    setMode('fallback')
    const containerId = 'qr-fallback-container'

    // Slight delay so the DOM node is mounted
    setTimeout(() => {
      const scanner = new Html5Qrcode(containerId)
      fallbackRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.7 },
          handleDetected,
          () => {}
        )
        .catch((err) => setError(cameraError(err)))
    }, 100)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-medium">Scan Barcode</span>
        <div className="w-10" />
      </div>

      {/* Camera / error area */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="text-5xl">📷</div>
          <p className="text-white font-medium">{error}</p>
          <button
            onClick={onClose}
            className="bg-white/10 text-white rounded-xl px-6 py-3 text-sm font-medium"
          >
            Go back &amp; search by name instead
          </button>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Native path: plain <video> */}
          {mode === 'native' && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
          )}

          {/* Fallback path: html5-qrcode manages its own video */}
          {mode === 'fallback' && (
            <div id="qr-fallback-container" className="w-full h-full" />
          )}

          {/* Aim overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette outside the scan box */}
            <div className="absolute inset-0 bg-black/40" style={{
              WebkitMaskImage: 'radial-gradient(ellipse 320px 170px at 50% 50%, transparent 60%, black 100%)',
              maskImage: 'radial-gradient(ellipse 320px 170px at 50% 50%, transparent 60%, black 100%)',
            }} />
            <div className="relative w-72 h-40">
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px]',
                'top-0 right-0 border-t-[3px] border-r-[3px]',
                'bottom-0 left-0 border-b-[3px] border-l-[3px]',
                'bottom-0 right-0 border-b-[3px] border-r-[3px]',
              ].map((cls, i) => (
                <span key={i} className={`absolute w-8 h-8 border-green-400 rounded-sm ${cls}`} />
              ))}
              {/* Animated scan line */}
              <div className="absolute left-1 right-1 h-0.5 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.6)] animate-[scanline_2s_ease-in-out_infinite]"
                style={{ top: '50%' }}
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-white/50 text-xs py-4">
        Hold steady — align the barcode within the frame
      </p>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-32px); }
          50% { transform: translateY(32px); }
        }
      `}</style>
    </div>
  )
}

const cameraError = (err) => {
  const msg = err?.message || String(err)
  if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
    return 'Camera permission denied. Please allow camera access in your browser settings and try again.'
  }
  if (msg.includes('NotFoundError') || msg.includes('no camera')) {
    return 'No camera found on this device.'
  }
  if (location.protocol === 'http:') {
    return 'Camera requires a secure connection (HTTPS). This works on your Vercel deployment — try searching by name for now.'
  }
  return 'Could not start the camera. Try searching by name instead.'
}
