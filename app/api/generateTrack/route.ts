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

    // Generate consistent trackId from face hash
    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10);
    const fileName = `${trackId}.mp3`;

    console.log(`Processing face hash for trackId: ${trackId}`);

    // First check the database for existing mapping
    try {
      const { data: existingMapping, error: selectError } = await supabase
        .from('face_track_mappings')
        .select('*')
        .eq('face_hash', faceHash)
        .single();

      if (!selectError && existingMapping) {
        console.log(`Found database mapping for trackId: ${trackId}, incrementing access count`);
        
        // Update access count
        await supabase
          .from('face_track_mappings')
          .update({ 
            generated_count: existingMapping.generated_count + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('face_hash', faceHash);

        // Verify the file still exists in storage
        const { data: fileExists } = await supabase.storage
          .from("generated")
          .list("", { search: fileName });

        if (fileExists && fileExists.length > 0) {
          const selectedStems = await selectStemsFromHash(faceHash);
          return NextResponse.json({ 
            success: true, 
            stems: selectedStems, 
            trackId, 
            audioUrl: existingMapping.audio_url,
            cached: true,
            accessCount: existingMapping.generated_count + 1,
            message: "Generated your unique sound based on your biometric data. This track is now permanently linked to your face."
          });
        } else {
          console.log(`Database mapping exists but file missing, regenerating...`);
        }
      }
    } catch (dbError) {
      console.log('Database lookup failed, falling back to file-based check:', dbError);
    }

    // Fall back to file-based check if database isn't available
    const { data: existingFile, error: checkError } = await supabase.storage
      .from("generated")
      .list("", { search: fileName });

    if (!checkError && existingFile && existingFile.length > 0) {
      console.log(`Track ${trackId} exists in storage, returning existing URL`);
      const { publicUrl } = supabase.storage.from("generated").getPublicUrl(fileName).data;
      const selectedStems = await selectStemsFromHash(faceHash);
      
      // Try to store this mapping in the database for future reference
      try {
        await supabase
          .from('face_track_mappings')
          .upsert({
            face_hash: faceHash,
            track_id: trackId,
            audio_url: publicUrl,
            generated_count: 1,
            last_accessed: new Date().toISOString()
          }, { onConflict: 'face_hash' });
      } catch (dbStoreError) {
        console.log('Could not store mapping in database:', dbStoreError);
      }
      
      return NextResponse.json({ 
        success: true, 
        stems: selectedStems, 
        trackId, 
        audioUrl: publicUrl,
        cached: true,
        message: "Generated your unique sound based on your biometric data. This track is now permanently linked to your face."
      });
    }

    console.log(`Track ${trackId} doesn't exist, generating new track`);

    // Generate deterministic stem selection from face hash
    const selectedStems = await selectStemsFromHash(faceHash);

    if (!selectedStems || Object.keys(selectedStems).length === 0) {
      return NextResponse.json({ error: "No stems available" }, { status: 500 });
    }

    // Call external mixing API to create the audio
    const mixingApiUrl = "https://mixing-api.onrender.com/mix";
    const stemsArray = STEM_CATEGORIES.map((cat) => selectedStems[cat]).filter(Boolean);
    
    console.log(`Mixing stems for trackId ${trackId}:`, stemsArray);
    
    const response = await fetch(mixingApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stems: stemsArray })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mixing API error response:", errorText);
      throw new Error("Mixing API failed");
    }

    const mixedBuffer = await response.arrayBuffer();

    // Upload the generated track to Supabase Storage with deterministic filename
    const { data, error: uploadError } = await supabase.storage.from("generated").upload(
      fileName,
      mixedBuffer,
      { 
        contentType: "audio/mpeg", 
        upsert: true // This ensures we overwrite if somehow it exists
      }
    );

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error("Failed to upload generated track");
    }

    const { publicUrl } = supabase.storage.from("generated").getPublicUrl(fileName).data;
    
    // Store the face-track mapping in the database
    try {
      await supabase
        .from('face_track_mappings')
        .upsert({
          face_hash: faceHash,
          track_id: trackId,
          audio_url: publicUrl,
          generated_count: 1,
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        }, { onConflict: 'face_hash' });
      
      console.log(`Successfully stored face-track mapping for ${trackId}`);
    } catch (dbStoreError) {
      console.log('Could not store mapping in database, but file is saved:', dbStoreError);
    }
    
    console.log(`Successfully generated and stored track ${trackId}`);
    
    return NextResponse.json({ 
      success: true, 
      stems: selectedStems, 
      trackId, 
      audioUrl: publicUrl,
      cached: false,
      accessCount: 1,
      message: "Generated your unique sound based on your biometric data. This track is now permanently linked to your face."
    });

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
  // This function is now unused; mixing is done via external API
  return null;
}
