import type React from "react"
import "./globals.css"
import { bebasNeue, lugrasimo, legendScript } from "./fonts"
// Import client components directly. Server components can render client
// components by importing them (no need for next/dynamic with ssr:false here).
import FullscreenHelper from "@/components/fullscreen-helper"
import FullscreenToggle from "@/components/fullscreen-toggle"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${bebasNeue.variable} ${lugrasimo.variable} ${legendScript.variable}`}>
        {/* Mount fullscreen helper and global toggle on every page (client-side only) */}
        <FullscreenHelper />
        <FullscreenToggle />
        {children}
      </body>
    </html>
  )
}


import './globals.css'

export const metadata = {
      generator: 'v0.dev'
    };
