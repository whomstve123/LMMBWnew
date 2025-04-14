"use client"

import { useEffect } from "react"

interface CustomFontProps {
  fontName: string
  fontUrl: string
  fontWeight?: string
  fontStyle?: string
}

export function CustomFont({ fontName, fontUrl, fontWeight = "normal", fontStyle = "normal" }: CustomFontProps) {
  useEffect(() => {
    // Create a new style element
    const style = document.createElement("style")

    // Define the @font-face rule
    const fontFace = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}') format('woff2');
        font-weight: ${fontWeight};
        font-style: ${fontStyle};
        font-display: swap;
      }
    `

    // Set the content of the style element
    style.appendChild(document.createTextNode(fontFace))

    // Append the style element to the head
    document.head.appendChild(style)

    // Clean up when the component unmounts
    return () => {
      document.head.removeChild(style)
    }
  }, [fontName, fontUrl, fontWeight, fontStyle])

  return null
}
