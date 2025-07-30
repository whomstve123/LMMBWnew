"use client"

import React, { useEffect, useState } from "react"

interface MosaicOverlayProps {
  isVisible: boolean
}

export default function MosaicOverlay({ isVisible }: MosaicOverlayProps) {
  const [tiles, setTiles] = useState<number[]>([])

  useEffect(() => {
    if (isVisible) {
      // Create 300 tiles (20x15 grid)
      const tileArray = Array.from({ length: 300 }, (_, i) => i)
      setTiles(tileArray)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="mosaic-overlay">
      {tiles.map((tileIndex) => (
        <div
          key={tileIndex}
          className="mosaic-tile"
          style={{
            '--delay': Math.floor(Math.random() * 50) + tileIndex * 0.1,
          } as React.CSSProperties}
        />
      ))}
      
      {/* Loading text overlay */}
      <div className="fixed inset-0 flex items-center justify-center z-10">
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-gothic text-white mb-4">
            PROCESSING...
          </div>
          <div className="text-xl md:text-2xl font-legend text-green-400">
            Preparing Your Mind Un-Wanderer Experience
          </div>
        </div>
      </div>
    </div>
  )
}
