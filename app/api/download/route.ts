import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const bucketName = "generated"

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const hash = url.searchParams.get("hash")

    if (!hash) {
      return NextResponse.json({ error: "Hash parameter is required" }, { status: 400 })
    }

    // Generate track ID from hash
    const trackId = crypto.createHash("md5").update(hash).digest("hex").substring(0, 10)
    const filePath = `${trackId}.mp3`

    // Fetch file from Supabase Storage
    const { data, error } = await supabase.storage.from(bucketName).download(filePath)
    if (error || !data) {
      return NextResponse.json({ error: "Audio file not found in Supabase Storage" }, { status: 404 })
    }

    // Read the file as a buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename=\"mind-unwanderer-${trackId}.mp3\"`,
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
