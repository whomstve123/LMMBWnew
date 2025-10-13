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
    fs.mkdirSync(tmpDir, { recursive: true })
    console.log('[audio-processor] Created temp dir:', tmpDir)

    // Download each stem
    const downloadPromises = Object.entries(stemUrls).map(async ([category, url]) => {
      const filename = `${category}-${path.basename(url)}`
      const localPath = path.join(tmpDir, filename)
      console.log(`[audio-processor] Downloading ${category} from ${url} to ${localPath}`)
      await downloadFile(url, localPath)
      console.log(`[audio-processor] Downloaded ${category} to ${localPath}`)
      localPaths[category] = localPath
    })

    await Promise.all(downloadPromises)
    console.log('[audio-processor] All stems downloaded:', localPaths)
    return localPaths
  } catch (error) {
    // Clean up if there's an error
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.error("[audio-processor] Error cleaning up temporary directory:", cleanupError)
    }
    console.error('[audio-processor] Error downloading stems:', error)
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
    const categories = Object.keys(stemPaths);
    const inputs = Object.values(stemPaths)
      .map((path) => `-i "${path}"`)
      .join(" ");

    // Build volume filters for vox, leads, arps
    let filterInputs = [];
    let amixInputs = [];
    let idx = 0;
    for (const category of categories) {
      if (["vox", "leads", "arps"].includes(category)) {
        filterInputs.push(`[${idx}]volume=10.5dB[a${idx}]`);
        amixInputs.push(`[a${idx}]`);
      } else if (["bass", "pads", "noise"].includes(category)) {
        filterInputs.push(`[${idx}]volume=-1dB[a${idx}]`);
        amixInputs.push(`[a${idx}]`);
      } else {
        filterInputs.push(`[${idx}]volume=-2dB[a${idx}]`);
        amixInputs.push(`[a${idx}]`);
      }
      idx++;
    }
    const filterComplex = `${filterInputs.length > 0 ? filterInputs.join(';') + ';' : ''}${amixInputs.join('')}amix=inputs=${categories.length}:duration=longest:dropout_transition=2`;

  const ffmpegPath = path.resolve(process.cwd(), 'bin/ffmpeg');
  const command = `${ffmpegPath} ${inputs} -filter_complex "${filterComplex}" -c:a libmp3lame -q:a 2 "${outputPath}"`;
    console.log('[audio-processor] Running ffmpeg command:', command);

    // Execute the ffmpeg command
    await execPromise(command);
    console.log('[audio-processor] ffmpeg finished, output at:', outputPath);

    return outputPath;
  } catch (error) {
    console.error("[audio-processor] Error combining stems:", error)
    throw new Error(`Failed to combine audio stems: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Processes a complete audio generation job
 * @param trackId - The track ID generated from the descriptor
 * @param stemUrls - Object with stem URLs for each category
 * @returns The path to the generated audio file
 */
export async function processAudioJob(trackId: string, stemUrls: Record<string, string>): Promise<string> {
  // Use /tmp for output directory in serverless environments
  const outputDir = "/tmp/generated";
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${trackId}.mp3`);

  try {
    // Download the stems
    const localStemPaths = await downloadStems(stemUrls);

    // Combine the stems
    await combineStems(localStemPaths, outputPath);

    // Clean up the temporary files
    const tmpDir = path.dirname(Object.values(localStemPaths)[0]);
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // Upload to Supabase storage
    const { createClient } = await import("@supabase/supabase-js");
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const fileBuffer = fs.readFileSync(outputPath);
    const supabasePath = `${trackId}.mp3`;
    const { data, error } = await supabase.storage.from("generated").upload(supabasePath, fileBuffer, {
      contentType: "audio/mpeg",
      cacheControl: "no-cache, no-store, must-revalidate",
      upsert: true,
    });
    if (error) {
      console.error("[audio-processor] Supabase upload error:", error);
      // Still return local path for debugging
      return `/generated/${trackId}.mp3`;
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("generated").getPublicUrl(supabasePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("[audio-processor] Could not get public URL for uploaded audio.");
      return `/generated/${trackId}.mp3`;
    }
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error processing audio job:", error);
    throw error;
  }
}
