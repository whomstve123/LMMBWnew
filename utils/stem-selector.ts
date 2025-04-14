import crypto from "crypto"

// Supabase storage base URL - replace with your actual Supabase URL
const SUPABASE_URL = "https://stvydnlkuyjdcfgroqaw.supabase.co/storage/v1/object/public/stems"

// Categories of audio stems
export const STEM_CATEGORIES = ["bass", "pads", "noise"]

// File prefix for each category
const FILE_PREFIX = {
  bass: "b",
  pads: "p",
  noise: "n",
}

// Number of stems per category
const STEMS_PER_CATEGORY = 5

/**
 * Deterministically selects stems based on face hash
 * @param faceHash - The hash generated from face detection
 * @returns Object with selected stem URLs for each category
 */
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
