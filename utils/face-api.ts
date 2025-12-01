"use client"

// Avoid statically importing `face-api.js` here — dynamic import in browser-only flows prevents
// the bundler from pulling in node-only modules like `fs` and `encoding`.
let faceapi: any = null
let modelsLoaded = false

async function ensureFaceApiImported() {
  if (faceapi) return faceapi
  try {
    const pkg = 'face-api.js'
    // import via variable to avoid bundlers statically resolving this on the server
    faceapi = await import(pkg)
    return faceapi
  } catch (err) {
    console.error('Failed to import face-api.js dynamically:', err)
    throw err
  }
}

// Load models if needed. `modelBaseUrl` should point to `/models` in production.
export async function loadFaceApiModels(modelBaseUrl = "/models") {
  if (modelsLoaded) return true
  const api = await ensureFaceApiImported()
  try {
    await api.nets.tinyFaceDetector.load(modelBaseUrl)
    await api.nets.faceLandmark68Net.load(modelBaseUrl)
    await api.nets.faceRecognitionNet.load(modelBaseUrl)
    modelsLoaded = true
    return true
  } catch (error) {
    console.error('Error loading Face-API models:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load face models: ${errorMessage}. Try refreshing the page.`)
  }
}

// Detect face and generate descriptor
export async function generateFaceDescriptor(videoElement: HTMLVideoElement): Promise<Float32Array | { error: string } | null> {
  const api = await ensureFaceApiImported()
  if (!modelsLoaded) {
    await loadFaceApiModels()
  }

  try {
    const options = new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    const detection = await api.detectSingleFace(videoElement, options)
    if (!detection) return null

    const minScore = 0.6
    if (detection.score < minScore) {
      return { error: `Face detected but score too low (${detection.score}). Scan rejected.` }
    }
    const box = detection.box
    if (box.width < 100 || box.height < 100) {
      return { error: `Face detected but bounding box too small (${box.width}x${box.height}).` }
    }

  // Compute descriptor
  const descriptor = await api.computeFaceDescriptor(videoElement)
    if (!descriptor) return null

    // Return raw descriptor (normalization/quantization helpers are provided separately)
    return descriptor as Float32Array
  } catch (error) {
    console.error('Error generating face descriptor:', error)
    return null
  }
}

export function descriptorToBase64(descriptor: Float32Array): string {
  const array = Array.from(descriptor)
  const jsonString = JSON.stringify(array)
  return btoa(jsonString)
}

export function base64ToDescriptor(base64String: string): Float32Array {
  const jsonString = atob(base64String)
  const array = JSON.parse(jsonString)
  return new Float32Array(array)
}

// New helper: normalize (L2) and quantize descriptor to integers for deterministic hashing
export function normalizeAndQuantize(descriptor: Float32Array | number[], multiplier = 1000): number[] {
  const arr = Array.from(descriptor as any as number[])
  // L2-normalize
  const l2 = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1
  const normalized = arr.map(v => v / l2)
  // Quantize
  const quantized = normalized.map(v => Math.round(v * multiplier))
  return quantized
}
