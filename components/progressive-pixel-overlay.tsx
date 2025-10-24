"use client"

import React, { useEffect, useState } from "react"

interface ProgressivePixelOverlayProps {
  isVisible: boolean
  onComplete?: () => void
}

export default function ProgressivePixelOverlay({ isVisible, onComplete }: ProgressivePixelOverlayProps) {
  const [pixels, setPixels] = useState<Array<{ 
    id: number
    x: number
    y: number
    delay: number
    size: number
    glitchType: 'normal' | 'flicker' | 'corrupt' | 'burst'
    intensity: number
  }>>([])
  const pixelIdCounter = React.useRef(0)
  const [progress, setProgress] = useState(0) // 0-100 progress percentage
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [minTimeReached, setMinTimeReached] = useState(false)

  // Minimum visible time in ms
  const MIN_VISIBLE_TIME = 3000;

  // Function to complete the progress to 100%, but only after min time
  const completeProgress = () => {
    if (isCompleting) return
    setIsCompleting(true)
    // Wait for min visible time before completing
    if (!minTimeReached) {
      setTimeout(() => {
        setMinTimeReached(true)
        completeProgress()
      }, MIN_VISIBLE_TIME - elapsedTime)
      return
    }
    // Quickly animate to 100%
    const completeInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(completeInterval)
          setTimeout(() => {
            onComplete?.()
          }, 100)
          return 100
        }
        return Math.min(prev + 8, 100)
      })
    }, 30)
  }

  // Call completeProgress when media is loaded (when isVisible becomes false)
  useEffect(() => {
    if (!isVisible) {
      setPixels([])
      setProgress(0)
      setElapsedTime(0)
      setIsCompleting(false)
      setMinTimeReached(false)
      onComplete?.()
      return
    }
  }, [isVisible, onComplete])

  useEffect(() => {
    if (!isVisible) {
      // Immediately clear everything when not visible
      setPixels([])
      setProgress(0)
      setElapsedTime(0)
      setIsCompleting(false)
      return
    }

    if (isCompleting) {
      // When completing, create overwhelming burst of pixels
      const burstPixels = Array.from({ length: 150 }, () => ({
        id: pixelIdCounter.current++,
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
        delay: Math.random() * 0.2,
        size: 2 + Math.random() * 8,
        glitchType: ['corrupt', 'burst', 'flicker'][Math.floor(Math.random() * 3)] as any,
        intensity: 0.8 + Math.random() * 0.2,
      }))
      setPixels(burstPixels)
      return
    }

    let progressInterval: NodeJS.Timeout
    let pixelInterval: NodeJS.Timeout

    // Update progress gradually over time (simulate loading progress)
    progressInterval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 100 // increment by 100ms
        if (newTime >= MIN_VISIBLE_TIME && !minTimeReached) {
          setMinTimeReached(true)
        }
        // Simulate realistic loading progress (slower at start, faster in middle, slower at end)
        let newProgress = 0
        if (newTime < 5000) {
          newProgress = (newTime / 5000) * 30
        } else if (newTime < 15000) {
          newProgress = 30 + ((newTime - 5000) / 10000) * 50
        } else {
          const remainingTime = newTime - 15000
          newProgress = 80 + (1 - Math.exp(-remainingTime / 10000)) * 15
        }
        setProgress(Math.min(newProgress, 95))
        return newTime
      })
    }, 100)

    // Add pixels based on current progress - sparse to overwhelming
    const addPixels = () => {
      if (!isVisible || isCompleting) return

      // Calculate pixel count and frequency based on progress - exponential growth
      const progressPercent = progress / 100
      const exponentialFactor = Math.pow(progressPercent, 1.8) // More aggressive exponential curve
      
      // Start with 1-2 pixels, grow to 25-120 pixels based on progress
      const basePixelCount = progressPercent < 0.2 ? 1 + Math.random() : 
                             progressPercent < 0.5 ? 3 + Math.floor(exponentialFactor * 15) :
                             progressPercent < 0.8 ? 8 + Math.floor(exponentialFactor * 35) :
                             progressPercent < 0.9 ? 15 + Math.floor(exponentialFactor * 65) :
                             25 + Math.floor(exponentialFactor * 95) // MUCH more overwhelming at 90%+
      
      // Interval gets much shorter as progress increases (more frantic)
      const interval = progressPercent < 0.3 ? 1500 - (progressPercent * 500) : // 1500ms to 1350ms 
                       progressPercent < 0.6 ? 1200 - (progressPercent * 800) : // 1200ms to 720ms
                       progressPercent < 0.8 ? 600 - (progressPercent * 400) : // 600ms to 280ms
                       progressPercent < 0.9 ? 150 - (progressPercent * 100) : // 150ms to 60ms
                       30 + Math.random() * 50 // 30-80ms (extremely chaotic at 90%+)
      
      const newPixels = Array.from({ length: basePixelCount }, (_, i) => {
        const glitchTypes = ['normal', 'flicker', 'corrupt', 'burst'] as const
        const glitchWeights = progressPercent < 0.3 ? [0.8, 0.15, 0.05, 0] :
                              progressPercent < 0.6 ? [0.5, 0.3, 0.15, 0.05] :
                              progressPercent < 0.8 ? [0.3, 0.3, 0.25, 0.15] :
                              progressPercent < 0.9 ? [0.1, 0.2, 0.35, 0.35] :
                              [0.05, 0.15, 0.4, 0.4] // EXTREMELY chaotic at 90%+
        
        const rand = Math.random()
        let glitchType: typeof glitchTypes[number] = 'normal'
        let cumulative = 0
        for (let j = 0; j < glitchTypes.length; j++) {
          cumulative += glitchWeights[j]
          if (rand <= cumulative) {
            glitchType = glitchTypes[j]
            break
          }
        }
        
        return {
          id: pixelIdCounter.current++,
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
          y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
          delay: Math.random() * (progressPercent < 0.5 ? 1 : progressPercent < 0.9 ? 0.3 : 0.1), // MUCH faster delays at 90%+
          size: progressPercent < 0.3 ? 1 + Math.random() * 2 : // Small pixels early
                progressPercent < 0.6 ? 2 + Math.random() * 4 : // Medium pixels mid
                progressPercent < 0.8 ? 3 + Math.random() * 6 : // Large pixels late
                progressPercent < 0.9 ? 4 + Math.random() * 12 : // Huge chaotic pixels
                6 + Math.random() * 18, // MASSIVE overwhelming pixels at 90%+
          glitchType,
          intensity: 0.3 + (progressPercent * 0.7), // 0.3 to 1.0 intensity
        }
      })

      setPixels(prev => {
        // Exponentially growing pixel limit - MUCH higher at the end
        const maxPixels = progressPercent < 0.9 ? 
          Math.floor(50 + (exponentialFactor * 300)) : // 50 to 350 pixels normally
          Math.floor(200 + (exponentialFactor * 500)) // 200 to 700 pixels at 90%+
        const updated = [...prev, ...newPixels].slice(-maxPixels)
        return updated
      })

      // Set next interval based on current progress
      pixelInterval = setTimeout(addPixels, interval)
    }

    // Start adding pixels
    addPixels()

    return () => {
      clearInterval(progressInterval)
      clearTimeout(pixelInterval)
    }
  }, [isVisible, progress, isCompleting, onComplete])

  if (!isVisible && !isCompleting) return null

  // Calculate intensity and animation timing based on progress
  const progressPercent = progress / 100
  const intensity = Math.min(progressPercent, 1)

  // Get glitch animation for pixel type
  const getGlitchAnimation = (glitchType: string, intensity: number, size: number) => {
    const baseSpeed = 1.5 - (intensity * 1.2) // MUCH faster animations at high progress
    const isExtreme = progressPercent > 0.9 // Extra effects at 90%+
    
    switch (glitchType) {
      case 'flicker':
        return {
          animation: `subtlePixelFlip ${baseSpeed * 0.6}s ease-in-out infinite alternate${isExtreme ? ', glitchFlicker 0.05s linear infinite' : ''}`,
          filter: `brightness(${isExtreme ? 2 : 1.5}) contrast(${isExtreme ? 1.8 : 1.2})`,
        }
      case 'corrupt':
        return {
          animation: `subtlePixelFlip ${baseSpeed * 0.4}s ease-in-out infinite, glitchFlicker ${isExtreme ? '0.05s' : '0.1s'} linear infinite`,
          filter: `hue-rotate(${isExtreme ? 90 : 45}deg) saturate(${isExtreme ? 2.5 : 1.5})`,
          transform: `scale(${1 + Math.random() * (isExtreme ? 1 : 0.5)}) skew(${Math.random() * (isExtreme ? 20 : 10) - (isExtreme ? 10 : 5)}deg)`,
        }
      case 'burst':
        return {
          animation: `subtlePixelFlip ${baseSpeed * 0.3}s ease-in-out infinite, pulse ${baseSpeed * (isExtreme ? 0.5 : 1)}s ease-in-out infinite`,
          filter: `brightness(${isExtreme ? 3 : 2}) blur(${isExtreme ? 2 : 1}px)`,
          transform: `scale(${1.5 + Math.random() * (isExtreme ? 1.5 : 1)})`,
        }
      default:
        return {
          animation: `subtlePixelFlip ${baseSpeed}s ease-in-out forwards`,
          filter: isExtreme ? 'brightness(1.3)' : 'none',
        }
    }
  }

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {pixels.map((pixel) => {
        const glitchStyle = getGlitchAnimation(pixel.glitchType, pixel.intensity, pixel.size)
        const baseOpacity = progressPercent < 0.3 ? 0.1 + (pixel.intensity * 0.2) : // Very subtle early
                            progressPercent < 0.6 ? 0.2 + (pixel.intensity * 0.3) : // More visible mid
                            progressPercent < 0.8 ? 0.3 + (pixel.intensity * 0.4) : // Prominent late
                            progressPercent < 0.9 ? 0.4 + (pixel.intensity * 0.5) : // Overwhelming at 90%
                            0.6 + (pixel.intensity * 0.4) // EXTREMELY overwhelming at 90%+
        
        // Color progression from subtle to chaotic
        const getPixelColor = () => {
          if (progressPercent < 0.3) return '#2d2d2d'
          if (progressPercent < 0.6) return Math.random() > 0.7 ? '#4a5a4a' : '#2d2d2d'
          if (progressPercent < 0.8) {
            const colors = ['#2d2d2d', '#4a5a4a', '#5a4a4a', '#3a3a3a']
            return colors[Math.floor(Math.random() * colors.length)]
          }
          if (progressPercent < 0.9) {
            // More chaotic color at high progress
            const colors = ['#2d2d2d', '#4a5a4a', '#5a4a4a', '#3a3a3a', '#6a5a5a', '#4a4a5a']
            return colors[Math.floor(Math.random() * colors.length)]
          }
          // EXTREMELY chaotic colors at 90%+
          const colors = ['#2d2d2d', '#4a5a4a', '#5a4a4a', '#3a3a3a', '#6a5a5a', '#4a4a5a', '#7a6a6a', '#5a5a6a', '#6a4a4a']
          return colors[Math.floor(Math.random() * colors.length)]
        }

        return (
          <div
            key={pixel.id}
            className="absolute"
            style={{
              left: `${pixel.x}px`,
              top: `${pixel.y}px`,
              width: `${pixel.size}px`,
              height: `${pixel.size}px`,
              backgroundColor: getPixelColor(),
              opacity: baseOpacity,
              animationDelay: `${pixel.delay}s`,
              borderRadius: '0', // All pixels are squares now
              ...glitchStyle,
            }}
          />
        )
      })}
      
      {/* Enhanced Progress indicator with animated bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        {/* Progress bar with smooth animation */}
        <div className="w-48 h-2 bg-gray-700 rounded-full mb-3 overflow-hidden shadow-lg">
          <div 
            className="h-full bg-gradient-to-r from-[#4a5a4a] via-[#5a5a5a] to-[#4a5a4a] rounded-full relative transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`,
              boxShadow: progressPercent > 0.7 ? '0 0 10px rgba(74, 90, 74, 0.6)' : 'none',
              filter: progressPercent > 0.8 ? 'brightness(1.2)' : 'none',
            }}
          >
            {/* Animated shimmer effect on progress bar */}
            {progress > 0 && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                style={{
                  animation: progressPercent > 0.5 ? 'dataStream 1.5s linear infinite' : 'dataStream 3s linear infinite',
                  transform: 'translateX(-100%)',
                }}
              />
            )}
          </div>
        </div>
        
        {/* Status text with glitch effect at high progress */}
        <div 
          className={`text-center text-[#2d2d2d] font-gothic text-sm ${progressPercent > 0.8 ? 'animate-pulse' : ''}`}
          style={{
            filter: progressPercent > 0.9 ? 'brightness(1.5) contrast(1.2)' : 'none',
            textShadow: progressPercent > 0.8 ? '0 0 5px rgba(45, 45, 45, 0.5)' : 'none',
          }}
        >
          {progress < 20 && "INITIALIZING..."}
          {progress >= 20 && progress < 40 && "PROCESSING..."}
          {progress >= 40 && progress < 60 && "ANALYZING..."}
          {progress >= 60 && progress < 80 && "CREATING..."}
          {progress >= 80 && progress < 95 && "FINALIZING..."}
          {progress >= 95 && "COMPLETING..."}
        </div>
        
        {/* Percentage with enhanced styling */}
        <div 
          className={`text-center text-[#2d2d2d] font-gothic text-xs mt-1 ${progressPercent > 0.8 ? 'font-bold' : 'opacity-60'}`}
          style={{
            filter: progressPercent > 0.9 ? 'brightness(1.3)' : 'none',
            animation: progressPercent > 0.95 ? 'glitchFlicker 0.2s linear infinite' : 'none',
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
