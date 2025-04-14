import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import crypto from "crypto"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const hash = url.searchParams.get("hash")

    if (!hash) {
      return NextResponse.json({ error: "Hash parameter is required" }, { status: 400 })
    }

    // Generate track ID from hash
    const trackId = crypto.createHash("md5").update(hash).digest("hex").substring(0, 10)

    // Path to the generated audio file
    const filePath = path.join(process.cwd(), "public", "generated", `${trackId}.mp3`)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Audio file not found" }, { status: 404 })
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath)

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="mind-unwanderer-${trackId}.mp3"`,
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
