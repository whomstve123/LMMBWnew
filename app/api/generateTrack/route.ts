import { NextResponse } from "next/server"
import { selectStemsFromHash } from "@/utils/stem-selector"
import { processAudioJob } from "@/utils/audio-processor"

export async function POST(request: Request) {
  try {
    console.log("Starting track generation process...")

    // Parse the request body
    let faceHash
    try {
      const body = await request.json()
      faceHash = body.faceHash
      console.log("Received face hash:", faceHash ? `${faceHash.substring(0, 10)}...` : "undefined")
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    if (!faceHash) {
      console.error("Missing face hash in request")
      return NextResponse.json({ error: "Face hash is required" }, { status: 400 })
    }

    // Select stems based on the face hash
    const selectedStems = selectStemsFromHash(faceHash)
    console.log("Selected stems:", selectedStems)

    // Process the audio job
    const audioUrl = await processAudioJob(faceHash, selectedStems)
    console.log("Generated audio URL:", audioUrl)

    // Generate a unique ID for this track based on the face hash
    const trackId = faceHash.substring(0, 10)

    return NextResponse.json({
      success: true,
      audioUrl,
      trackId,
      selectedStems,
    })
  } catch (error) {
    console.error("Track generation error:", error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: "Failed to generate track",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
