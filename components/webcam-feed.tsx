"use client"

import { useEffect, useRef, useState } from "react"

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    // Simple flag to track component mount state
    let isMounted = true

    async function startCamera() {
      try {
        console.log("Attempting to access camera...")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // Keep it simple - just request video
        })

        console.log("Camera access granted")

        // Only proceed if component is still mounted
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream

          // Set status to ready when video can play
          videoRef.current.onloadeddata = () => {
            console.log("Video data loaded")
            if (isMounted) {
              setStatus("ready")
            }
          }
        }
      } catch (err) {
        console.error("Camera access error:", err)
        if (isMounted) {
          setStatus("error")
          setErrorMessage(err instanceof Error ? err.message : "Failed to access camera")
        }
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      isMounted = false
      // Stop any active tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  if (status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-center p-2">
        <p>Initializing camera...</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-center p-2 text-xs">
        <p>Camera error: {errorMessage || "Could not access camera"}</p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
      style={{ transform: "scaleX(-1)" }} // Mirror the webcam feed
    />
  )
}
