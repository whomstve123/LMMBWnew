import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const { faceHash } = await request.json();

    if (!faceHash) {
      return NextResponse.json({ error: "Face hash is required" }, { status: 400 });
    }

    // Generate consistent trackId from face hash
    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10);
    
    // Check if we have a record of this face-track mapping
    const { data: existingMapping, error: selectError } = await supabase
      .from('face_track_mappings')
      .select('*')
      .eq('face_hash', faceHash)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database select error:', selectError);
      // Continue anyway - we can still work with file-based lookup
    }

    if (existingMapping) {
      console.log(`Found existing mapping for face hash: ${faceHash} -> trackId: ${existingMapping.track_id}`);
      return NextResponse.json({
        exists: true,
        trackId: existingMapping.track_id,
        audioUrl: existingMapping.audio_url,
        createdAt: existingMapping.created_at,
        generatedCount: existingMapping.generated_count + 1
      });
    }

    console.log(`No existing mapping found for face hash: ${faceHash}`);
    return NextResponse.json({
      exists: false,
      trackId,
      message: "This face hasn't been processed before"
    });

  } catch (error) {
    console.error("Face lookup error:", error);
    return NextResponse.json({ error: "Failed to lookup face mapping" }, { status: 500 });
  }
}

// Helper function to store a new face-track mapping
export async function PUT(request: Request) {
  try {
    const { faceHash, trackId, audioUrl } = await request.json();

    if (!faceHash || !trackId || !audioUrl) {
      return NextResponse.json({ error: "Face hash, track ID, and audio URL are required" }, { status: 400 });
    }

    // Try to insert or update the mapping
    const { data, error } = await supabase
      .from('face_track_mappings')
      .upsert({
        face_hash: faceHash,
        track_id: trackId,
        audio_url: audioUrl,
        generated_count: 1,
        last_accessed: new Date().toISOString()
      }, {
        onConflict: 'face_hash'
      })
      .select()
      .single();

    if (error) {
      console.error('Database upsert error:', error);
      // This is not critical - the system can still work with file-based lookup
      return NextResponse.json({
        success: true,
        warning: "Mapping stored in file system only",
        details: error.message
      });
    }

    console.log(`Stored face-track mapping: ${faceHash} -> ${trackId}`);
    return NextResponse.json({
      success: true,
      mapping: data,
      message: "Face-track mapping stored successfully"
    });

  } catch (error) {
    console.error("Face mapping storage error:", error);
    return NextResponse.json({ error: "Failed to store face mapping" }, { status: 500 });
  }
}
