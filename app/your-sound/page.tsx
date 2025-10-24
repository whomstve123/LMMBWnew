"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import ProgressivePixelOverlay from "@/components/progressive-pixel-overlay"
import CustomAudioPlayer from "@/components/custom-audio-player"

export default function YourSoundPage() {
  // Timeout ref for fallback
  const audioLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  useEffect(() => {
    if (isMobile) {
  // Mobile detection debug log removed
    }
  }, [isMobile])
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [trackId, setTrackId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProgressiveAnimation, setShowProgressiveAnimation] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [selectedStems, setSelectedStems] = useState<Record<string, string> | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

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
    // Get face descriptor from sessionStorage
    const storedDescriptor = sessionStorage.getItem("faceDescriptor")
    if (!storedDescriptor) {
  // No face descriptor found - redirecting to home (debug log removed)
      router.push("/")
      return
    }

    // Check if email was sent
    const email = sessionStorage.getItem("userEmail")
    if (email) {
      setEmailSent(true)
    }

    setFaceHash("descriptor") // For compatibility, but not used for matching
    if (!isRequesting) {
      generateTrack(JSON.parse(storedDescriptor))
      // Set a fallback timeout to hide animation if audio doesn't load
      if (audioLoadTimeoutRef.current) clearTimeout(audioLoadTimeoutRef.current)
      audioLoadTimeoutRef.current = setTimeout(() => {
        setShowProgressiveAnimation(false)
        setError("Audio failed to load. Please try again or check your connection.")
      }, 20000) // 20 seconds
    }
  }, [router, retryCount])

  const generateTrack = async (descriptor: number[]) => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
  // Generating track (debug log removed)
      setIsLoading(true)
      setError(null)

      // Call the API to generate the track
      const response = await fetch("/api/generateTrack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ descriptor }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
  // Track generated successfully (debug log removed)

      setTrackId(data.trackId)
      setAudioUrl(data.audioUrl)
      setSelectedStems(data.selectedStems)
      // Don't hide progressive animation yet - wait for media to load
    } catch (err) {
      console.error("Track creation error:", err)
      setError(`Failed to create your sound: ${err instanceof Error ? err.message : String(err)}`)
      // Hide progressive animation on error
      setShowProgressiveAnimation(false)
    } finally {
      setIsLoading(false)
      setIsRequesting(false);
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setShowProgressiveAnimation(true)
    setError(null)
  }

  const handleAudioLoaded = () => {
    // Clear the fallback timeout
    if (audioLoadTimeoutRef.current) {
      clearTimeout(audioLoadTimeoutRef.current)
      audioLoadTimeoutRef.current = null
    }
    // Clear any error message
    setError(null)
    // Add a built-in delay before hiding the animation
    setTimeout(() => {
      setShowProgressiveAnimation(false)
    }, 17000) // 17 seconds delay (7+10)
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (audioLoadTimeoutRef.current) {
        clearTimeout(audioLoadTimeoutRef.current)
      }
    }
  }, [])
  }

  const handleAnimationComplete = () => {
    // Called when the progress reaches 100% and animation is done
    setTimeout(() => {
      setShowProgressiveAnimation(false)
    }, 17000) // 17 seconds delay (7+10)
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

              {(isLoading || showProgressiveAnimation) ? (
                <div className="py-8 text-[#2d2d2d] font-gothic">INITIALIZING YOUR UNIQUE SOUND...</div>
              ) : (
                <div className="space-y-6">
                  {/* Removed error message before audio player loads */}
                  {audioUrl && (
                    <CustomAudioPlayer
                      src={audioUrl + (trackId ? `?v=${trackId}&t=${Date.now()}` : `?t=${Date.now()}`)}
                      hideInlineHelp={true}
                      onLoadedData={handleAudioLoaded}
                      onPlay={() => {
                        // On mobile, hide overlay as soon as play is pressed
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setShowProgressiveAnimation(false)
                        }
                      }}
                      onError={(e) => {
                        console.error("Audio playback error:", e)
                        setError("Error playing audio. Please try again.")
                        setShowProgressiveAnimation(false)
                      }}
                    />
                  )}

                  {emailSent && (
                    <>
                      <p className="text-[#2d2d2d] text-sm">A download link has been sent to your email address.</p>
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => setShowHelp(true)}
                          className={`text-black font-bold`}
                          style={{ fontFamily: 'Times New Roman, Times, serif', background: 'transparent' }}
                        >
                          What's going on?
                        </button>
                      </div>
                    </>
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
        {/* Help button is rendered inline under the email-sent copy (matching the home page) */}

        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-md" onClick={() => setShowHelp(false)} />
            <div className="relative max-w-4xl mx-4" style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
              <button onClick={() => setShowHelp(false)} aria-label="Close" className="absolute right-2 top-2 text-white font-bold text-2xl z-30">×</button>
              <div className="relative">
                <HelpImageFallback />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    </>
  )
}
