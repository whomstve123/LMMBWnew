"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import ProgressivePixelOverlay from "@/components/progressive-pixel-overlay"
import CustomAudioPlayer from "@/components/custom-audio-player"

export default function YourSoundPage() {
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [trackId, setTrackId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProgressiveAnimation, setShowProgressiveAnimation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [selectedStems, setSelectedStems] = useState<Record<string, string> | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Get faceHash from sessionStorage
    const storedHash = sessionStorage.getItem("faceHash")
    if (!storedHash) {
      console.log("No face hash found in session storage, redirecting to home")
      router.push("/")
      return
    }

    // Check if email was sent
    const email = sessionStorage.getItem("userEmail")
    if (email) {
      setEmailSent(true)
    }

    setFaceHash(storedHash)
    generateTrack(storedHash)
  }, [router, retryCount])

  const generateTrack = async (hash: string) => {
    try {
      console.log("Generating track with hash:", hash.substring(0, 10) + "...")
      setIsLoading(true)
      setError(null)

      // Call the API to generate the track
      const response = await fetch("/api/generateTrack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ faceHash: hash }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Track generated successfully:", data)

      setTrackId(data.trackId)
      setAudioUrl(data.audioUrl)
      setSelectedStems(data.selectedStems)
      
      // Don't hide progressive animation yet - wait for media to load
    } catch (err) {
      console.error("Track generation error:", err)
      setError(`Failed to generate your sound: ${err instanceof Error ? err.message : String(err)}`)
      // Hide progressive animation on error
      setShowProgressiveAnimation(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setShowProgressiveAnimation(true)
    setError(null)
  }

  const handleAudioLoaded = () => {
    // Hide the progressive animation when audio is ready to play
    setShowProgressiveAnimation(false)
  }

  const handleAnimationComplete = () => {
    // Called when the progress reaches 100% and animation is done
    setShowProgressiveAnimation(false)
  }

  return (
    <>
      <ProgressivePixelOverlay 
        isVisible={showProgressiveAnimation}
        onComplete={handleAnimationComplete}
      />
      <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-16">
      <div className="w-full max-w-6xl mx-auto relative">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-5xl md:text-6xl font-legend mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
        </div>

        {/* Center audio player - without side text */}
        <div className="flex justify-center items-center">
          <div className="w-64 md:w-80 relative">
            <div className="bg-transparent p-6 rounded-lg text-center">
              <h2 className="text-3xl font-gothic text-[#2d2d2d] mb-6">THIS SOUND WAS MADE FOR YOU</h2>

              {isLoading ? (
                <div className="py-8 text-[#2d2d2d] font-gothic">LOADING YOUR UNIQUE SOUND...</div>
              ) : (
                <div className="space-y-6">
                  {error && <p className="text-red-400 mb-2 text-sm">{error}</p>}
                  {audioUrl && (
                    <CustomAudioPlayer
                      src={audioUrl}
                      onLoadedData={handleAudioLoaded}
                      onError={(e) => {
                        console.error("Audio playback error:", e)
                        setError("Error playing audio. Please try again.")
                        setShowProgressiveAnimation(false)
                      }}
                    />
                  )}

                  {emailSent && (
                    <p className="text-[#2d2d2d] text-sm">A download link has been sent to your email address.</p>
                  )}

                  {selectedStems && (
                    <div className="mt-4 text-xs text-[#2d2d2d] text-left">
                      <p className="font-bold mb-1">Your unique sound includes:</p>
                      <ul className="list-disc pl-4">
                        {Object.entries(selectedStems).map(([category, url]) => (
                          <li key={category}>
                            {category}: {url.split("/").pop()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {error && (
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 border-2 border-[#2d2d2d] text-[#2d2d2d] font-gothic hover:bg-[#2d2d2d] hover:text-[#e8e6d9] transition-colors"
                    >
                      RETRY
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  )
}
