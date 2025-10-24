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

    // Use /tmp for output directory
    const outputDir = "/tmp/generated"
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `silent-${id}.mp3`)

    // Create a silent audio file
    const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -c:a libmp3lame -q:a 4 "${outputPath}"`
    await execPromise(command)

    // Upload to Supabase storage
    const { createClient } = await import("@supabase/supabase-js")
    const SUPABASE_URL = process.env.SUPABASE_URL!
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const fileBuffer = fs.readFileSync(outputPath)
    const supabasePath = `silent-${id}.mp3`
    const { data, error } = await supabase.storage.from("generated").upload(supabasePath, fileBuffer, {
      contentType: "audio/mpeg",
      cacheControl: "no-cache, no-store, must-revalidate",
      upsert: true,
    })
    if (error) {
      console.error("[silent-audio] Supabase upload error:", error)
      return NextResponse.json({ error: "Failed to upload silent audio to Supabase", details: error.message }, { status: 500 })
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("generated").getPublicUrl(supabasePath)
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("[silent-audio] Could not get public URL for uploaded audio.")
      return NextResponse.json({ error: "Failed to get public URL for silent audio" }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      audioUrl: publicUrlData.publicUrl,
      id,
    })
  } catch (error) {
    console.error("Silent audio generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create silent audio",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
