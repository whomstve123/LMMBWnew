"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EmailPage() {
  const [email, setEmail] = useState("")
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promotionalConsent, setPromotionalConsent] = useState(true)
  const router = useRouter()

  // Get faceDescriptor from sessionStorage on mount
  useEffect(() => {
    const storedDescriptor = sessionStorage.getItem("faceDescriptor")
    if (storedDescriptor) {
      setFaceDescriptor(storedDescriptor)
    } else {
      // Redirect to home if no faceDescriptor is found
      router.push("/")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const audioUrl = sessionStorage.getItem("audioUrl")
    const trackId = sessionStorage.getItem("trackId") // Get from Rekognition response

    if (!email || !audioUrl || !trackId) {
      setError("Email and track data are required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Store email in session storage for reference on the sound page
      sessionStorage.setItem("userEmail", email)

      // Save email and consent to database
      const saveEmailResponse = await fetch("/api/save-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          trackId,
          descriptor: null, // Not using descriptors with Rekognition
          promotionalConsent
        }),
      })

      if (!saveEmailResponse.ok) {
        console.warn("Failed to save email to database, continuing anyway")
      }

      // Send email directly (skip /api/submit to avoid Vercel auth issues)
      const response = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          trackId, 
          audioUrl,
          testMode: false 
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error("Send email API error:", responseData)
        throw new Error(responseData.error || responseData.details || "Failed to send email")
      }

      // Redirect immediately to your-sound page
      router.push("/your-sound")
    } catch (err) {
      console.error("Submission error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to submit. Please try again."
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-4 md:py-16">
      <div className="w-full max-w-6xl mx-auto relative">
        {/* Title */}
        <div className="text-center mb-3 md:mb-8">
          <h1 className="text-3xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-3xl md:text-6xl font-legend mt-1 md:mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
        </div>

        {/* Center form - without side text */}
        <div className="flex justify-center items-center">
          <div className="w-64 md:w-80 relative">
            <form onSubmit={handleSubmit} className="bg-transparent p-3 md:p-6 rounded-lg">
              <div className="mb-3 md:mb-6">
                <label htmlFor="email" className="block text-[#2d2d2d] text-lg md:text-xl font-gothic mb-2">
                  ENTER YOUR EMAIL
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 md:p-3 border-2 border-[#2d2d2d] bg-transparent text-[#2d2d2d] focus:outline-none"
                  placeholder="your@email.com"
                  required
                />
                <input type="hidden" name="faceDescriptor" value={faceDescriptor || ""} />
              </div>

              <div className="mb-4 flex items-start gap-1.5">
                <input
                  type="checkbox"
                  id="promotional-consent"
                  checked={promotionalConsent}
                  onChange={(e) => setPromotionalConsent(e.target.checked)}
                  className="mt-0.5 cursor-pointer opacity-40 w-3 h-3"
                  style={{ accentColor: '#2d2d2d' }}
                />
                <label htmlFor="promotional-consent" className="text-[#2d2d2d] text-[10px] opacity-40 cursor-pointer leading-tight">
                  I consent to receive occasional promotional emails from Jill Blutt
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !faceDescriptor}
                className={`w-full px-4 md:px-6 py-2 md:py-3 border-2 border-[#2d2d2d] font-gothic text-lg md:text-xl
                  ${
                    isSubmitting || !faceDescriptor
                      ? "text-gray-400 border-gray-400 cursor-not-allowed"
                      : "text-[#2d2d2d] hover:bg-[#2d2d2d] hover:text-[#e8e6d9]"
                  } transition-colors`}
              >
                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
              </button>

              {error && <div className="mt-4 text-red-600 text-center">{error}</div>}
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
