"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import CaptureAnimation from "@/components/capture-animation"
import GlitchOverlay from "@/components/glitch-overlay"
import type { WebcamRef } from "@/components/simple-webcam"
import PasswordGate from "./password-gate"

const SimpleWebcam = dynamic(() => import("@/components/simple-webcam"), {
  ssr: false,
})

export default function Home() {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("passwordUnlocked") === "true"
    }
    return false
  })
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  // Removed isAnalyzing state
  const [isGenerating, setIsGenerating] = useState(false)
  const [noFaceWarning, setNoFaceWarning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const webcamRef = useRef<WebcamRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  // Help image fallback component
  function HelpImageFallback() {
    const [failed, setFailed] = useState(false)
    return failed ? (
      <div className="p-6 text-center text-gray-800">Help image failed to load. Please reach out if you need more information.</div>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/mindunwanderertechexp.jpg" alt="Help" className="max-w-full max-h-[80vh] object-contain" onError={() => setFailed(true)} />
    )
  }

  useEffect(() => {
    // Clear any existing session data on page load to ensure fresh start
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("faceDescriptor")
      sessionStorage.removeItem("audioUrl")
      sessionStorage.removeItem("userEmail")
      setFaceDescriptor(null) // Ensure we start with no face descriptor
    }
  }, [])

  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc)
  }

  const handleCaptureClick = async () => {
    setShowAnimation(true)
    setIsCapturing(true)
  // Removed setIsAnalyzing
    setNoFaceWarning(false)

    if (webcamRef.current) {
      try {
        await webcamRef.current.capturePhoto()
      } catch (error) {
        console.error("Error capturing photo:", error)
      }
    }
  }

  const handleAnimationComplete = () => {
    console.log("[handleAnimationComplete] capturedImage:", !!capturedImage)
    setShowAnimation(false)
    setIsCapturing(false)
    // Image is already captured, just mark as ready
    if (capturedImage) {
      setFaceDescriptor([1]) // Dummy value to enable proceed button
      setNoFaceWarning(false)
      console.log("[handleAnimationComplete] Set faceDescriptor to enable PROCEED button")
      try {
        webcamRef.current?.stopCamera?.()
      } catch (e) {}
    } else {
      console.log("[handleAnimationComplete] No captured image!")
      setNoFaceWarning(true)
    }
  }

  const handleFaceDetected = () => {
    // Get descriptor from sessionStorage
    const storedDescriptor = sessionStorage.getItem("faceDescriptor")
    if (storedDescriptor) {
      setFaceDescriptor(JSON.parse(storedDescriptor))
      setNoFaceWarning(false)
    }
  }

  const handleNoFaceDetected = () => {
    setNoFaceWarning(true)
    setIsCapturing(false)
  }

  const handleProceed = async () => {
    if (!capturedImage) {
      setErrorMessage("No image captured")
      return
    }

    console.log("[handleFaceDetected] Starting... capturedImage:", !!capturedImage)
    setIsGenerating(true)
    setErrorMessage(null)

    try {
      console.log("[handleFaceDetected] Calling rekognition-track API...")
      // Use Rekognition instead of face-api.js
      const res = await fetch("/api/rekognition-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: capturedImage }),
      })

      console.log("[handleFaceDetected] Response status:", res.status)
      const data = await res.json()
      console.log("[handleFaceDetected] Response data:", data)

      if (!res.ok || !data.audioUrl) {
        console.error("[handleFaceDetected] Missing audioUrl or error")
        throw new Error(data.error || "Track creation failed")
      }

      console.log("[handleFaceDetected] Got audioUrl, saving and navigating...")
      sessionStorage.setItem("audioUrl", data.audioUrl)
      console.log("[handleFaceDetected] Calling router.push(/email)...")
      router.push("/email")
      console.log("[handleFaceDetected] router.push called")
    } catch (err: any) {
      console.error("[handleFaceDetected] Error:", err)
      setErrorMessage("Something went wrong while creating your track. Please try again.")
      setIsGenerating(false)
    }
  }

  if (!unlocked) {
    return <PasswordGate onUnlock={() => {
      setUnlocked(true)
      localStorage.setItem("passwordUnlocked", "true")
    }} />
  }

  return (
    <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-4 md:py-16">
      <div className="w-full max-w-6xl mx-auto relative">\n        <div className="text-center mb-3 md:mb-8">
          <h1 className="text-3xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-3xl md:text-6xl font-legend mt-1 md:mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
        </div>

        <div className="relative flex justify-center items-center">
          <div className="absolute left-[40px] top-1/2 -translate-y-1/2 transform -rotate-90 origin-center whitespace-nowrap text-2xl md:text-3xl font-gothic text-[#2d2d2d] hidden md:block">
            <div className="text-center tracking-extra-wide leading-none">
              THE MIND UN-WANDERER IS THE FIRST
              <br />
              DEVICE OF ITS KIND WHICH PROMISES TO
              <br />
              ALLEVIATE THE POST-TRAUMATIC
              <br />
              ACQUISITION OF AURAL-PERCEPTION-
              <br />
              ALTERING PARASITIC INVERTIBRATES
            </div>
          </div>

          <div className="w-56 h-64 md:w-80 md:h-96 relative">
            <div className="absolute inset-0 w-full h-full animate-slow-spin">
              <svg viewBox="0 0 100 120" className="w-full h-full">
                <defs>
                  <path
                    id="circlePath"
                    d="M 50, 60 m -35, 0 a 35,50 0 1,1 70,0 a 35,50 0 1,1 -70,0"
                    fill="transparent"
                  />
                </defs>
                <text className="text-[10px]" style={{ fontFamily: 'var(--font-legend-script)' }}>
                  <textPath xlinkHref="#circlePath" startOffset="0%" className="text-[#2d2d2d]" style={{ fontFamily: 'var(--font-legend-script)' }}>
                    place your face..................................................................within the
                    oval..................................................................
                  </textPath>
                </text>
              </svg>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-52 md:w-52 md:h-72 rounded-full overflow-hidden border-4 border-[#2d2d2d] relative">
                <SimpleWebcam
                  ref={webcamRef}
                  videoRef={videoRef}
                  onCapture={handleCapture}
                  onFaceDetected={handleFaceDetected}
                />
                <CaptureAnimation isVisible={showAnimation} onAnimationComplete={handleAnimationComplete} />
                <GlitchOverlay isVisible={isGenerating} />
              </div>
            </div>
          </div>

          <div className="absolute right-[40px] top-1/2 -translate-y-1/2 transform rotate-90 origin-center whitespace-nowrap text-2xl md:text-3xl font-gothic text-[#2d2d2d] hidden md:block">
            <div className="text-center tracking-extra-wide leading-none">
              JILL BLUTT&apos;S GROUNDBREAKING
              <br />
              TECHNOLOGY UTILIZES BIOMETRIC FACIAL-
              <br />
              RECOGNITION DATA TO EXTRACT THE
              <br />
              UNIQUE SONIC PROFILE OF THE AFFLICTED&apos;S
              <br />
              MIND WANDERER COLONY
            </div>
          </div>
        </div>

        {noFaceWarning && (
          <div className="mt-4 text-center text-red-600 font-gothic">
            NO FACE DETECTED. PLEASE POSITION YOUR FACE IN THE OVAL AND TRY AGAIN.
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 text-center text-red-600 font-gothic">{errorMessage}</div>
        )}

          <div className="mt-3 md:mt-6 flex justify-center">
          {!faceDescriptor ? (
            isCapturing ? (
              <button
                className="px-8 md:px-12 py-2 md:py-3 border-2 border-[#2d2d2d] text-[#8b8b8b] font-gothic transition-colors cursor-not-allowed bg-[#f0efe8]"
                disabled
              >
                CAPTURING...
              </button>
              ) : (
              <button
                onClick={handleCaptureClick}
                className="px-8 md:px-12 py-2 md:py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
                disabled={isCapturing}
              >
                CAPTURE
              </button>
            )
          ) : (
            <button
              onClick={handleProceed}
              className="px-8 md:px-12 py-2 md:py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
              disabled={isGenerating}
            >
              {isGenerating ? "CREATING..." : "PROCEED"}
            </button>
          )}
        </div>
        {/* Help link below capture button */}
        {!isCapturing && (
          <div className="mt-1 text-center">
            <button
              onClick={() => setShowHelp(true)}
              className={`text-black font-bold`}
              style={{ fontFamily: 'Times New Roman, Times, serif' }}
            >
              What's going on?
            </button>
          </div>
        )}

        {/* Help modal overlay (upscaled for webcam page) */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-md" onClick={() => setShowHelp(false)} />
            <div className="relative max-w-4xl mx-4" style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
              <button onClick={() => setShowHelp(false)} aria-label="Close" className="absolute right-2 top-2 text-white font-bold text-2xl z-30">×</button>
              {/* Transparent container so the image displays edge-to-edge */}
              <div className="relative">
                <HelpImageFallback />
              </div>
            </div>
          </div>
        )}
      </div>

      {faceDescriptor && <div className="mt-4 text-xs text-[#2d2d2d] opacity-50">Biometric signature captured</div>}
    </main>
  )
}
