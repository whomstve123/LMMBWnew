import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    // Parse the request body
    let faceHash
    try {
      const body = await request.json()
      faceHash = body.faceHash
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    if (!faceHash) {
      return NextResponse.json({ error: "Face hash is required" }, { status: 400 })
    }

    // Generate a unique ID for this track
    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10)

    // Return success with trackId but no audio URL
    // We'll generate the audio on the client side
    return NextResponse.json({
      success: true,
      trackId,
      // No audioUrl - we'll generate audio on the client
    })
  } catch (error) {
    console.error("Error in simple-audio API:", error)

    return NextResponse.json(
      {
        error: "Failed to generate track",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
