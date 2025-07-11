"use client"

import type React from "react"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"

interface SimpleWebcamProps {
  onCapture: (imageSrc: string) => void
  onFaceDetected?: (faceHash: string) => void
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

// Define a ref type that exposes the capturePhoto method
export interface WebcamRef {
  capturePhoto: () => Promise<void>
}

const SimpleWebcam = forwardRef<WebcamRef, SimpleWebcamProps>(
  ({ onCapture, onFaceDetected, videoRef: externalVideoRef }, ref) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null)
    const [isReady, setIsReady] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    // Use the external video ref if provided, otherwise use the internal one
    const videoRef = externalVideoRef || internalVideoRef

    // Expose the capturePhoto method via ref
    useImperativeHandle(ref, () => ({
      capturePhoto: async () => {
        await capturePhoto()
      },
    }))

    useEffect(() => {
      // Function to start the webcam
      async function startWebcam() {
        if (!videoRef.current) return

        try {
          // Get user media with minimal constraints
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })

          // Assign the stream to the video element
          videoRef.current.srcObject = stream

          // Play the video
          try {
            await videoRef.current.play()
            console.log("Webcam started successfully")
            setIsReady(true)
          } catch (playError) {
            console.error("Error playing video:", playError)
          }
        } catch (err) {
          console.error("Error accessing webcam:", err)
        }
      }

      // Start the webcam
      startWebcam()

      // Cleanup function
      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }, [videoRef])

    // Function to capture a photo and process it
    const capturePhoto = async () => {
      console.log("Capture photo called")
      if (!videoRef.current || isProcessing) {
        console.log("Video ref not ready or already processing")
        return
      }

      setIsProcessing(true)

      try {
        // Create a canvas element
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        if (!context) {
          console.error("Could not get canvas context")
          setIsProcessing(false)
          return
        }

        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight

        // Draw the video frame to the canvas (flipped horizontally to match the mirrored display)
        context.translate(canvas.width, 0)
        context.scale(-1, 1)
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

        // Convert canvas to data URL
        const imageSrc = canvas.toDataURL("image/jpeg")
        console.log("Image captured successfully")

        // Pass the captured image to the parent component
        onCapture(imageSrc)

        // Note: We're not generating a hash here anymore
        // The ValidatedFaceDetector component will handle face detection and hash generation
      } catch (error) {
        console.error("Error processing image:", error)
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="relative w-full h-full bg-black">
        {/* The webcam video - with grayscale filter */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover filter grayscale"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>
    )
  },
)

// Add display name for React DevTools
SimpleWebcam.displayName = "SimpleWebcam"

export default SimpleWebcam
