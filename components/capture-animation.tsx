"use client"

import { useEffect, useState } from "react"

interface CaptureAnimationProps {
  isVisible: boolean
  onAnimationComplete: () => void
}

export default function CaptureAnimation({ isVisible, onAnimationComplete }: CaptureAnimationProps) {
  const [animationStage, setAnimationStage] = useState<number>(0)

  useEffect(() => {
    if (!isVisible) {
      setAnimationStage(0)
      return
    }

    // Simple animation sequence timing
    const timings = [100, 2000]

    // Set up the animation sequence
    const timer1 = setTimeout(() => setAnimationStage(1), timings[0]) // Start scan
    const timer2 = setTimeout(() => {
      setAnimationStage(0)
      onAnimationComplete()
    }, timings[1]) // Complete

    // Clean up timers
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [isVisible, onAnimationComplete])

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Initial flash effect */}
      <div
        className={`absolute inset-0 bg-white transition-opacity duration-200 ${
          animationStage === 1 ? "opacity-30" : "opacity-0"
        }`}
      />

      {/* Simple glowing horizontal line */}
      {animationStage === 1 && (
        <div
          className="absolute left-0 right-0 h-[2px] bg-white opacity-80 scan-line"
          style={{
            boxShadow: "0 0 8px 2px rgba(255, 255, 255, 0.8)",
          }}
        />
      )}
    </div>
  )
}
