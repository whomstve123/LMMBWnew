import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import crypto from "crypto"
import { pipeline } from "stream/promises"
import fetch from "node-fetch"

const execPromise = promisify(exec)

/**
 * Downloads a file from a URL to a local path
 * @param url - The URL of the file to download
 * @param outputPath - The path where the file should be saved
 */
export async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.status} ${response.statusText}`)
  }

  const fileStream = fs.createWriteStream(outputPath)
  await pipeline(response.body as any, fileStream)
}

/**
 * Downloads multiple stems to the /tmp directory
 * @param stemUrls - Object with stem URLs for each category
 * @returns Object with local file paths for each downloaded stem
 */
export async function downloadStems(stemUrls: Record<string, string>): Promise<Record<string, string>> {
  const localPaths: Record<string, string> = {}

  // Create a temporary directory for this processing job
  const jobId = crypto.randomBytes(8).toString("hex")
  const tmpDir = path.join("/tmp", jobId)

  try {
    // Create the temporary directory
    fs.mkdirSync(tmpDir, { recursive: true })

    // Download each stem
    const downloadPromises = Object.entries(stemUrls).map(async ([category, url]) => {
      const filename = `${category}-${path.basename(url)}`
      const localPath = path.join(tmpDir, filename)

      await downloadFile(url, localPath)
      localPaths[category] = localPath
    })

    await Promise.all(downloadPromises)
    return localPaths
  } catch (error) {
    // Clean up if there's an error
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.error("Error cleaning up temporary directory:", cleanupError)
    }

    throw error
  }
}

/**
 * Combines multiple audio stems into a single MP3 file using ffmpeg
 * @param stemPaths - Object with local file paths for each stem
 * @param outputPath - The path where the combined file should be saved
 * @returns The path to the combined audio file
 */
export async function combineStems(stemPaths: Record<string, string>, outputPath: string): Promise<string> {
  try {
    // Create the ffmpeg command to mix all stems
    // This creates a filter_complex to mix all input audio files
    const inputs = Object.values(stemPaths)
      .map((path) => `-i "${path}"`)
      .join(" ")
    const filterComplex = `amix=inputs=${Object.keys(stemPaths).length}:duration=longest:dropout_transition=2`

    const command = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -c:a libmp3lame -q:a 2 "${outputPath}"`

    // Execute the ffmpeg command
    await execPromise(command)

    return outputPath
  } catch (error) {
    console.error("Error combining stems:", error)
    throw new Error(`Failed to combine audio stems: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Processes a complete audio generation job
 * @param faceHash - The hash generated from face detection
 * @param stemUrls - Object with stem URLs for each category
 * @returns The path to the generated audio file
 */
export async function processAudioJob(faceHash: string, stemUrls: Record<string, string>): Promise<string> {
  // Create a unique ID for this track based on the face hash
  const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10)

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "public", "generated")
  fs.mkdirSync(outputDir, { recursive: true })

  const outputPath = path.join(outputDir, `${trackId}.mp3`)

  try {
    // Download the stems
    const localStemPaths = await downloadStems(stemUrls)

    // Combine the stems
    await combineStems(localStemPaths, outputPath)

    // Clean up the temporary files
    const tmpDir = path.dirname(Object.values(localStemPaths)[0])
    fs.rmSync(tmpDir, { recursive: true, force: true })

    return `/generated/${trackId}.mp3`
  } catch (error) {
    console.error("Error processing audio job:", error)
    throw error
  }
}
