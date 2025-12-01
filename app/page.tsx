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
const ValidatedFaceDetector = dynamic(() => import("@/components/validated-face-detector"), {
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
  const [scanStage, setScanStage] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const DETECTOR_DEFAULT_SCANS = 10

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
    setShowAnimation(false)
  // Removed setIsAnalyzing
    // Check for faceDescriptor after animation completes
    const storedDescriptor = sessionStorage.getItem("faceDescriptor")
    if (storedDescriptor) {
      setFaceDescriptor(JSON.parse(storedDescriptor))
      setNoFaceWarning(false)
      // Stop camera now that we have the descriptor
      try {
        webcamRef.current?.stopCamera?.()
      } catch (e) {}
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
        throw new Error(data.error || "Track creation failed")
      }

      sessionStorage.setItem("audioUrl", data.audioUrl)
      router.push("/email")
    } catch (err: any) {
      console.error(err)
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
      {/* Full-page blocking overlay while detection is running to prevent any clicks/focus changes */}
      {isDetecting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 bg-transparent"
          style={{ pointerEvents: "auto" }}
        />
      )}
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
                {(showAnimation || isCapturing) && (
                  <ValidatedFaceDetector
                    // videoRef may be nullable; validator expects a non-nullable ref type, cast safely
                    videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                    onFaceDetected={handleFaceDetected}
                    onNoFaceDetected={handleNoFaceDetected}
                    isCapturing={showAnimation || isCapturing}
                    totalScans={DETECTOR_DEFAULT_SCANS}
                    maxRetries={3}
                    onScanProgress={(stage, total, detecting) => {
                      try { console.debug(`[page] scanProgress stage=${stage} total=${total} detecting=${detecting}`) } catch (e) {}
                      setScanStage(stage)
                      setIsDetecting(detecting)
                      // When detecting finishes, show the final stage briefly then clear UI states so it's not jarring
                      if (!detecting) {
                        setIsCapturing(false)
                        setShowAnimation(false)
                        // Keep the UI showing the final stage for a short moment so users perceive completion
                        setTimeout(() => setScanStage(0), 650)
                      }
                    }}
                  />
                )}
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
            isDetecting || isCapturing ? (
              <button
                className="px-8 md:px-12 py-2 md:py-3 border-2 border-[#2d2d2d] text-[#8b8b8b] font-gothic transition-colors cursor-not-allowed bg-[#f0efe8]"
                disabled
              >
                {`CAPTURING ${scanStage || 0}/${DETECTOR_DEFAULT_SCANS}...`}
              </button>
              ) : (
              <button
                onClick={handleCaptureClick}
                className="px-8 md:px-12 py-2 md:py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
                disabled={isCapturing || isDetecting}
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
        {/* Help link below capture button - do not show while capturing/detecting (initial overlay) */}
        {!isDetecting && !isCapturing && (
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
