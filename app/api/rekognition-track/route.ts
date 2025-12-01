import { NextResponse } from "next/server";
import { ensureCollection, searchFaceByImage, indexFace } from "@/utils/rekognition";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { selectStemsFromHash } from "@/utils/stem-selector";
import { processAudioJob } from "@/utils/audio-processor";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  console.log("[rekognition-track] POST handler invoked");
  
  try {
    // Ensure collection exists
    await ensureCollection();

    // Get image data from request
    const { imageData } = await request.json();
    if (!imageData) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(base64Data, "base64");

    console.log("[rekognition-track] Searching for matching face...");

    // Search for matching face with 95% similarity threshold (stricter matching)
    const match = await searchFaceByImage(imageBytes, 95);

    if (match && match.externalImageId) {
      console.log(`[rekognition-track] Match found! Face ID: ${match.faceId}, Similarity: ${match.similarity}%, ExternalImageId: ${match.externalImageId}`);
      console.log(`[rekognition-track] Using 95% threshold - similarity is ${match.similarity || 0}%`);
      
      // Look up the track by external image ID (which is our track ID)
      const trackId = match.externalImageId;
      console.log(`[rekognition-track] Looking up track_id: ${trackId}`);
      
      const { data: mapping, error } = await supabase
        .from("face_track_mappings")
        .select("*")
        .eq("track_id", trackId)
        .single();

      if (error || !mapping) {
        // Face exists in Rekognition but not in DB (orphaned entry)
        // Create the missing database entry instead of erroring
        console.log(`[rekognition-track] Rekognition match but no DB entry (orphaned). Creating DB entry for track_id: ${trackId}`);
        
        const stemChoice = selectStemsFromHash(trackId);
        const audioUrl = await processAudioJob(trackId, stemChoice);

        const { error: insertError } = await supabase
          .from("face_track_mappings")
          .insert({
            track_id: trackId,
            audio_url: audioUrl,
            face_descriptor: null,
            generated_count: 1,
            last_accessed: new Date().toISOString(),
          });

        if (insertError) {
          console.error("[rekognition-track] Database insert error:", insertError);
          return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
        }

        return NextResponse.json({
          audioUrl,
          trackId,
          matched: true,
          similarity: match.similarity,
        });
      }

      console.log(`[rekognition-track] Found mapping, audio_url: ${mapping.audio_url}`);

      // Update access count
      await supabase
        .from("face_track_mappings")
        .update({
          generated_count: mapping.generated_count + 1,
          last_accessed: new Date().toISOString(),
        })
        .eq("id", mapping.id);

      const response = {
        audioUrl: mapping.audio_url,
        trackId: mapping.track_id,
        matched: true,
        similarity: match.similarity,
      };
      
      console.log(`[rekognition-track] Returning response:`, response);
      return NextResponse.json(response);
    }

    // No match found - create new track
    console.log("[rekognition-track] No match found, creating new track...");

    // Generate track ID from random data
    const trackId = crypto.randomBytes(5).toString("hex");

    // Index the face with track ID as external image ID
    const indexed = await indexFace(imageBytes, trackId);
    console.log(`[rekognition-track] Indexed new face: ${indexed.faceId}`);

    // Select stems and generate audio
    const stemChoice = selectStemsFromHash(trackId);
    const audioUrl = await processAudioJob(trackId, stemChoice);

    // Store in database
    const { error: insertError } = await supabase
      .from("face_track_mappings")
      .insert({
        track_id: trackId,
        audio_url: audioUrl,
        face_descriptor: null, // Not using descriptors with Rekognition
        generated_count: 1,
        last_accessed: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[rekognition-track] Database insert error:", insertError);
      return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
    }

    return NextResponse.json({
      audioUrl,
      trackId,
      matched: false,
      similarity: null,
    });
  } catch (error: any) {
    console.error("[rekognition-track] Error:", error);
    return NextResponse.json(
      { error: "Face recognition failed", details: error.message },
      { status: 500 }
    );
  }
}
