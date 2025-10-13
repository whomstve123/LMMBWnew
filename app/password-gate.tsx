"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

// Pixelated dissolve overlay (top-level)

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [phase, setPhase] = useState<'idle'|'dots'|'align'|'dissolve'|'done'>('idle')
  const [hideText, setHideText] = useState(false)
  const router = useRouter()

  // Generate random angles for dots on first render
  const randomAnglesRef = useRef<number[]>([])
  useEffect(() => {
    if (randomAnglesRef.current.length === 0) {
      randomAnglesRef.current = [
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI,
      ]
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "opens3same") {
      setHideText(true)
      setAnimating(true)
      setPhase('align')
      setTimeout(() => setPhase('dissolve'), 900)
      setTimeout(() => {
        setUnlocked(true)
        onUnlock()
      }, 1800)
    } else {
      setError("Incorrect password")
    }
  }
  // Show dots on lines when user starts typing
  useEffect(() => {
    if (password.length > 0 && phase === 'idle') {
      setPhase('dots')
    }
    if (password.length === 0 && phase === 'dots') {
      setPhase('idle')
    }
  }, [password, phase])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black min-h-screen">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{zIndex: 1}}>
        <BohrModelSVG phase={(!animating && !unlocked) ? phase : phase} randomAngles={randomAnglesRef.current} />
        {phase === 'dissolve' && <PixelDissolveOverlay />}
      </div>
      {/* Centered password form, visually inside the Bohr frame, never overlapping lines */}
      {!animating && !unlocked && !hideText && (
        <form onSubmit={handleSubmit} className="absolute left-1/2 top-1/2 z-10 flex flex-col items-center" style={{transform: 'translate(-50%, -50%)', width: 180, minHeight: 70}}>
          <label className="mb-3 text-base font-gothic text-[#ebfdc8] tracking-widest">Enter Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-transparent border-b border-[#ebfdc8] text-[#ebfdc8] text-sm font-mono px-2 py-1 outline-none placeholder-[#ebfdc8]/60 text-center w-28"
            placeholder="Password"
            autoFocus
          />
          <button
            type="submit"
            className="mt-3 flex items-center justify-center w-8 h-8 rounded-full bg-[#ebfdc8] hover:bg-[#d0e6a5] transition-colors shadow-md"
            aria-label="Go"
            style={{border: 'none'}}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 9h8M10 7l2 2-2 2" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {error && <div className="mt-2 text-[#ebfdc8] text-xs font-mono">{error}</div>}
        </form>
      )}
    </div>
  )
}

// Pixelated dissolve overlay (top-level)
function PixelDissolveOverlay() {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none select-none pixel-dissolve" />
  )
}

function BohrModelSVG({ phase, randomAngles }: { phase: 'idle'|'dots'|'align'|'dissolve'|'done', randomAngles: number[] }) {
  // Dots are hidden in 'idle', appear on lines in 'dots', animate to 3 o'clock in 'align'
  const dotRadius = 7;
  const dotOpacity = 1;
  let outerDotAnim = null, middleDotAnim = null, innerDotAnim = null, dotInitialOpacity = 0, dotTargetOpacity = 1;
  if (phase === 'idle') {
    // Hide dots far offscreen and fully transparent
    outerDotAnim = { x: -100, y: -100 };
    middleDotAnim = { x: -100, y: -100 };
    innerDotAnim = { x: -100, y: -100 };
    dotInitialOpacity = 0;
    dotTargetOpacity = 0;
  } else if (phase === 'dots') {
    // Animate dots from offscreen to random spots, visible
    outerDotAnim = { x: 320 + 200 * Math.cos(randomAngles[0]), y: 320 + 200 * Math.sin(randomAngles[0]) };
    middleDotAnim = { x: 320 + 160 * Math.cos(randomAngles[1]), y: 320 + 160 * Math.sin(randomAngles[1]) };
    innerDotAnim = { x: 320 + 120 * Math.cos(randomAngles[2]), y: 320 + 120 * Math.sin(randomAngles[2]) };
    dotInitialOpacity = 0;
    dotTargetOpacity = 1;
  } else if (phase === 'align' || phase === 'dissolve' || phase === 'done') {
    // Dots aligned at 3 o'clock, fully visible
    outerDotAnim = { x: 320 + 200, y: 320 };
    middleDotAnim = { x: 320 + 160, y: 320 };
    innerDotAnim = { x: 320 + 120, y: 320 };
    dotInitialOpacity = 1;
    dotTargetOpacity = 1;
  }

  // Ray positions (emanating from the line at 3 o'clock)
  const rayAngles = [0, -0.15, 0.15, -0.3, 0.3];
  const rayLengths = [300, 220, 160, 200, 260];

  return (
    <>
      <svg width="640" height="640" viewBox="0 0 640 640" className="block">
        {/* Outer ring */}
        <circle cx="320" cy="320" r="200" stroke="#ebfdc8" strokeWidth="3" fill="none" filter="url(#glow)" />
        {/* Middle ring */}
        <circle cx="320" cy="320" r="160" stroke="#ebfdc8" strokeWidth="2.5" fill="none" filter="url(#glow)" />
        {/* Inner ring */}
        <circle cx="320" cy="320" r="120" stroke="#ebfdc8" strokeWidth="2" fill="none" filter="url(#glow)" />
        {/* Dots on rings, only visible when animating or typing */}
  {outerDotAnim && <circle cx={outerDotAnim.x} cy={outerDotAnim.y} r={dotRadius} fill="#ebfdc8" opacity={phase === 'idle' ? dotInitialOpacity : dotTargetOpacity} className={`dot-outer${phase === 'align' ? ' animate-dot-move' : ''}`} />}
  {middleDotAnim && <circle cx={middleDotAnim.x} cy={middleDotAnim.y} r={dotRadius} fill="#ebfdc8" opacity={phase === 'idle' ? dotInitialOpacity : dotTargetOpacity} className={`dot-middle${phase === 'align' ? ' animate-dot-move' : ''}`} />}
  {innerDotAnim && <circle cx={innerDotAnim.x} cy={innerDotAnim.y} r={dotRadius} fill="#ebfdc8" opacity={phase === 'idle' ? dotInitialOpacity : dotTargetOpacity} className={`dot-inner${phase === 'align' ? ' animate-dot-move' : ''}`} />}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      {/* Pixelated dissolve overlay for transition */}
      {phase === 'dissolve' && <div className="absolute inset-0 pointer-events-none select-none pixel-dissolve" style={{zIndex:2}} />}
      <style jsx>{`
        .dot-outer, .dot-middle, .dot-inner {
          opacity: 1;
          transition: cx 0.7s cubic-bezier(0.4,0,0.2,1), cy 0.7s cubic-bezier(0.4,0,0.2,1), filter 0.7s, opacity 0.7s;
        }
        .animate-dot-move {
          transition: cx 0.7s cubic-bezier(0.4,0,0.2,1), cy 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .pixel-dissolve {
          background: repeating-linear-gradient(90deg, #111 0px, #222 2px, #111 4px);
          animation: pixelDissolve 0.9s steps(12) forwards;
        }
        @keyframes pixelDissolve {
          0% { opacity: 0; }
          60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
