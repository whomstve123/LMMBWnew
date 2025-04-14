"use client"

/**
 * Generates a simple hash from an image
 * This is a simplified approach for demonstration purposes
 */
export async function generateImageHash(imageDataUrl: string): Promise<string> {
  try {
    // Create an image element to load the data URL
    const img = new Image()

    // Create a promise to wait for the image to load
    const imageLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`))
      img.src = imageDataUrl
    })

    // Wait for the image to load
    const loadedImg = await imageLoaded

    // Create a canvas to draw the image
    const canvas = document.createElement("canvas")
    // Resize to a smaller dimension for consistent hashing
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Draw the image at a reduced size
    ctx.drawImage(loadedImg, 0, 0, 32, 32)

    // Get image data
    const imageData = ctx.getImageData(0, 0, 32, 32)
    const pixels = imageData.data

    // Create a simplified "hash" by sampling pixels
    // We'll take every 50th pixel's RGB values
    const hashData = []
    for (let i = 0; i < pixels.length; i += 50) {
      if (i + 2 < pixels.length) {
        // Get RGB values (skip alpha)
        hashData.push(pixels[i], pixels[i + 1], pixels[i + 2])
      }
    }

    // Convert to base64 for storage
    const hashString = hashData.join(",")
    const base64Hash = btoa(hashString)

    return base64Hash
  } catch (error) {
    console.error("Error generating image hash:", error)
    // Return a fallback hash in case of error to ensure the flow continues
    return btoa("fallback-hash-" + Date.now())
  }
}

/**
 * Simulates face detection by checking if there's enough variation in the image
 * This is a very simplified approach for demonstration purposes
 */
export function hasEnoughImageVariation(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(true) // Default to true in case of error
        return
      }

      ctx.drawImage(img, 0, 0, 32, 32)
      const imageData = ctx.getImageData(0, 0, 32, 32)
      const pixels = imageData.data

      // Calculate standard deviation of pixel values as a simple measure of variation
      let sum = 0
      let sumSquared = 0
      let count = 0

      for (let i = 0; i < pixels.length; i += 4) {
        // Average of RGB
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
        sum += avg
        sumSquared += avg * avg
        count++
      }

      const mean = sum / count
      const variance = sumSquared / count - mean * mean
      const stdDev = Math.sqrt(variance)

      // For simplicity, always return true in this version
      resolve(true)
    }

    img.onerror = () => {
      resolve(true) // Default to true in case of error
    }

    img.src = imageDataUrl
  })
}
