import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const BUCKET_NAME = "stems";

const STEM_CATEGORIES = ["pads", "bass", "noise"];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { faceHash } = await request.json();

    if (!faceHash) {
      return NextResponse.json({ error: "Face hash is required" }, { status: 400 });
    }

    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10);
    const selectedStems = await selectStemsFromHash(faceHash);

    if (!selectedStems || Object.keys(selectedStems).length === 0) {
      return NextResponse.json({ error: "No stems available" }, { status: 500 });
    }

    const combinedTrackUrl = await mixAndStoreStems(selectedStems, trackId);

    return NextResponse.json({ success: true, stems: selectedStems, trackId, audioUrl: combinedTrackUrl });
  } catch (error) {
    console.error("Track generation error:", error);
    return NextResponse.json({ error: "Failed to generate track" }, { status: 500 });
  }
}

async function selectStemsFromHash(faceHash: string) {
  const hash = crypto.createHash("md5").update(faceHash).digest("hex");
  const selectedStems: Record<string, string> = {};

  for (let i = 0; i < STEM_CATEGORIES.length; i++) {
    const category = STEM_CATEGORIES[i];
    const categoryHash = hash.substring(i * 8, (i + 1) * 8);
    const hashNum = Number.parseInt(categoryHash, 16);

    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(`${category}`, {
      limit: 100,
    });

    console.log(`Category: ${category}`);
    if (error) {
      console.error(`Supabase error for category ${category}:`, error);
    }
    if (!data) {
      console.warn(`No data returned for category ${category}.`);
      continue;
    }
    console.log(`All files in ${category}:`, data.map(f => f.name));

    const files = data.filter((f) => f.name.endsWith(".wav") || f.name.endsWith(".mp3"));
    console.log(`Filtered audio files in ${category}:`, files.map(f => f.name));
    if (files.length === 0) {
      console.warn(`No audio files found in ${category} after filtering.`);
      continue;
    }

    const selectedIndex = hashNum % files.length;
    const selectedFile = files[selectedIndex].name;
    console.log(`Selected file for ${category}:`, selectedFile);

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${category}/${selectedFile}`;
    selectedStems[category] = publicUrl;
  }

  return selectedStems;
}

async function mixAndStoreStems(stems: Record<string, string>, trackId: string) {
  const tempDir = path.join("/tmp", uuidv4());
  await fs.mkdir(tempDir, { recursive: true });

  const downloadedPaths: string[] = [];

  for (const [category, url] of Object.entries(stems)) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const localPath = path.join(tempDir, `${category}.wav`);
    await fs.writeFile(localPath, buffer);
    downloadedPaths.push(localPath);
  }

  const outputPath = path.join(tempDir, `${trackId}.mp3`);
  const inputArgs = downloadedPaths.map(p => `-i "${p}"`).join(" ");
  const filterArgs = downloadedPaths.map((_, i) => `[${i}:a]`).join("") + `amix=inputs=${downloadedPaths.length}:duration=longest`;

  const command = `ffmpeg ${inputArgs} -filter_complex "${filterArgs}" -c:a libmp3lame -q:a 4 "${outputPath}"`;
  await execPromise(command);

  const fileBuffer = await fs.readFile(outputPath);
  const fileName = `${trackId}.mp3`;
  const { data, error } = await supabase.storage.from("generated").upload(fileName, fileBuffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  if (error) {
    throw new Error("Failed to upload generated track");
  }

  const { publicUrl } = supabase.storage.from("generated").getPublicUrl(fileName).data;
  return publicUrl;
}
