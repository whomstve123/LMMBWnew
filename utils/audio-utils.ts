import crypto from "crypto"

// Supabase storage base URL
const SUPABASE_URL = "https://stvydnlkuyjdcfgroqaw.supabase.co/storage/v1/object/public/stems"

// Categories of audio stems
export const STEM_CATEGORIES = ["drums", "pads", "bass", "noise"]

// File prefix for each category
const FILE_PREFIX = {
  drums: "d",
  pads: "p",
  bass: "b",
  noise: "n",
}

// Number of stems per category
const STEMS_PER_CATEGORY = 5

// Function to deterministically select stems based on face hash
export function selectStemsFromHash(faceHash: string) {
  // Create a deterministic hash from the faceHash
  const hash = crypto.createHash("md5").update(faceHash).digest("hex")

  // Select one stem from each category
  const selectedStems: Record<string, string> = {}

  STEM_CATEGORIES.forEach((category, index) => {
    // Use a different part of the hash for each category
    const categoryHash = hash.substring(index * 8, (index + 1) * 8)

    // Convert the hash segment to a number
    const hashNum = Number.parseInt(categoryHash, 16)

    // Select a stem based on the hash (1 to STEMS_PER_CATEGORY)
    const selectedIndex = (hashNum % STEMS_PER_CATEGORY) + 1

    // Create the Supabase URL for the selected stem
    const prefix = FILE_PREFIX[category as keyof typeof FILE_PREFIX]
    const fileName = `${prefix}${selectedIndex}.wav`
    const stemUrl = `${SUPABASE_URL}/${category}/${fileName}`

    selectedStems[category] = stemUrl
  })

  return selectedStems
}

// Client-side function to combine audio buffers (fallback if server processing fails)
export async function combineAudioBuffers(
  audioBuffers: AudioBuffer[],
  audioContext: AudioContext,
): Promise<AudioBuffer> {
  // Find the longest buffer
  let maxLength = 0
  audioBuffers.forEach((buffer) => {
    if (buffer.length > maxLength) {
      maxLength = buffer.length
    }
  })

  // Create a new buffer with the same number of channels as the first buffer
  const numberOfChannels = audioBuffers[0].numberOfChannels
  const sampleRate = audioBuffers[0].sampleRate
  const combinedBuffer = audioContext.createBuffer(numberOfChannels, maxLength, sampleRate)

  // Mix all buffers into the combined buffer
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const combinedData = combinedBuffer.getChannelData(channel)

    // Initialize with zeros
    for (let i = 0; i < maxLength; i++) {
      combinedData[i] = 0
    }

    // Add each buffer's data
    audioBuffers.forEach((buffer) => {
      const bufferData = buffer.getChannelData(channel)
      for (let i = 0; i < buffer.length; i++) {
        combinedData[i] += bufferData[i] / audioBuffers.length // Average the samples
      }
    })
  }

  return combinedBuffer
}

// Helper function to load audio from a URL
export async function loadAudioFromUrl(url: string, audioContext: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return await audioContext.decodeAudioData(arrayBuffer)
}
