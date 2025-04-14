"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"

interface FaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected: (faceHash: string) => void
  isCapturing: boolean
}

export default function FaceDetector({ videoRef, onFaceDetected, isCapturing }: FaceDetectorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true)
        setError(null)

        // Load models directly
        await faceapi.nets.tinyFaceDetector.load("/")
        await faceapi.nets.faceRecognitionNet.load("/")

        setIsLoading(false)
        console.log("Face models loaded successfully")
      } catch (err) {
        console.error("Error loading face models:", err)
        setError("Failed to load face detection models")
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

  // Start face detection when capturing
  useEffect(() => {
    if (isCapturing && !isLoading && !error && videoRef.current) {
      detectFace()
    }

    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [isCapturing, isLoading, error])

  // Function to detect face and generate hash
  const detectFace = async () => {
    if (!videoRef.current || isDetecting || isLoading || error) return

    setIsDetecting(true)

    try {
      // Use TinyFaceDetector for better performance
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

      // Detect face
      const detection = await faceapi.detectSingleFace(videoRef.current, options)

      if (detection) {
        // Get face descriptor
        const descriptor = await faceapi.computeFaceDescriptor(videoRef.current)

        if (descriptor) {
          // Convert to array and then to base64
          const array = Array.from(descriptor as Float32Array)
          const jsonString = JSON.stringify(array)
          const hash = btoa(jsonString)

          // Save to sessionStorage
          sessionStorage.setItem("faceHash", hash)

          // Call callback
          onFaceDetected(hash)
          setIsDetecting(false)
          return
        }
      }

      // If we get here, no face was detected or no descriptor was generated
      // Try again after a short delay
      detectionRef.current = setTimeout(detectFace, 500)
    } catch (err) {
      console.error("Face detection error:", err)
      setError("Error during face detection")
      setIsDetecting(false)
    }
  }

  // Don't render anything visible
  return null
}
