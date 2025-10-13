"use client"

import React, { useState, useEffect } from "react"

interface GlitchOverlayProps {
  isVisible: boolean
}

const messages = [
  "ANALYZING BIOMETRIC DATA...",
  "ORCHESTRATING YOUR PERSONAL SONIC PROFILE...",
  "EXTRACTING SOUNDS FROM SELF...",
  "RENDERING ECHOES...",
  "DECODING POSTOCULAR FREQUENCIES...",
  "DISTILLING IDENTITY...",
  "REPLACING ALL YOUR PARTS UNTIL YOU'RE NOT THE SHIP YOU ONCE WERE...",
  "PERFORMING PHYSIOLOGICAL SPECTROSCOPY...",
  "IDENTIFYING GHOSTS IN YOUR MACHINE...",
  "RENDERING MIRROR WAVEFORMS...",
  "REDUCING SPIRITUAL LATENCY...",
  "MERGING NEURAL NOISE...",
  "SONIFYING INDIVIDUAL TRAJECTORIES...",
  "SAMPLING GRANULES OF INDIVIDUAL PROFILE...",
  "TRANSCRIBING A SONG YOU FORGOT YOU WERE SINGING...",
  "REVERBERATING AN ECHO OF WHAT YOU COULD HAVE BEEN...",
  "SYNTHESIZING FROM FACIAL TOPOGRAPHY...",
  "CONSTRUCTING AUDIBLE ARTIFACTS OF YOUR BEING...",
  "FOSSILIZING STEREO SELF...",
  "INITIATING EMPATHETIC PITCH SYSTEM...",
  "CALCULATING SYPHONIC IDENTITY INSIGHTS...",
  "DO YOU EVER GET NERVOUS?",
  "EXTRACTING NEURAL PATTERNS...",
  "SYNTHESIZING AUDIO...",
  "READING FACIAL TOPOGRAPHY...",
  "WHAT DREAMS MAY COME?",
  "PROCESSING EMOTIONAL FREQUENCIES...",
  "MAPPING CONSCIOUSNESS WAVELENGTHS...",
  "ARE YOU LISTENING?"
]

const GlitchText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayText, setDisplayText] = useState(text)
  const [showBinary, setShowBinary] = useState(false)

  useEffect(() => {
    if (!text) return

    const interval = setInterval(() => {
      // Much higher chance of glitching for more rapid flickering
      if (Math.random() < 0.7) {
        setShowBinary(true)
        // Generate random binary for each character
        const binaryText = text.split('').map(char => 
          char === ' ' ? ' ' : (Math.random() < 0.5 ? '1' : '0')
        ).join('')
        setDisplayText(binaryText)
        
        // Switch back after a very short time
        setTimeout(() => {
          setShowBinary(false)
          setDisplayText(text)
        }, 50 + Math.random() * 100) // Much faster flicker
      }
    }, 150 + Math.random() * 200 + delay) // Much more frequent glitching

    return () => clearInterval(interval)
  }, [text, delay])

  return (
    <div className={`transition-all duration-50 ${showBinary ? 'text-red-400' : 'text-green-400'}`}>
      {displayText}
    </div>
  )
}

export default function GlitchOverlay({ isVisible }: GlitchOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length)
    }, 800 + Math.random() * 400) // Much faster cycling between 0.8-1.2 seconds

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="glitch-overlay">
      {/* Scanning lines - now all light green */}
      <div className="scan-line-glitch" />
      <div className="scan-line-glitch" />
      <div className="scan-line-glitch" />
      
      {/* Digital noise overlay */}
      <div className="digital-noise" />
      
      {/* Data streams */}
      <div className="data-stream" />
      <div className="data-stream" />
      <div className="data-stream" />
      <div className="data-stream" />
      
      {/* Flicker effect */}
      <div className="flicker-effect" />
      
      {/* Animated terminal-style text overlay */}
      <div className="absolute top-4 left-4 font-mono text-xs opacity-80">
        <GlitchText text={messages[currentMessageIndex]} />
        <GlitchText text={messages[(currentMessageIndex + 1) % messages.length]} delay={300} />
        <GlitchText text={messages[(currentMessageIndex + 2) % messages.length]} delay={600} />
      </div>
      
      {/* Corner brackets for that sci-fi look */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
    </div>
  )
}
