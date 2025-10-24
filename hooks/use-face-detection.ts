"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

// Avoid statically importing the heavy `utils/face-api` at module-level so Next's
// server build doesn't accidentally include face-api/tfjs. We'll dynamically
// import it at runtime in the browser inside effects and call its helpers.
const faceApiModuleRef = { current: null as any }

interface UseFaceDetectionProps {
  enabled: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected?: (faceHash: string) => void
}

interface UseFaceDetectionResult {
  isDetecting: boolean
  faceDetected: boolean
  faceHash: string | null
  error: string | null
  startDetection: () => void
  resetDetection: () => void
  modelsLoaded: boolean
}

export function useFaceDetection({ enabled, videoRef, onFaceDetected }: UseFaceDetectionProps): UseFaceDetectionResult {
  const [isDetecting, setIsDetecting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const detectionInterval = useRef<NodeJS.Timeout | null>(null)

  // Load models on mount
  useEffect(() => {
    let isMounted = true

    if (typeof window !== "undefined") {
      ;(async () => {
        try {
          // Dynamic import to keep face-api out of SSR bundle
          if (!faceApiModuleRef.current) {
            faceApiModuleRef.current = await import('@/utils/face-api')
          }
          await faceApiModuleRef.current.loadFaceApiModels()
          if (isMounted) {
            setModelsLoaded(true)
            setError(null)
          }
        } catch (err: any) {
          if (isMounted) {
            setError(`Failed to load facial recognition models: ${err?.message ?? String(err)}`)
            // keep the original error logged for debugging
            // eslint-disable-next-line no-console
            console.error(err)
          }
        }
      })()
    }

    return () => {
      isMounted = false
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current)
      }
    }
  }, [])

  // Function to start face detection
  const startDetection = () => {
    if (!enabled || !videoRef.current || isDetecting || !modelsLoaded) {
      if (!modelsLoaded) {
        setError("Face detection models not loaded yet")
      }
      return
    }

    setIsDetecting(true)
    setError(null)

    // Clear any existing interval
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current)
    }

    // Set up detection interval
  // Multi-scan averaging: collect 3 descriptors, average, then hash
  let descriptors: Float32Array[] = [];
  let scanCount = 0;
  const maxScans = 3;
  let timeoutId: NodeJS.Timeout | null = null;
    // Add a timeout for the analyzing stage
    timeoutId = setTimeout(() => {
      setError("Face scan is taking too long. Please try again or check your camera.");
      setIsDetecting(false);
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    }, 5000);

    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || !videoRef.current.readyState || videoRef.current.readyState < 2) {
        return // Video not ready yet
      }

      try {
        if (!faceApiModuleRef.current) {
          faceApiModuleRef.current = await import('@/utils/face-api')
          // ensure models are loaded
          await faceApiModuleRef.current.loadFaceApiModels()
        }
        const descriptor = await faceApiModuleRef.current.generateFaceDescriptor(videoRef.current)
        if (descriptor && !(typeof descriptor === "object" && "error" in descriptor)) {
          descriptors.push(descriptor);
          scanCount++;
        } else if (descriptor && typeof descriptor === "object" && "error" in descriptor) {
          setError(descriptor.error);
          setFaceDetected(false);
          return;
        }

        if (scanCount >= maxScans) {
          // Average descriptors
          const dim = descriptors[0].length
          const avg = new Float32Array(dim)
          for (let i = 0; i < dim; i++) {
            avg[i] = descriptors.map(d => d[i]).reduce((a, b) => a + b, 0) / descriptors.length
          }

          // Use the normalizeAndQuantize helper from utils/face-api
          try {
            if (!faceApiModuleRef.current) {
              faceApiModuleRef.current = await import('@/utils/face-api')
            }
            const quantized = faceApiModuleRef.current.normalizeAndQuantize(avg, 1000)
            const jsonString = JSON.stringify(quantized)
            sessionStorage.setItem("faceDescriptor", jsonString)
            setFaceDetected(true)
            if (onFaceDetected) {
              onFaceDetected(jsonString)
            }
          } catch (err) {
            console.error('Error normalizing descriptor:', err)
            setError('Failed to process face descriptor')
          }

          // Stop detection after successful averaging
          if (detectionInterval.current) {
            clearInterval(detectionInterval.current)
            setIsDetecting(false)
          }
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
        setError("Error during face detection");
        // Stop on error
        if (detectionInterval.current) {
          clearInterval(detectionInterval.current);
          setIsDetecting(false);
        }
      }
    }, 500); // Check every 500ms
  }

  // Function to reset detection
  const resetDetection = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current)
    }
    setIsDetecting(false)
    setFaceDetected(false)
    setFaceHash(null)
    setError(null)
    sessionStorage.removeItem("faceHash")
  }

  return {
    isDetecting,
    faceDetected,
    faceHash,
    error,
    startDetection,
    resetDetection,
    modelsLoaded,
  }
}
