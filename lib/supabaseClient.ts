import { NextResponse } from "next/server"
import crypto from "crypto"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execPromise = promisify(exec)
const STEM_CATEGORIES = ["drums", "pads", "bass", "noise"]
const SUPABASE_BASE_URL = "https://stvydnlkuyjdcfgroqaw.supabase.co/storage/v1/object/public/stems"

export async function POST(request: Request) {
  try {
    const { faceHash } = await request.json()

    if (!faceHash) {
      return NextResponse.json({ error: "Face hash is required" }, { status: 400 })
    }

    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10)
    const selectedStems = selectStemsFromHash(faceHash)

    // Download selected stems locally
    const localFiles: string[] = []
    for (const category of STEM_CATEGORIES) {
      const url = selectedStems[category]
      const localPath = path.join("/tmp", `${category}.wav`)
      await downloadFile(url, localPath)
      localFiles.push(localPath)
    }

    // Combine stems using ffmpeg
    const outputFile = path.join("/tmp", `${trackId}.mp3`)
    const command = buildFfmpegCommand(localFiles, outputFile)
    await execPromise(command)

    // Read the generated file and return as base64
    const fileBuffer = fs.readFileSync(outputFile)
    const base64Audio = fileBuffer.toString("base64")

    return NextResponse.json({ success: true, base64Audio, trackId })
  } catch (err) {
    console.error("Track generation error:", err)
    return NextResponse.json({ error: "Failed to generate track" }, { status: 500 })
  }
}

function selectStemsFromHash(faceHash: string) {
  const hash = crypto.createHash("md5").update(faceHash).digest("hex")
  const selectedStems: Record<string, string> = {}

  STEM_CATEGORIES.forEach((category, index) => {
    const segment = hash.substring(index * 8, (index + 1) * 8)
    const number = parseInt(segment, 16)
    const stemIndex = (number % 5) + 1

    let prefix = category[0]
    if (category === "pads") prefix = "p"
    if (category === "noise") prefix = "n"

    const fileName = `${prefix}${stemIndex}.wav`
    const url = `${SUPABASE_BASE_URL}/${category}/${fileName}`
    selectedStems[category] = url
  })

  return selectedStems
}

function buildFfmpegCommand(inputs: string[], output: string) {
  const inputFlags = inputs.map(i => `-i "${i}"`).join(" ")
  const filter = inputs.map((_, i) => `[${i}:a]`).join("") + `amix=inputs=${inputs.length}:duration=longest`
  return `ffmpeg ${inputFlags} -filter_complex "${filter}" -c:a libmp3lame -q:a 4 "${output}"`
}

async function downloadFile(url: string, destination: string) {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  fs.writeFileSync(destination, Buffer.from(buffer))
}
