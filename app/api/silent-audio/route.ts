import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { exec } from "child_process"
import { promisify } from "util"
import crypto from "crypto"

const execPromise = promisify(exec)

export async function GET(request: Request) {
  try {
    // Generate a unique ID for this track
    const url = new URL(request.url)
    const id = url.searchParams.get("id") || crypto.randomBytes(5).toString("hex")

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "public", "generated")
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `silent-${id}.mp3`)

    // Create a silent audio file
    const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -c:a libmp3lame -q:a 4 "${outputPath}"`
    await execPromise(command)

    // Return the URL to the generated audio file
    const audioUrl = `/generated/silent-${id}.mp3`

    return NextResponse.json({
      success: true,
      audioUrl,
      id,
    })
  } catch (error) {
    console.error("Silent audio generation error:", error)

    return NextResponse.json(
      {
        error: "Failed to generate silent audio",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
