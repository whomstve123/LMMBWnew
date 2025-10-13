"use client"
// Helper to send logs to server
function logToServer(message: string, data?: any) {
  fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, data, ts: Date.now() })
  }).catch(() => {})
}

import React, { useState, useRef, useEffect } from "react"

interface CustomAudioPlayerProps {
  src: string
  onLoadedData?: () => void
  onError?: (error: any) => void
  onPlay?: () => void
}

export default function CustomAudioPlayer({ src, onLoadedData, onError, onPlay }: CustomAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(12).fill(0))
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedData = () => {
      logToServer('[CustomAudioPlayer] loadeddata event fired', {src, duration: audio.duration})
      setIsLoaded(true)
      setDuration(audio.duration)
      setupAudioContext()
      onLoadedData?.()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      logToServer('[CustomAudioPlayer] timeupdate', {currentTime: audio.currentTime})
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      stopVisualizer()
      logToServer('[CustomAudioPlayer] ended event')
    }

    const handleError = (e: any) => {
      logToServer('[CustomAudioPlayer] Audio error', e)
      setError('PLAYBACK ERROR')
      onError?.(e)
    }

    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    logToServer('[CustomAudioPlayer] Event listeners attached', {src})

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      stopVisualizer()
      logToServer('[CustomAudioPlayer] Event listeners detached', {src})
    }
  }, [onLoadedData, onError])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      stopVisualizer()
    } else {
      audio.play()
      startVisualizer()
      if (onPlay) onPlay();
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const setupAudioContext = () => {
    // Simplified - no real audio context needed for fake visualizer
  }

  const startVisualizer = () => {
    let frame = 0
    const animate = () => {
      // Create fake but convincingly random visualizer data
      const bars = []
      for (let i = 0; i < 12; i++) {
        // Each bar has its own rhythm and pattern
        const baseFreq = 0.02 + (i * 0.01) // Different frequency for each bar
        const phase = (frame * baseFreq) + (i * 0.5)
        
        // Combine multiple sine waves for more natural movement
        const primary = Math.sin(phase) * 0.4
        const secondary = Math.sin(phase * 2.3) * 0.3
        const tertiary = Math.sin(phase * 0.7) * 0.2
        const random = (Math.random() - 0.5) * 0.1
        
        // Normalize and ensure positive values
        let value = (primary + secondary + tertiary + random + 1) / 2
        
        // Add some randomness and ensure minimum activity
        value = Math.max(value * (0.3 + Math.random() * 0.7), 0.1)
        
        bars.push(Math.min(value, 1))
      }
      
      setVisualizerData(bars)
      frame++
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    // Gradually fade out instead of instant stop
    const fadeOut = () => {
      setVisualizerData(prev => prev.map(val => Math.max(val * 0.85, 0)))
    }
    const fadeInterval = setInterval(() => {
      setVisualizerData(prev => {
        const newData = prev.map(val => Math.max(val * 0.85, 0))
        if (Math.max(...newData) < 0.05) {
          clearInterval(fadeInterval)
          setVisualizerData(Array(12).fill(0))
        }
        return newData
      })
    }, 50)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
      <div className="w-full bg-[#1a1a1a] border-2 border-[#2d2d2d] relative" style={{
        borderStyle: 'solid',
        boxShadow: 'none',
        borderColor: '#2d2d2d'
      }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* LCD-style display */}
      <div className="bg-[#0a0a0a] mx-3 mt-3 p-3 border-2 border-[#2d2d2d]" style={{
        borderColor: '#2d2d2d',
        boxShadow: 'none'
      }}>
        {/* Track info display */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-[#4a5a4a] font-mono text-xs tracking-wider">
            {isLoaded ? "TRACK 01" : "LOADING"}
          </div>
          <div className="text-[#4a5a4a] font-mono text-xs">
            {isLoaded ? `${Math.round(volume * 100)}` : "--"}
          </div>
        </div>

        {/* Audio Visualizer - Bright Luminous 90s LED style */}
        <div className="flex justify-center items-end space-x-1 mb-3 h-8">
          {visualizerData.map((value, index) => {
            const height = Math.max(value * 28, 2) // 2px minimum, 28px max
            const segments = Math.ceil(height / 4) // Each segment is 4px
            
            return (
              <div key={index} className="flex flex-col-reverse items-center" style={{ width: '6px' }}>
                {Array.from({ length: 7 }, (_, segmentIndex) => {
                  const isActive = segmentIndex < segments
                  const intensity = isActive ? Math.max(value - (segmentIndex * 0.12), 0.3) : 0
                  
                  // Determine LED class based on position and activity
                  let ledClass = 'led-segment inactive'
                  if (isActive) {
                    if (segmentIndex < 3) ledClass = 'led-segment active-low'
                    else if (segmentIndex < 5) ledClass = 'led-segment active-mid'  
                    else ledClass = 'led-segment active-high'
                  }
                  
                  return (
                    <div
                      key={segmentIndex}
                      className={`${ledClass} mb-0.5`}
                      style={{
                        width: '6px',
                        height: '3px',
                        opacity: isActive ? 0.95 + (intensity * 0.05) : 0.25,
                        animationDelay: isActive ? `${index * 0.08 + segmentIndex * 0.03}s` : '0s',
                        filter: isActive ? `brightness(${1.2 + intensity * 0.3})` : 'brightness(0.3)'
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
        
        {/* Time display - smaller now */}
        <div className="text-center">
          <div className="text-[#4a5a4a] font-mono text-xl tracking-widest">
            {isLoaded ? formatTime(currentTime) : "--:--"}
          </div>
          <div className="text-[#2d2d2d] font-mono text-xs mt-1">
            {isLoaded ? `/ ${formatTime(duration)}` : "/ --:--"}
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="p-4 pt-3">
        {/* Progress bar - chunky 90s style */}
        <div className="mb-4">
          <div 
            className="w-full h-3 bg-[#0a0a0a] cursor-pointer border border-[#2d2d2d] relative"
            onClick={handleSeek}
            style={{
              borderTopColor: '#0a0a0a',
              borderLeftColor: '#0a0a0a',
              borderRightColor: '#3a3a3a',
              borderBottomColor: '#3a3a3a'
            }}
          >
            {/* Progress fill */}
            <div 
              className="h-full bg-[#4a5a4a] relative transition-all duration-100"
              style={{ 
                width: `${progressPercent}%`,
                background: 'linear-gradient(to bottom, #5a5a5a, #4a5a4a, #3a3a3a)'
              }}
            />
          </div>
        </div>

        {/* Button row */}
        <div className="flex items-center justify-center space-x-4">
          {/* Play/Pause - chunky square button */}
          <button
            onClick={togglePlayPause}
            disabled={!isLoaded}
            className="w-12 h-12 bg-[#2d2d2d] border-2 border-[#2d2d2d] flex items-center justify-center font-mono text-[#e8e6d9] text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-100"
            style={{
              boxShadow: 'none'
            }}
          >
            {!isLoaded ? "•••" : isPlaying ? "⏸" : "▶"}
          </button>

          {/* Volume controls - interactive */}
          <div className="flex items-center space-x-2">
            <div className="text-[#4a5a4a] font-mono text-xs">VOL</div>
            <div 
              className="flex space-x-1 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const newVolume = Math.max(0, Math.min(1, clickX / rect.width))
                const audio = audioRef.current
                if (audio) {
                  audio.volume = newVolume
                  setVolume(newVolume)
                }
              }}
            >
              {[1,2,3,4,5,6,7,8].map((level) => (
                <div
                  key={level}
                  className={`w-1 h-4 border border-[#2d2d2d] cursor-pointer transition-all duration-100 ${
                    volume * 8 >= level ? 'bg-[#4a5a4a] shadow-[0_0_8px_2px_#4a5a4a]' : 'bg-[#0a0a0a]'
                  }`}
                  style={{
                    background: 'none'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Remove the hidden range input since we now have interactive volume bars */}
      </div>

      {/* Loading state overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#1a1a1a] bg-opacity-95 flex items-center justify-center">
          <div className="text-[#4a5a4a] font-mono text-sm tracking-wider animate-pulse">
            INITIALIZING...
          </div>
        </div>
      )}
      
      {/* Removed error overlay */}
    </div>
  )
}
