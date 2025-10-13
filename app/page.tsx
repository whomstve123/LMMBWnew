"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import CaptureAnimation from "@/components/capture-animation"
import GlitchOverlay from "@/components/glitch-overlay"
import type { WebcamRef } from "@/components/simple-webcam"

const SimpleWebcam = dynamic(() => import("@/components/simple-webcam"), {
  ssr: false,
})
const SimplifiedFaceDetector = dynamic(() => import("@/components/simplified-face-detector"), {
  ssr: false,
})

export default function Home() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  // Removed isAnalyzing state
  const [isGenerating, setIsGenerating] = useState(false)
  const [noFaceWarning, setNoFaceWarning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const webcamRef = useRef<WebcamRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

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
    setShowAnimation(false)
    setIsCapturing(false)
  // Removed setIsAnalyzing
    // Check for faceDescriptor after animation completes
    const storedDescriptor = sessionStorage.getItem("faceDescriptor")
    if (storedDescriptor) {
      setFaceDescriptor(JSON.parse(storedDescriptor))
      setNoFaceWarning(false)
  // Removed setIsAnalyzing
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
    if (!faceDescriptor) return

    setIsGenerating(true)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/generateTrack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: faceDescriptor }),
      })

      const data = await res.json()

      if (!res.ok || !data.audioUrl) {
        throw new Error(data.error || "Track generation failed")
      }

      sessionStorage.setItem("audioUrl", data.audioUrl)
      router.push("/email")
    } catch (err: any) {
      console.error(err)
      setErrorMessage("Something went wrong while generating your track. Please try again.")
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-16">
      <div className="w-full max-w-6xl mx-auto relative">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-5xl md:text-6xl font-legend mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
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

          <div className="w-64 h-80 md:w-80 md:h-96 relative">
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
              <div className="w-44 h-64 md:w-52 md:h-72 rounded-full overflow-hidden border-4 border-[#2d2d2d] relative">
                <SimpleWebcam
                  ref={webcamRef}
                  videoRef={videoRef}
                  onCapture={handleCapture}
                  onFaceDetected={handleFaceDetected}
                />
                <CaptureAnimation isVisible={showAnimation} onAnimationComplete={handleAnimationComplete} />
                <GlitchOverlay isVisible={isGenerating} />
                {showAnimation && (
                  <SimplifiedFaceDetector
                    videoRef={videoRef}
                    onFaceDetected={handleFaceDetected}
                    onNoFaceDetected={handleNoFaceDetected}
                    isCapturing={showAnimation}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="absolute right-[40px] top-1/2 -translate-y-1/2 transform rotate-90 origin-center whitespace-nowrap text-2xl md:text-3xl font-gothic text-[#2d2d2d] hidden md:block">
            <div className="text-center tracking-extra-wide leading-none">
              JILL BLUTT&apos;S GROUNDBREAKING
              <br />
              TECHNOLOGY UTILIZES BIOMETRIC FACTIAL-
              <br />
              RECOGNITION DATA TO EXTRACT THE
              <br />
              UNIQUE SONIC PROFILE OF THE AFFLICTED&apos;S
              <br />
              MIND-WANDERER COLONY
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

        <div className="mt-10 flex justify-center">
          {!faceDescriptor ? (
            isCapturing ? (
              <button
                className="px-12 py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic transition-colors cursor-not-allowed"
                disabled
              >
                PROCESSING...
              </button>
            ) : (
              <button
                onClick={handleCaptureClick}
                className="px-12 py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
                disabled={isCapturing}
              >
                CAPTURE
              </button>
            )
          ) : (
            <button
              onClick={handleProceed}
              className="px-12 py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
              disabled={isGenerating}
            >
              {isGenerating ? "GENERATING..." : "PROCEED"}
            </button>
          )}
        </div>
      </div>

  {faceDescriptor && <div className="mt-4 text-xs text-[#2d2d2d] opacity-50">Biometric signature captured</div>}
    </main>
  )
}
