"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EmailPage() {
  const [email, setEmail] = useState("")
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Get faceHash from sessionStorage on mount
  useEffect(() => {
    const storedHash = sessionStorage.getItem("faceHash")
    if (storedHash) {
      setFaceHash(storedHash)
    } else {
      // Redirect to home if no faceHash is found
      router.push("/")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !faceHash) {
      setError("Email and face data are required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Store email in session storage for reference on the sound page
      sessionStorage.setItem("userEmail", email)

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, faceHash }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      // Redirect to the sound generation page
      router.push("/your-sound")
    } catch (err) {
      console.error("Submission error:", err)
      setError("Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#e8e6d9] flex flex-col items-center justify-center relative px-4 py-16">
      <div className="w-full max-w-6xl mx-auto relative">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-gothic tracking-tight text-[#2d2d2d]">
            JILL BLUTT&apos;S REVOLUTIONARY
          </h1>
          <div className="text-5xl md:text-6xl font-legend mt-2 text-[#2d2d2d]">Mind Un-Wanderer</div>
        </div>

        {/* Center form - without side text */}
        <div className="flex justify-center items-center">
          <div className="w-64 md:w-80 relative">
            <form onSubmit={handleSubmit} className="bg-transparent p-6 rounded-lg">
              <div className="mb-6">
                <label htmlFor="email" className="block text-[#2d2d2d] text-xl font-gothic mb-2">
                  ENTER YOUR EMAIL
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border-2 border-[#2d2d2d] bg-transparent text-[#2d2d2d] focus:outline-none"
                  placeholder="your@email.com"
                  required
                />
                <input type="hidden" name="faceHash" value={faceHash || ""} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !faceHash}
                className={`w-full px-6 py-3 border-2 border-[#2d2d2d] font-gothic text-xl
                  ${
                    isSubmitting || !faceHash
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
