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
        const descriptor = await generateFaceDescriptor(videoRef.current);
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
          const avg = new Float32Array(descriptors[0].length);
          for (let i = 0; i < avg.length; i++) {
            avg[i] = descriptors.map(d => d[i]).reduce((a, b) => a + b, 0) / descriptors.length;
          }
          // Normalize and round to integers
          const mean = avg.reduce((sum, v) => sum + v, 0) / avg.length;
          const std = Math.sqrt(avg.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / avg.length) || 1;
          const normalized = avg.map((v) => (v - mean) / std);
          const rounded = normalized.map((v) => Number(Math.round(v)));
          const finalDescriptor = new Float32Array(rounded);
          sessionStorage.setItem("faceDescriptor", JSON.stringify(Array.from(finalDescriptor)));
          setFaceDetected(true);
          if (onFaceDetected) {
            onFaceDetected("descriptor"); // For compatibility
          }
          // Stop detection after successful averaging
          if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            setIsDetecting(false);
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
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
