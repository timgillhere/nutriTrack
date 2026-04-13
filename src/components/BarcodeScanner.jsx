import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * Strategy:
 * 1. Always open the rear camera via getUserMedia → show live <video>
 * 2. If BarcodeDetector available (Chrome Android, Safari 17.4+) → scan frames via native API
 * 3. Otherwise → capture frames to canvas every 300ms → scan with Html5Qrcode.scanFile
 *    (same live preview, just JS-based decoding)
 *
 * This avoids html5-qrcode's own video management, which causes the black screen.
 */

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const rafRef = useRef(null)
  const doneRef = useRef(false)
  const scannerRef = useRef(null)

  const [error, setError] = useState('')

  useEffect(() => {
    startCamera()
    return cleanup
  }, [])

  const cleanup = () => {
    doneRef.current = true
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const finish = (code) => {
    if (doneRef.current) return
    doneRef.current = true
    cleanup()
    onDetected(code)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      if ('BarcodeDetector' in window) {
        scanWithNativeAPI()
      } else {
        scanWithFrameCapture()
      }
    } catch (err) {
      setError(describeError(err))
    }
  }

  // ── Native BarcodeDetector (fastest) ──────────────────────────────────────
  const scanWithNativeAPI = () => {
    const detector = new window.BarcodeDetector({ formats: FORMATS })
    const tick = async () => {
      if (doneRef.current) return
      const video = videoRef.current
      if (video?.readyState >= 2) {
        try {
          const results = await detector.detect(video)
          if (results.length) { finish(results[0].rawValue); return }
        } catch { /* no result this frame */ }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // ── Frame capture fallback (all other browsers) ───────────────────────────
  const scanWithFrameCapture = () => {
    // Html5Qrcode needs a DOM element id even for scanFile
    scannerRef.current = new Html5Qrcode('_qr_hidden_', { verbose: false })

    timerRef.current = setInterval(async () => {
      if (doneRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (!blob || doneRef.current) return
        const file = new File([blob], 'f.jpg', { type: 'image/jpeg' })
        try {
          const code = await scannerRef.current.scanFile(file, false)
          finish(code)
        } catch { /* no barcode in this frame — keep scanning */ }
      }, 'image/jpeg', 0.85)
    }, 300) // ~3 frames per second
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden elements required by html5-qrcode */}
      <div id="_qr_hidden_" style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/70">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 active:bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-semibold">Scan Barcode</span>
        <div className="w-10" />
      </div>

      {/* Camera view or error */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <p className="text-5xl">📷</p>
          <p className="text-white font-medium text-base">{error}</p>
          <button
            onClick={onClose}
            className="bg-white/10 text-white rounded-xl px-6 py-3 text-sm font-medium"
          >
            Search by name instead
          </button>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Live camera feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Aim overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darken outside the target box */}
            <div className="absolute inset-0" style={{
              background: 'rgba(0,0,0,0.5)',
              WebkitMaskImage: 'radial-gradient(330px 155px at 50% 50%, transparent 58%, black 82%)',
              maskImage: 'radial-gradient(330px 155px at 50% 50%, transparent 58%, black 82%)',
            }} />
            {/* Corner brackets */}
            <div className="relative w-72 h-36">
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px]',
                'top-0 right-0 border-t-[3px] border-r-[3px]',
                'bottom-0 left-0 border-b-[3px] border-l-[3px]',
                'bottom-0 right-0 border-b-[3px] border-r-[3px]',
              ].map((cls, i) => (
                <span key={i} className={`absolute w-7 h-7 border-green-400 ${cls}`} />
              ))}
              {/* Animated scan line */}
              <div
                className="absolute inset-x-3 h-0.5 bg-green-400"
                style={{
                  boxShadow: '0 0 8px 2px rgba(74,222,128,0.7)',
                  animation: 'scanline 1.8s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!error && (
        <p className="shrink-0 text-center text-white/40 text-xs py-4">
          Align the barcode within the frame
        </p>
      )}

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  )
}

const describeError = (err) => {
  const msg = String(err?.message || err)
  if (/NotAllowed|Permission|denied/i.test(msg))
    return 'Camera access denied. Please allow camera permission in your browser settings, then try again.'
  if (/NotFound|Devices not found/i.test(msg))
    return 'No camera found on this device.'
  if (location.protocol === 'http:')
    return 'Camera requires HTTPS. This works on your Vercel deployment. On local dev, try from your phone using the Vercel URL.'
  return 'Could not start the camera. Try searching by name instead.'
}
