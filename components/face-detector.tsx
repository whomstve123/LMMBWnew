"use client"


import type React from "react"
import { useEffect, useRef, useState } from "react"

// Avoid static import of utils/face-api which would pull face-api into SSR build.
const faceApiModuleRef = { current: null as any }


interface FaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected: (faceDescriptor: string) => void
  isCapturing: boolean
  onProceed?: () => void
}

export default function FaceDetector({ videoRef, onFaceDetected, isCapturing, onProceed }: FaceDetectorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)

  // Load models on mount (browser-only helper)
  useEffect(() => {
    let mounted = true
    async function loadModels() {
      try {
        setIsLoading(true)
        setError(null)
        if (!faceApiModuleRef.current) {
          faceApiModuleRef.current = await import('@/utils/face-api')
        }
        await faceApiModuleRef.current.loadFaceApiModels('/models')
        if (mounted) setIsLoading(false)
      } catch (err) {
        console.error('Error loading face models:', err)
        if (mounted) {
          setError('Failed to load face detection models')
          setIsLoading(false)
        }
      }
    }

    loadModels()

    return () => {
      mounted = false
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [])


  // Start multi-scan averaging when capturing
  useEffect(() => {
    if (isCapturing && !isLoading && !error && videoRef.current) {
      runMultiScan()
    }
    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [isCapturing, isLoading, error])


  // Multi-scan averaging logic
  const runMultiScan = async () => {
    setIsDetecting(true)
    setScanStage(1)
    setError(null)
    const SCAN_COUNT = 5
    const descriptors: Float32Array[] = []

    for (let i = 1; i <= SCAN_COUNT; i++) {
      setScanStage(i)
      try {
        if (!videoRef.current) {
          setError('Video element not ready')
          setIsDetecting(false)
          setScanStage(0)
          return
        }

        if (!faceApiModuleRef.current) {
          faceApiModuleRef.current = await import('@/utils/face-api')
        }
        const res = await faceApiModuleRef.current.generateFaceDescriptor(videoRef.current)

        if (res === null) {
          setError('No face detected. Please try again.')
          setIsDetecting(false)
          setScanStage(0)
          return
        }

        if (typeof res === 'object' && 'error' in res) {
          setError(res.error)
          setIsDetecting(false)
          setScanStage(0)
          return
        }

        // It's a Float32Array
        descriptors.push(res as Float32Array)
      } catch (err) {
        console.error('Error during face detection loop:', err)
        setError('Error during face detection.')
        setIsDetecting(false)
        setScanStage(0)
        return
      }

      await new Promise((res) => setTimeout(res, 500))
    }

    if (descriptors.length === 0) {
      setError('No successful scans collected')
      setIsDetecting(false)
      setScanStage(0)
      return
    }

    // Compute per-dimension median to build a stable descriptor
    const dim = descriptors[0].length
    const perDim: number[][] = Array.from({ length: dim }, () => [])
    descriptors.forEach((d) => {
      for (let k = 0; k < dim; k++) perDim[k].push(d[k])
    })

    const median = new Float32Array(dim)
    for (let k = 0; k < dim; k++) {
      const arr = perDim[k].slice().sort((a, b) => a - b)
      const m = arr.length
      median[k] = m % 2 === 1 ? arr[(m - 1) / 2] : (arr[m / 2 - 1] + arr[m / 2]) / 2
    }

    // Use shared helper to normalize & quantize
    try {
      if (!faceApiModuleRef.current) {
        faceApiModuleRef.current = await import('@/utils/face-api')
      }
      const quantized = faceApiModuleRef.current.normalizeAndQuantize(median, 1000)
      const jsonString = JSON.stringify(quantized)
      sessionStorage.setItem('faceDescriptor', jsonString)
      setFaceDescriptor(jsonString)
      if (typeof onFaceDetected === 'function') onFaceDetected(jsonString)
    } catch (err) {
      console.error('Failed to normalize descriptor:', err)
      setError('Failed to compute stable descriptor')
    }
    setIsDetecting(false)
    setScanStage(0)
  }


  // UI rendering
  return (
    <>
      {isDetecting && scanStage > 0 && (
        <div className="overlay scan-progress">
          <div className="scan-wheel">
            {[1,2,3].map(i => (
              <div
                key={i}
                className={`scan-dot${scanStage === i ? ' active' : ''}${scanStage > i ? ' done' : ''}`}
              >
                {scanStage > i ? '✔' : ''}
              </div>
            ))}
          </div>
              <span className="scan-label">Scan {scanStage} of 7</span>
        </div>
      )}
      {error && (
        <div className="overlay error">
          <span>{error}</span>
        </div>
      )}
      {faceDescriptor && (
        <button className="proceed-btn" onClick={() => (typeof onProceed === "function" ? onProceed() : undefined)}>
          Proceed
        </button>
      )}
    </>
  )
}
