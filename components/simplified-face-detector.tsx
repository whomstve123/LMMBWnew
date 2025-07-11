"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"

interface SimplifiedFaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onFaceDetected: (faceHash: string) => void
  onNoFaceDetected: () => void
  isCapturing: boolean
}

export default function SimplifiedFaceDetector({
  videoRef,
  onFaceDetected,
  onNoFaceDetected,
  isCapturing,
}: SimplifiedFaceDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)

  // Set up canvas for drawing
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Function to resize canvas to match video dimensions
      const resizeCanvas = () => {
        if (video && canvas) {
          const { width, height } = video.getBoundingClientRect()
          canvas.width = width
          canvas.height = height
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

  // Start detection when capturing
  useEffect(() => {
    if (isCapturing && videoRef.current) {
      detectFace()
    }

    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [isCapturing])

  // Simple face detection based on image analysis
  const detectFace = async () => {
    if (!videoRef.current || isDetecting) return

    setIsDetecting(true)

    try {
      const video = videoRef.current
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      if (!context) {
        setIsDetecting(false)
        onNoFaceDetected()
        return
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data from the center portion where a face would likely be
      const centerX = Math.floor(canvas.width / 2)
      const centerY = Math.floor(canvas.height / 2)
      const sampleSize = Math.min(200, Math.floor(canvas.width / 3), Math.floor(canvas.height / 3))

      const imageData = context.getImageData(centerX - sampleSize / 2, centerY - sampleSize / 2, sampleSize, sampleSize)

      // Analyze pixel data to detect significant variation (which might indicate a face)
      const data = imageData.data
      let totalBrightness = 0
      let pixelCount = 0
      let minBrightness = 255
      let maxBrightness = 0
      let edgeCount = 0

      // Sample pixels to calculate brightness variation
      for (let y = 0; y < sampleSize; y += 4) {
        for (let x = 0; x < sampleSize; x += 4) {
          const i = (y * sampleSize + x) * 4
          if (i >= data.length) continue

          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // Calculate brightness using perceived luminance formula
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b

          totalBrightness += brightness
          pixelCount++

          minBrightness = Math.min(minBrightness, brightness)
          maxBrightness = Math.max(maxBrightness, brightness)

          // Simple edge detection - check if this pixel is significantly different from neighbors
          if (x > 0 && y > 0) {
            const leftI = (y * sampleSize + (x - 4)) * 4
            const topI = ((y - 4) * sampleSize + x) * 4

            if (leftI >= 0 && leftI < data.length && topI >= 0 && topI < data.length) {
              const leftBrightness = 0.299 * data[leftI] + 0.587 * data[leftI + 1] + 0.114 * data[leftI + 2]
              const topBrightness = 0.299 * data[topI] + 0.587 * data[topI + 1] + 0.114 * data[topI + 2]

              if (Math.abs(brightness - leftBrightness) > 20 || Math.abs(brightness - topBrightness) > 20) {
                edgeCount++
              }
            }
          }
        }
      }

      // Calculate average brightness and variation
      const avgBrightness = totalBrightness / pixelCount
      const brightnessRange = maxBrightness - minBrightness
      const edgeRatio = edgeCount / pixelCount

      // Check if there's significant variation in brightness and enough edges (might indicate a face)
      const hasFace = brightnessRange > 30 && avgBrightness > 40 && avgBrightness < 220 && edgeRatio > 0.05

      // Draw detection result on canvas
      if (canvasRef.current) {
        const displayCtx = canvasRef.current.getContext("2d")
        if (displayCtx) {
          displayCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

          if (hasFace) {
            // Draw a rectangle around the detected face area
            const { width, height } = canvasRef.current
            displayCtx.strokeStyle = "green"
            displayCtx.lineWidth = 3

            // Draw a rectangle in the center where we expect the face to be
            const rectSize = Math.min(width, height) * 0.6
            displayCtx.strokeRect((width - rectSize) / 2, (height - rectSize) / 2, rectSize, rectSize)
          }
        }
      }

      if (hasFace) {
        // Generate a hash from the image
        const hash = generateImageHash(canvas)

        // Save to sessionStorage
        sessionStorage.setItem("faceHash", hash)

        // Call callback
        onFaceDetected(hash)
        setIsDetecting(false)
      } else {
        console.log("No face detected")
        onNoFaceDetected()

        // Try again after a short delay
        detectionRef.current = setTimeout(detectFace, 500)
      }
    } catch (err) {
      console.error("Face detection error:", err)
      setIsDetecting(false)
      onNoFaceDetected()
    }
  }

  // Generate a hash from the image
  const generateImageHash = (canvas: HTMLCanvasElement): string => {
    const context = canvas.getContext("2d")
    if (!context) return Date.now().toString(36)

    // Resize to a small dimension for consistent hashing
    const hashCanvas = document.createElement("canvas")
    hashCanvas.width = 16
    hashCanvas.height = 16
    const hashCtx = hashCanvas.getContext("2d")
    if (!hashCtx) return Date.now().toString(36)

    // Draw the image at a reduced size
    hashCtx.drawImage(canvas, 0, 0, 16, 16)

    // Get image data
    const imageData = hashCtx.getImageData(0, 0, 16, 16)
    const data = imageData.data

    // Create a simplified hash from the pixel data
    const hashData = []
    for (let i = 0; i < data.length; i += 16) {
      hashData.push(data[i], data[i + 1], data[i + 2])
    }

    // Convert to base64
    const hashString = hashData.join(",")
    return btoa(hashString)
  }

  // Render the canvas overlay for visualization
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ transform: "scaleX(-1)" }} // Mirror to match video
    />
  )
}
