"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import CaptureAnimation from "@/components/capture-animation"
import type { WebcamRef } from "@/components/simple-webcam"

// Import components with no SSR
const SimpleWebcam = dynamic(() => import("@/components/simple-webcam"), {
  ssr: false,
})

const SimplifiedFaceDetector = dynamic(() => import("@/components/simplified-face-detector"), {
  ssr: false,
})

export default function Home() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [noFaceWarning, setNoFaceWarning] = useState(false)
  const webcamRef = useRef<WebcamRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  // Check for existing face hash in sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedHash = sessionStorage.getItem("faceHash")
      if (storedHash) {
        console.log("Found existing hash in sessionStorage")
        setFaceHash(storedHash)
      }
    }
  }, [])

  const handleCapture = (imageSrc: string) => {
    console.log("Image captured in parent component")
    setCapturedImage(imageSrc)
  }

  const handleCaptureClick = async () => {
    console.log("Capture button clicked")
    setShowAnimation(true)
    setIsProcessing(true)
    setNoFaceWarning(false)

    // Directly call the capturePhoto method on the webcam component
    if (webcamRef.current) {
      try {
        await webcamRef.current.capturePhoto()
      } catch (error) {
        console.error("Error capturing photo:", error)
      }
    } else {
      console.error("Webcam ref not available")
    }
  }

  const handleAnimationComplete = () => {
    console.log("Animation complete")
    setShowAnimation(false)
    setIsProcessing(false)
  }

  const handleFaceDetected = (hash: string) => {
    console.log("Face detected callback in parent component with hash:", hash.substring(0, 20) + "...")
    setFaceHash(hash)
    setNoFaceWarning(false)
  }

  const handleNoFaceDetected = () => {
    console.log("No face detected")
    setNoFaceWarning(true)
    setIsProcessing(false)
  }

  const handleProceed = () => {
    // Navigate to the email page
    router.push("/email")
  }

  return (
    <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-16">
      {/* Container for the entire content to maintain alignment */}
      <div className="w-full max-w-6xl mx-auto relative">
        {/* Title - larger but not breaking into multiple lines */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-5xl md:text-6xl font-legend mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
        </div>

        {/* Center content with side text positioned relative to it */}
        <div className="relative flex justify-center items-center">
          {/* Left side vertical text - positioned EXTREMELY close to center */}
          <div className="absolute left-[120px] top-1/2 -translate-y-1/2 transform -rotate-90 origin-center whitespace-nowrap text-2xl md:text-3xl font-gothic text-[#2d2d2d] hidden md:block">
            <div className="text-center tracking-tight leading-none">
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

          {/* Center oval image with text */}
          <div className="w-64 h-80 md:w-80 md:h-96 relative">
            {/* Oval text around image */}
            <div className="absolute inset-0 w-full h-full animate-slow-spin">
              <svg viewBox="0 0 100 120" className="w-full h-full">
                <defs>
                  <path
                    id="circlePath"
                    d="M 50, 60 m -35, 0 a 35,50 0 1,1 70,0 a 35,50 0 1,1 -70,0"
                    fill="transparent"
                  />
                </defs>
                <text className="text-[8px] font-circularText">
                  <textPath xlinkHref="#circlePath" startOffset="0%" className="text-[#2d2d2d]">
                    place your face................................within the
                    oval.......................................
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Parabolic oval with webcam */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-64 md:w-52 md:h-72 rounded-full overflow-hidden border-4 border-[#2d2d2d] relative">
                <SimpleWebcam
                  ref={webcamRef}
                  videoRef={videoRef}
                  onCapture={handleCapture}
                  onFaceDetected={handleFaceDetected}
                />
                <CaptureAnimation isVisible={showAnimation} onAnimationComplete={handleAnimationComplete} />
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

          {/* Right side vertical text - positioned EXTREMELY close to center */}
          <div className="absolute right-[120px] top-1/2 -translate-y-1/2 transform rotate-90 origin-center whitespace-nowrap text-2xl md:text-3xl font-gothic text-[#2d2d2d] hidden md:block">
            <div className="text-center tracking-tight leading-none">
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

        {/* No face warning */}
        {noFaceWarning && (
          <div className="mt-4 text-center text-red-600 font-gothic">
            NO FACE DETECTED. PLEASE POSITION YOUR FACE IN THE OVAL AND TRY AGAIN.
          </div>
        )}

        {/* Single button that changes based on state */}
        <div className="mt-10 flex justify-center">
          {!faceHash ? (
            <button
              onClick={handleCaptureClick}
              className="px-12 py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? "PROCESSING..." : "CAPTURE"}
            </button>
          ) : (
            <button
              onClick={handleProceed}
              className="px-12 py-3 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
            >
              PROCEED
            </button>
          )}
        </div>
      </div>

      {/* Face hash status indicator (can be hidden in production) */}
      {faceHash && <div className="mt-4 text-xs text-[#2d2d2d] opacity-50">Biometric signature captured</div>}
    </main>
  )
}
