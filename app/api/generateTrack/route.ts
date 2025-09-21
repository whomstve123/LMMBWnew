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
  console.log('[generateTrack] POST handler invoked');
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
          try {
            let faceHash;
            try {
              const body = await request.json();
              faceHash = body.faceHash;
              console.log('[generateTrack] Received faceHash:', faceHash);
            } catch (parseError) {
              console.error('[generateTrack] Failed to parse request body:', parseError);
              return NextResponse.json({ error: 'Invalid request format', details: String(parseError) }, { status: 400 });
            }

            if (!faceHash) {
              console.error('[generateTrack] No faceHash provided in request.');
              return NextResponse.json({ error: "Face hash is required" }, { status: 400 });
            }

            // Generate consistent trackId from face hash
            const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10);
            const fileName = `${trackId}.mp3`;

            console.log(`[generateTrack] Processing face hash for trackId: ${trackId}`);

            // First check the database for existing mapping
            try {
              const { data: existingMapping, error: selectError } = await supabase
                .from('face_track_mappings')
                .select('*')
                .eq('face_hash', faceHash)
                .single();

              if (!selectError && existingMapping) {
                console.log(`[generateTrack] Found database mapping for trackId: ${trackId}, incrementing access count`);
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
                  console.log(`[generateTrack] Database mapping exists but file missing, regenerating...`);
                    try {
                      const body = await request.json();
                      const faceHash = body.faceHash;
                      console.log('[generateTrack] Minimal handler received faceHash:', faceHash);
                      if (!faceHash) {
                        return NextResponse.json({ error: 'Face hash is required' }, { status: 400 });
                      }
                      // Always return a simple JSON response for debugging
                      return NextResponse.json({ success: true, faceHash, message: 'Minimal handler response' });
                    } catch (error) {
                      console.error('[generateTrack] Minimal handler error:', error);
                      return NextResponse.json({ error: 'Handler failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
                    }
                  }
              const selectedStems = await selectStemsFromHash(faceHash);
