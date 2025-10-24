"use client"
import { useEffect, useState } from "react"

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement as any
      if (el.requestFullscreen) {
        // @ts-ignore navigationUI exists in some browsers
        await el.requestFullscreen({ navigationUI: 'hide' })
      } else if (el.webkitRequestFullscreen) {
        // Safari fallback
        el.webkitRequestFullscreen()
      }
    } catch (err) {
      // ignore
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen()
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
    } catch (err) {
      // ignore
    }
  }

  const toggle = async () => {
    if (isFullscreen) await exitFullscreen()
    else await enterFullscreen()
  }

  return (
    // Hide the control while fullscreen is active so user exits with Escape only
    !isFullscreen ? (
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 60 }}>
        <button
          onClick={toggle}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Enter Fullscreen
        </button>
      </div>
    ) : null
  )
}
