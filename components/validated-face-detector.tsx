"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
// face-api.js is heavy and contains some node-only bits; import it dynamically in the browser to
// avoid the bundler trying to resolve `fs`/`encoding` on the server.
let _faceapi: any = null
import { detectFaceInImage, generateSimpleImageHash } from "@/utils/fallback-face-detection"

interface ValidatedFaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected: (faceDescriptorJson: string) => void
  onNoFaceDetected: () => void
  isCapturing: boolean
  onScanProgress?: (stage: number, total: number, detecting: boolean) => void
  // Optional props to tune behavior for single- vs multi-scan
  totalScans?: number
  maxRetries?: number
}

export default function ValidatedFaceDetector({
  videoRef,
  onFaceDetected,
  onNoFaceDetected,
  isCapturing,
  onScanProgress,
  totalScans = 1,
  maxRetries = 2,
}: ValidatedFaceDetectorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const [showScanLine, setShowScanLine] = useState(false)
  const [completedStage, setCompletedStage] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)
  const faceapiRef = useRef<any>(null)
  const modelUrlRef = useRef<string | null>(null)
  // Configurable scans/retries
  const TOTAL_SCANS = totalScans
  const MAX_RETRIES = maxRetries
  const retryRef = useRef(0)

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true)
        setError(null)

  // Starting to load face-api models (debug log removed)

        // Specify the correct models path - make sure this matches where your models are stored
        // Prefer local public models if present, otherwise fall back to GitHub raw URL
        const LOCAL_MODEL_URL = "/models"
        const REMOTE_MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
        const MODEL_URL = LOCAL_MODEL_URL

        // Check if models exist by fetching the manifest
        try {
          const manifestResponse = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`)
          if (!manifestResponse.ok) {
            // try remote path before falling back
            const remoteManifest = await fetch(`${REMOTE_MODEL_URL}/tiny_face_detector_model-weights_manifest.json`)
            if (!remoteManifest.ok) {
              console.warn("Model manifest not found locally or remotely, using fallback detection")
              setUseFallback(true)
              setIsLoading(false)
              return
            } else {
              // Use remote url
              console.info("Using remote face-api model URL")
              modelUrlRef.current = REMOTE_MODEL_URL
            }
          }
        } catch (e) {
          console.warn("Error checking local model manifest, trying remote URL:", e)
          try {
            const remoteManifest = await fetch(`${REMOTE_MODEL_URL}/tiny_face_detector_model-weights_manifest.json`)
            if (remoteManifest.ok) {
              modelUrlRef.current = REMOTE_MODEL_URL
            } else {
              setUseFallback(true)
              setIsLoading(false)
              return
            }
          } catch (e2) {
            console.warn("Remote manifest check failed too:", e2)
            setUseFallback(true)
            setIsLoading(false)
            return
          }
        }

        // Load models with explicit path and better error handling
        // Dynamically import face-api in the browser-only flow
        try {
          if (!_faceapi) {
            const pkg = 'face-api.js'
            _faceapi = await import(pkg)
          }
          faceapiRef.current = _faceapi
        } catch (e) {
          console.error('Failed to dynamically import face-api.js, using fallback:', e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        const loadFrom = modelUrlRef.current || MODEL_URL
        try {
          await faceapiRef.current.nets.tinyFaceDetector.load(loadFrom)
          await faceapiRef.current.nets.faceLandmark68Net.load(loadFrom)
          await faceapiRef.current.nets.faceRecognitionNet.load(loadFrom)
        } catch (e) {
          console.error('Failed to load face-api models from', loadFrom, e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        setIsLoading(false)
  // All face models loaded (debug log removed)
      } catch (err) {
  console.error("Error loading face models:", err)
        setError(`Failed to load face detection models: ${err instanceof Error ? err.message : String(err)}`)
        setUseFallback(true)
        setIsLoading(false)
      }
    }

    loadModels()

    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [])

  // Set up canvas for drawing face detection
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Function to resize canvas to match video dimensions
      const resizeCanvas = () => {
        if (video && canvas) {
          const { videoWidth, videoHeight } = video
          const { width, height } = video.getBoundingClientRect()

          // Set canvas dimensions to match video display size
          canvas.width = width
          canvas.height = height

          // Scale context to account for any difference between video dimensions and display size
          const ctx = canvas.getContext("2d")
          if (ctx) {
            const scaleX = width / videoWidth
            const scaleY = height / videoHeight
            ctx.scale(scaleX, scaleY)
          }
        }
      }

      // Initial resize
      if (video.readyState >= 2) {
        resizeCanvas()
      } else {
        video.onloadeddata = resizeCanvas
      }

      // Handle window resize
      window.addEventListener("resize", resizeCanvas)

      return () => {
        window.removeEventListener("resize", resizeCanvas)
      }
    }
  }, [videoRef])

  // Start multi-scan averaging when capturing
  useEffect(() => {
    if (isCapturing && !isLoading && videoRef.current) {
      runMultiScan()
    }
    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [isCapturing, isLoading, useFallback])

  // Dev-only: simulate a successful capture by pressing 'S' (helps test without camera)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && process.env.NODE_ENV !== 'production') {
        const fake = JSON.stringify(Array.from({ length: 128 }, (_, i) => (i % 32) / 32))
        sessionStorage.setItem('faceDescriptor', fake)
        onFaceDetected(fake)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Multi-scan averaging logic
  const runMultiScan = async () => {
    setIsDetecting(true)
    const notify = (stage: number, detecting: boolean) => {
      try { console.debug(`[ValidatedFaceDetector] notify stage=${stage} detecting=${detecting}`) } catch (e) {}
      if (onScanProgress) onScanProgress(stage, TOTAL_SCANS, detecting)
    }

    setScanStage(0)
    setError(null)

    // If models aren't available, use fallback path once and return early
    if (useFallback) {
      try {
        notify(0, true)
        await detectFaceFallback()
      } finally {
        notify(0, false)
        setIsDetecting(false)
      }
      return
    }

    // Auto-retry loop for face-api detection
    retryRef.current = 0
    const minSuccessful = Math.min(3, TOTAL_SCANS || 1)

    while (retryRef.current <= MAX_RETRIES) {
      retryRef.current += 1
      notify(0, true)
      let descriptors: Float32Array[] = []
      for (let i = 1; i <= TOTAL_SCANS; i++) {
        setScanStage(i)
        notify(i, true)
        try {
          const options = new (faceapiRef.current.TinyFaceDetectorOptions)({ inputSize: 224, scoreThreshold: 0.5 })
          // Run a single unified detection call that yields landmarks + descriptor
          const detectPromise = faceapiRef.current
            .detectSingleFace(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceDescriptor()

          // Per-scan timeout to avoid long hangs (1200ms)
          const timeoutMs = 1200
          const race = await Promise.race([
            detectPromise,
            new Promise(resolve => setTimeout(() => resolve(null), timeoutMs)),
          ])

          const fullResult = race as any
          if (!fullResult) {
            // timed out or no result
            if (process.env.NODE_ENV !== 'production') console.info('[ValidatedFaceDetector] scan timed out or no result', i)
            continue
          }

          if (fullResult && fullResult.descriptor) {
            descriptors.push(fullResult.descriptor as Float32Array)
            setCompletedStage(i)
            setShowScanLine(true)
            setTimeout(() => setShowScanLine(false), 520)
          } else {
            if (process.env.NODE_ENV !== 'production') console.info('[ValidatedFaceDetector] no descriptor on scan', i)
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.info('[ValidatedFaceDetector] scan error', err)
        }
        // shorter delay between scans to keep total time reasonable
        await new Promise(res => setTimeout(res, 300))
      }

      // Evaluate attempt
      if (descriptors.length >= minSuccessful) {
      // Build per-dimension arrays
      const dim = descriptors[0].length
      const perDim: number[][] = Array.from({ length: dim }, () => [])
      descriptors.forEach(d => {
        for (let k = 0; k < dim; k++) {
          perDim[k].push(d[k])
        }
      })

      // Compute median per-dimension
      const median = new Float32Array(dim)
      for (let k = 0; k < dim; k++) {
        const arr = perDim[k].slice().sort((a, b) => a - b)
        const m = arr.length
        median[k] = m % 2 === 1 ? arr[(m - 1) / 2] : (arr[m / 2 - 1] + arr[m / 2]) / 2
      }

      // L2-normalize the median descriptor
      const l2 = Math.sqrt(median.reduce((s, v) => s + v * v, 0)) || 1
      const normalized = Array.from(median).map(v => v / l2)

      // Quantize to integers to reduce floating point variance
      const quantized = normalized.map(v => Math.round(v * 1000))

      // Create deterministic JSON string
      const jsonString = JSON.stringify(quantized)
      sessionStorage.setItem("faceDescriptor", jsonString)
      onFaceDetected(jsonString)
      // Mark final stage and notify parent that detection finished. Keep scanStage at TOTAL_SCANS so UI can show completed state briefly.
      setScanStage(TOTAL_SCANS)
      notify(TOTAL_SCANS, false)
      setIsDetecting(false)
      return
      }

      // If we reach here, this attempt failed to collect enough descriptors
      if (retryRef.current <= MAX_RETRIES) {
        console.debug(`Retrying detection (attempt ${retryRef.current} of ${MAX_RETRIES})`)
        // small delay before next retry
        await new Promise(r => setTimeout(r, 400))
        continue
      }

      // Exhausted retries — report error and unblock UI
      setError("Insufficient successful scans after retries. Please reposition and try again.")
      notify(descriptors.length, false)
      setIsDetecting(false)
      setScanStage(descriptors.length)
      return
    }
  }

  // Fallback face detection when face-api.js is not available
  const detectFaceFallback = async () => {
    if (!videoRef.current || isDetecting) return

    setIsDetecting(true)

    try {
      // Use our simple fallback detection
      const hasFace = await detectFaceInImage(videoRef.current)

      // Clear previous drawings
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

          // If we detected a face, draw a simple rectangle
          if (hasFace) {
            const { width, height } = canvasRef.current
            ctx.strokeStyle = "green"
            ctx.lineWidth = 2

            // Draw a rectangle in the center where we expect the face to be
            const rectSize = Math.min(width, height) * 0.5
            ctx.strokeRect((width - rectSize) / 2, (height - rectSize) / 2, rectSize, rectSize)
          }
        }
      }

      if (hasFace) {
        // Generate a simple hash from the image
        const hash = await generateSimpleImageHash(videoRef.current)

        if (hash) {
          // Face detected with fallback: convert hash into a deterministic descriptor
          // Map characters to small integers and pad/trim to length 128, matching descriptor shape.
          const arr = Array.from(hash).map(c => c.charCodeAt(0) % 32)
          while (arr.length < 128) arr.push(0)
          const descriptor = arr.slice(0, 128)

          const jsonString = JSON.stringify(descriptor)
          // Save deterministic descriptor to sessionStorage so page code picks it up
          sessionStorage.setItem("faceDescriptor", jsonString)

          // Also keep faceHash for debugging/compatibility (do not rely on it)
          try { sessionStorage.setItem("faceHash", hash) } catch (e) {}

          // Call callback with the descriptor JSON (canonical format)
          onFaceDetected(jsonString)
          setIsDetecting(false)
          return
        }
      }

          // No face detected with fallback (debug log removed)
      onNoFaceDetected()
      setIsDetecting(false)
    } catch (err) {
      console.error("Fallback face detection error:", err)
      setError(`Error during fallback face detection: ${err instanceof Error ? err.message : String(err)}`)
      setIsDetecting(false)
      onNoFaceDetected()
    }
  }

  // Function to detect face and generate hash using face-api.js
  const detectFace = async () => {
    if (!videoRef.current || isDetecting || isLoading || error) return

    setIsDetecting(true)

    try {
      // Use TinyFaceDetector for better performance
      const options = new (faceapiRef.current.TinyFaceDetectorOptions)({
        inputSize: 224,
        scoreThreshold: 0.5,
      })

      // First check if we can detect a face at all
  const detection = await faceapiRef.current.detectSingleFace(videoRef.current, options)

      // Clear previous drawings
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }

      if (!detection) {
    // No face detected in initial check (debug log removed)
        onNoFaceDetected()
        setIsDetecting(false)
        return
      }

      // If we have a face, proceed with landmarks and descriptor
  // Face detected, getting landmarks and descriptor (debug log removed)

      // Get full detection with landmarks and descriptor
      const fullResult = await faceapiRef.current
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (fullResult) {
  // Face detected successfully with descriptor (debug log removed)

        // Draw detection on canvas
        if (canvasRef.current) {
          // Create a detection array for drawing
          const detections = [
            new (faceapiRef.current.FaceDetection)(fullResult.detection.score, fullResult.detection.relativeBox, {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            }),
          ]

          // Draw the detections
          faceapiRef.current.draw.drawDetections(canvasRef.current, detections)
        }

        // Normalize & quantize descriptor to deterministic integer array and emit JSON
        try {
          const descriptor = fullResult.descriptor as Float32Array
          const utils = await import('@/utils/face-api')
          const quantized = utils.normalizeAndQuantize(descriptor, 1000)
          const jsonString = JSON.stringify(quantized)
          sessionStorage.setItem('faceDescriptor', jsonString)
          // Provide the JSON string to the callback (consistent with other detectors)
          onFaceDetected(jsonString)
        } catch (err) {
          console.error('Failed to normalize descriptor in validated detector:', err)
          onNoFaceDetected()
        }
        setIsDetecting(false)
        return
      } else {
  // Face detected but couldn't get descriptor (debug log removed)
        onNoFaceDetected()
        setIsDetecting(false)
      }
    } catch (err) {
  console.error("Face detection error:", err)
      setError(`Error during face detection: ${err instanceof Error ? err.message : String(err)}`)
      setIsDetecting(false)
      onNoFaceDetected()
    }
  }

  // Render the canvas overlay and scan progress wheel
  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ transform: "scaleX(-1)" }} // Mirror to match video
      />
      {/* Simple 5-circle progress wheel: each circle fills green after its scan completes */}
      <div
        aria-hidden={true}
        className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center transition-opacity ${isDetecting ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* transient scan-line: appears briefly when a scan completes */}
          <div
            className="w-3/4 h-1 rounded-full bg-white shadow-sm"
            style={{
              opacity: showScanLine ? 0.95 : 0,
              transition: 'opacity 220ms ease',
            }}
          />
        </div>
        <svg viewBox="0 0 220 220" width="160" height="160" className="filter">
          {/* Positions: top, upper-right, lower-right, lower-left, upper-left */}
          {/** Draw gray ring dots */}
          <circle cx="110" cy="40" r="12" stroke="#6b6b6b" strokeWidth="2" fill={scanStage >= 1 ? '#2e7d32' : 'transparent'} style={{ transition: 'fill 240ms ease' }} />
          <circle cx="160" cy="80" r="12" stroke="#6b6b6b" strokeWidth="2" fill={scanStage >= 2 ? '#2e7d32' : 'transparent'} style={{ transition: 'fill 240ms ease' }} />
          <circle cx="140" cy="150" r="12" stroke="#6b6b6b" strokeWidth="2" fill={scanStage >= 3 ? '#2e7d32' : 'transparent'} style={{ transition: 'fill 240ms ease' }} />
          <circle cx="80" cy="150" r="12" stroke="#6b6b6b" strokeWidth="2" fill={scanStage >= 4 ? '#2e7d32' : 'transparent'} style={{ transition: 'fill 240ms ease' }} />
          <circle cx="60" cy="80" r="12" stroke="#6b6b6b" strokeWidth="2" fill={scanStage >= 5 ? '#2e7d32' : 'transparent'} style={{ transition: 'fill 240ms ease' }} />
          {/* optional center pulse to indicate active scanning */}
          {isDetecting && <circle cx="110" cy="100" r={20 + (scanStage / TOTAL_SCANS) * 6} fill="none" stroke="#2e7d32" strokeOpacity={0.12} strokeWidth={2} />}
        </svg>
      </div>
      {error && <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 z-20">{error}</div>}
      {/* intentionally removed fallback banner for a cleaner UX */}
    </>
  )
}
