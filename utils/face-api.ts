"use client"

import * as faceapi from "face-api.js"

// Flag to track if models are loaded
let modelsLoaded = false

// Load models directly from memory instead of from URLs
export async function loadFaceApiModels() {
  if (modelsLoaded) return

  try {
    console.log("Attempting to load face-api.js models...")

    // Use a simpler model that's more reliable
    await faceapi.nets.tinyFaceDetector.load("/")

    // Only load what we absolutely need
    await faceapi.nets.faceRecognitionNet.load("/")

    modelsLoaded = true
    console.log("Face-API models loaded successfully")
    return true
  } catch (error) {
    console.error("Error loading Face-API models:", error)

    // More helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load face models: ${errorMessage}. Try refreshing the page.`)
  }
}

// Detect face and generate descriptor
export async function generateFaceDescriptor(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
  if (!modelsLoaded) {
    await loadFaceApiModels()
  }

  try {
    // Use only TinyFaceDetector for better performance and reliability
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

    // Detect face
    const detection = await faceapi.detectSingleFace(videoElement, options)

    if (!detection) {
      console.log("No face detected")
      return null
    }

    // Get face descriptor
    const descriptor = await faceapi.computeFaceDescriptor(videoElement)

    if (!descriptor) {
      console.log("Could not compute face descriptor")
      return null
    }

    return descriptor as Float32Array
  } catch (error) {
    console.error("Error generating face descriptor:", error)
    return null
  }
}

// Convert descriptor to base64 string
export function descriptorToBase64(descriptor: Float32Array): string {
  // Convert Float32Array to regular array
  const array = Array.from(descriptor)

  // Convert to JSON string
  const jsonString = JSON.stringify(array)

  // Convert to base64
  return btoa(jsonString)
}

// Convert base64 string back to descriptor
export function base64ToDescriptor(base64String: string): Float32Array {
  // Decode base64 to JSON string
  const jsonString = atob(base64String)

  // Parse JSON string to array
  const array = JSON.parse(jsonString)

  // Convert to Float32Array
  return new Float32Array(array)
}
