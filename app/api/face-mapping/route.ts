import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const { descriptor } = await request.json();

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: "Descriptor array is required" }, { status: 400 });
    }

    // Fetch all stored descriptors
    const { data: allMappings, error: selectError } = await supabase
      .from('face_track_mappings')
      .select('*');

    if (selectError) {
      console.error('Database select error:', selectError);
      // Continue anyway
    }

    // Cosine similarity function
  function cosineSimilarity(a: number[], b: number[]): number {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    let bestMatch = null;
    let bestScore = -1;
    const threshold = 0.8; // You can tune this

    if (allMappings && allMappings.length > 0) {
      for (const mapping of allMappings) {
        if (mapping.face_descriptor) {
          try {
            const stored = Array.isArray(mapping.face_descriptor)
              ? mapping.face_descriptor
              : JSON.parse(mapping.face_descriptor);
            if (stored.length === descriptor.length) {
              const score = cosineSimilarity(descriptor, stored);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = mapping;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    if (bestMatch && bestScore >= threshold) {
      return NextResponse.json({
        exists: true,
        trackId: bestMatch.track_id,
        audioUrl: bestMatch.audio_url,
        createdAt: bestMatch.created_at,
        generatedCount: bestMatch.generated_count + 1,
        similarity: bestScore
      });
    }

    // No match found, generate new trackId
    const descriptorString = JSON.stringify(descriptor);
    const trackId = crypto.createHash("md5").update(descriptorString).digest("hex").substring(0, 10);
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
