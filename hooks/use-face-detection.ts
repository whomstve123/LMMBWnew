"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { loadFaceApiModels, generateFaceDescriptor, descriptorToBase64 } from "@/utils/face-api"

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
      loadFaceApiModels()
        .then(() => {
          if (isMounted) {
            setModelsLoaded(true)
            setError(null)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(`Failed to load facial recognition models: ${err.message}`)
            console.error(err)
          }
        })
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
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || !videoRef.current.readyState || videoRef.current.readyState < 2) {
        return // Video not ready yet
      }

      try {
        const descriptor = await generateFaceDescriptor(videoRef.current)

        if (descriptor) {
          // Convert descriptor to base64 hash
          const hash = descriptorToBase64(descriptor)

          // Save to state and sessionStorage
          setFaceHash(hash)
          setFaceDetected(true)
          sessionStorage.setItem("faceHash", hash)

          // Call callback if provided
          if (onFaceDetected) {
            onFaceDetected(hash)
          }

          // Stop detection after successful detection
          if (detectionInterval.current) {
            clearInterval(detectionInterval.current)
            setIsDetecting(false)
          }
        }
      } catch (err) {
        console.error("Face detection error:", err)
        setError("Error during face detection")

        // Stop on error
        if (detectionInterval.current) {
          clearInterval(detectionInterval.current)
          setIsDetecting(false)
        }
      }
    }, 500) // Check every 500ms
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
