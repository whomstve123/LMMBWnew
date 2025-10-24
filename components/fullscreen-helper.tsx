"use client"
import { useEffect } from "react"

// Best-effort helper: when the page enters fullscreen, try to request fullscreen
// with navigationUI: 'hide' so the browser header/navigation is hidden on supported
// desktop browsers. This cannot force behavior on every browser, but attempts
// to re-request fullscreen with the hint immediately after a user-initiated
// fullscreen change (which is allowed in modern browsers as it's in response
// to a user gesture).
export default function FullscreenHelper() {
  useEffect(() => {
    let mounted = true

    const tryHideNavUI = async () => {
      if (!mounted) return
      try {
        // If we're not in fullscreen, nothing to do
        if (!document.fullscreenElement) return

        const el: any = document.fullscreenElement || document.documentElement

        // Some browsers support passing { navigationUI: 'hide' } to requestFullscreen.
        // Try to re-request fullscreen with that option. Wrap in try/catch since
        // some browsers will reject or throw when re-requesting.
        const opts = { navigationUI: 'hide' } as FullscreenOptions
        if (typeof el.requestFullscreen === 'function') {
          // If already fullscreen this call may be ignored or throw; it's safe to try
          try {
            // @ts-ignore - navigationUI is supported in supported browsers
            await el.requestFullscreen(opts)
          } catch (e) {
            // best-effort: ignore
          }
        } else if (typeof document.documentElement.requestFullscreen === 'function') {
          try {
            // @ts-ignore
            await document.documentElement.requestFullscreen(opts)
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        // swallow any errors — nothing critical
      }
    }

    const onFullscreenChange = () => {
      // When fullscreen changes, attempt to hide nav UI
      void tryHideNavUI()
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      mounted = false
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  return null
}
