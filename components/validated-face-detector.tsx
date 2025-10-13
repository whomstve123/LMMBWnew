"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import * as faceapi from "face-api.js"
import { detectFaceInImage, generateSimpleImageHash } from "@/utils/fallback-face-detection"

interface ValidatedFaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected: (faceHash: string) => void
  onNoFaceDetected: () => void
  isCapturing: boolean
}

export default function ValidatedFaceDetector({
  videoRef,
  onFaceDetected,
  onNoFaceDetected,
  isCapturing,
}: ValidatedFaceDetectorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true)
        setError(null)

        console.log("Starting to load face-api.js models...")

        // Specify the correct models path - make sure this matches where your models are stored
        const MODEL_URL = "/models"

        // Check if models exist by fetching the manifest
        try {
          const manifestResponse = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`)
          if (!manifestResponse.ok) {
            console.warn("Model manifest not found, using fallback detection")
            setUseFallback(true)
            setIsLoading(false)
            return
          }
        } catch (e) {
          console.warn("Error checking model manifest, using fallback detection:", e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        // Load models with explicit path and better error handling
        try {
          await faceapi.nets.tinyFaceDetector.load(MODEL_URL)
          console.log("TinyFaceDetector model loaded")
        } catch (e) {
          console.error("Failed to load TinyFaceDetector:", e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        try {
          await faceapi.nets.faceLandmark68Net.load(MODEL_URL)
          console.log("FaceLandmark68Net model loaded")
        } catch (e) {
          console.error("Failed to load FaceLandmark68Net:", e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        try {
          await faceapi.nets.faceRecognitionNet.load(MODEL_URL)
          console.log("FaceRecognitionNet model loaded")
        } catch (e) {
          console.error("Failed to load FaceRecognitionNet:", e)
          setUseFallback(true)
          setIsLoading(false)
          return
        }

        setIsLoading(false)
        console.log("All face models loaded successfully")
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

  // Multi-scan averaging logic
  const runMultiScan = async () => {
    setIsDetecting(true)
    setScanStage(1)
    setError(null)
    let descriptors: Float32Array[] = []
    for (let i = 1; i <= 3; i++) {
      setScanStage(i)
      try {
        if (useFallback) {
          // fallback: just wait and skip
          await new Promise(res => setTimeout(res, 500))
        } else {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          const detection = await faceapi.detectSingleFace(videoRef.current, options)
          if (detection) {
            const fullResult = await faceapi
              .detectSingleFace(videoRef.current, options)
              .withFaceLandmarks()
              .withFaceDescriptor()
            if (fullResult && fullResult.descriptor) {
              descriptors.push(fullResult.descriptor as Float32Array)
            } else {
              setError("Could not extract face descriptor. Please try again.")
              setIsDetecting(false)
              setScanStage(0)
              return
            }
          } else {
            setError("No face detected. Please try again.")
            setIsDetecting(false)
            setScanStage(0)
            return
          }
        }
      } catch (err) {
        setError("Error during face detection.")
        setIsDetecting(false)
        setScanStage(0)
        return
      }
      await new Promise(res => setTimeout(res, 500))
    }
    if (!useFallback && descriptors.length === 3) {
      // Average descriptors
      const avg = new Float32Array(descriptors[0].length)
      for (let i = 0; i < avg.length; i++) {
        avg[i] = descriptors.map(d => d[i]).reduce((a, b) => a + b, 0) / descriptors.length
      }
      // Normalize and round to integers
      const mean = avg.reduce((sum, v) => sum + v, 0) / avg.length;
      const std = Math.sqrt(avg.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / avg.length) || 1;
      const normalized = avg.map((v) => (v - mean) / std);
      const rounded = normalized.map((v) => Number(Math.round(v)));
      const finalDescriptor = new Float32Array(rounded);
      const jsonString = JSON.stringify(Array.from(finalDescriptor));
      sessionStorage.setItem("faceDescriptor", jsonString);
      onFaceDetected(jsonString);
    } else if (useFallback) {
      // fallback: just call fallback detection
      detectFaceFallback()
    }
    setIsDetecting(false)
    setScanStage(0)
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
          console.log("Face detected with fallback method")

          // Save to sessionStorage
          sessionStorage.setItem("faceHash", hash)

          // Call callback
          onFaceDetected(hash)
          setIsDetecting(false)
          return
        }
      }

      console.log("No face detected with fallback method")
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
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      })

      // First check if we can detect a face at all
      const detection = await faceapi.detectSingleFace(videoRef.current, options)

      // Clear previous drawings
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }

      if (!detection) {
        console.log("No face detected in initial check")
        onNoFaceDetected()
        setIsDetecting(false)
        return
      }

      // If we have a face, proceed with landmarks and descriptor
      console.log("Face detected, getting landmarks and descriptor...")

      // Get full detection with landmarks and descriptor
      const fullResult = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (fullResult) {
        console.log("Face detected successfully with descriptor")

        // Draw detection on canvas
        if (canvasRef.current) {
          // Create a detection array for drawing
          const detections = [
            new faceapi.FaceDetection(fullResult.detection.score, fullResult.detection.relativeBox, {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            }),
          ]

          // Draw the detections
          faceapi.draw.drawDetections(canvasRef.current, detections)
        }

        // Convert descriptor to base64 hash
        const descriptor = fullResult.descriptor
        const array = Array.from(descriptor)
        const jsonString = JSON.stringify(array)
        const hash = btoa(jsonString)

        // Save to sessionStorage
        sessionStorage.setItem("faceHash", hash)

        // Call callback
        onFaceDetected(hash)
        setIsDetecting(false)
        return
      } else {
        console.log("Face detected but couldn't get descriptor")
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
          <span className="scan-label">Scan {scanStage} of 3</span>
        </div>
      )}
      {error && <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 z-20">{error}</div>}
      {useFallback && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-xs p-1 z-20">
          Using fallback detection (face-api.js models not available)
        </div>
      )}
    </>
  )
}
