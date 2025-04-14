"use client"

/**
 * A fallback implementation for face detection when face-api.js models aren't available
 * This uses a simple approach to detect significant changes in the image that might indicate a face
 */
export async function detectFaceInImage(videoElement: HTMLVideoElement): Promise<boolean> {
  // Create a canvas to analyze the video frame
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) return false

  // Set canvas size to match video
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight

  // Draw the current video frame to the canvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  // Get image data from the center portion of the frame where a face would likely be
  const centerX = Math.floor(canvas.width / 2)
  const centerY = Math.floor(canvas.height / 2)
  const sampleSize = Math.min(100, Math.floor(canvas.width / 4), Math.floor(canvas.height / 4))

  const imageData = context.getImageData(centerX - sampleSize / 2, centerY - sampleSize / 2, sampleSize, sampleSize)

  // Analyze pixel data to detect significant variation (which might indicate a face)
  const data = imageData.data
  let totalBrightness = 0
  let pixelCount = 0
  let minBrightness = 255
  let maxBrightness = 0

  // Sample pixels to calculate brightness variation
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Calculate brightness using perceived luminance formula
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b

    totalBrightness += brightness
    pixelCount++

    minBrightness = Math.min(minBrightness, brightness)
    maxBrightness = Math.max(maxBrightness, brightness)
  }

  // Calculate average brightness and variation
  const avgBrightness = totalBrightness / pixelCount
  const brightnessRange = maxBrightness - minBrightness

  // Check if there's significant variation in brightness (might indicate a face)
  // and that the average brightness is in a reasonable range (not too dark or bright)
  const hasFace = brightnessRange > 30 && avgBrightness > 40 && avgBrightness < 220

  return hasFace
}

/**
 * Generate a simple hash from an image that can be used as a fallback
 * when face-api.js is not available
 */
export async function generateSimpleImageHash(videoElement: HTMLVideoElement): Promise<string | null> {
  // First check if we detect a face-like pattern
  const hasFace = await detectFaceInImage(videoElement)

  if (!hasFace) {
    return null
  }

  // Create a canvas to generate a simplified "hash" from the image
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) return null

  // Use a small size for the hash
  canvas.width = 16
  canvas.height = 16

  // Draw the video frame at a reduced size
  context.drawImage(videoElement, 0, 0, 16, 16)

  // Get the pixel data
  const imageData = context.getImageData(0, 0, 16, 16)
  const data = imageData.data

  // Create a simplified hash from the pixel data
  const hashData = []
  for (let i = 0; i < data.length; i += 16) {
    hashData.push(data[i], data[i + 1], data[i + 2])
  }

  // Convert to base64
  const hashString = hashData.join(",")
  return btoa(hashString)
}
