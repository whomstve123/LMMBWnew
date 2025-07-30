"use client"

import React, { useEffect, useState } from "react"

interface SubtlePixelOverlayProps {
  isVisible: boolean
}

export default function SubtlePixelOverlay({ isVisible }: SubtlePixelOverlayProps) {
  const [pixels, setPixels] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    if (!isVisible) {
      setPixels([])
      return
    }

    // Create much fewer pixels (20-30 instead of 300)
    const pixelCount = 25
    const newPixels = Array.from({ length: pixelCount }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      delay: Math.random() * 4 + i * 0.3, // More spread out timing
    }))

    setPixels(newPixels)

    // Continuously add new pixels at random intervals
    const interval = setInterval(() => {
      if (!isVisible) return
      
      // Only add a new pixel occasionally
      if (Math.random() < 0.3) {
        const newPixel = {
          id: Date.now() + Math.random(),
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          delay: 0,
        }
        
        setPixels(prev => {
          // Keep only the most recent pixels to avoid accumulation
          const updated = [...prev.slice(-15), newPixel]
          return updated
        })
      }
    }, 1500) // Add new pixels every 1.5 seconds

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="subtle-pixel-overlay">
      {pixels.map((pixel) => (
        <div
          key={pixel.id}
          className="subtle-pixel"
          style={{
            left: `${pixel.x}px`,
            top: `${pixel.y}px`,
            animationDelay: `${pixel.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
