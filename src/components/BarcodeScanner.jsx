import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null)
  const containerId = 'barcode-scanner-container'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          onDetected(decodedText)
        },
        () => {} // ignore per-frame errors
      )
      .catch((err) => {
        console.error('Camera error:', err)
        onClose()
      })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

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

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id={containerId} className="w-full h-full" />

        {/* Aim overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-72 h-40">
            {/* Corner brackets */}
            {[
              'top-0 left-0 border-t-2 border-l-2',
              'top-0 right-0 border-t-2 border-r-2',
              'bottom-0 left-0 border-b-2 border-l-2',
              'bottom-0 right-0 border-b-2 border-r-2',
            ].map((cls, i) => (
              <span key={i} className={`absolute w-8 h-8 border-green-400 ${cls}`} />
            ))}
            {/* Scan line */}
            <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-green-400 opacity-80 animate-pulse" />
          </div>
        </div>
      </div>

      <p className="text-center text-white/60 text-sm pb-8">
        Point camera at a barcode
      </p>
    </div>
  )
}
