import crypto from "crypto"

// Supabase storage base URL - replace with your actual Supabase URL
const SUPABASE_URL = "https://stvydnlkuyjdcfgroqaw.supabase.co/storage/v1/object/public/stems"

// Categories of audio stems
export const STEM_CATEGORIES = ["bass", "pads", "noise", "arps", "vox", "leads"]

// File prefix for each category
const FILE_PREFIX = {
  bass: "b",
  pads: "p",
  noise: "n",
  arps: "arp",
  vox: "vx",
  leads: "ld",
}

// Number of stems per category
const STEMS_PER_CATEGORY: Record<string, number> = {
  bass: 5,
  pads: 5,
  noise: 5,
  arps: 8,
  vox: 8,
  leads: 3,
}

/**
 * Deterministically selects stems based on trackId (from descriptor)
 * @param trackId - The track ID generated from the descriptor
 * @returns Object with selected stem URLs for each category
 */
export function selectStemsFromHash(trackId: string) {
  // Create a deterministic hash from the trackId
  const hash = crypto.createHash("md5").update(trackId).digest("hex")

  // Select one stem from each category
  const selectedStems: Record<string, string> = {}

  // Use a rolling hash segment for each category to avoid NaN
  STEM_CATEGORIES.forEach((category, index) => {
    // Use 6 hex chars per category, wrap around if needed
    const segmentLength = 6;
    const start = (index * segmentLength) % hash.length;
    const end = start + segmentLength;
    const categoryHash = hash.substring(start, end);
    const hashNum = Number.parseInt(categoryHash, 16);
    const selectedIndex = (hashNum % STEMS_PER_CATEGORY[category]) + 1;
    const prefix = FILE_PREFIX[category as keyof typeof FILE_PREFIX];
    const fileName = `${prefix}${selectedIndex}.wav`;
    const stemUrl = `${SUPABASE_URL}/${category}/${fileName}`;
    selectedStems[category] = stemUrl;
  });

  return selectedStems
}
