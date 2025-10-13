
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { selectStemsFromHash } from "@/utils/stem-selector";
import { processAudioJob } from "@/utils/audio-processor";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export async function POST(request: Request) {
  console.log('[generateTrack] POST handler invoked - top of function');
  try {
    const { descriptor } = await request.json();
    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: "Descriptor array is required" }, { status: 400 });
    }
    // Ensure descriptor is strictly integers
    const intDescriptor = descriptor.map((v) => Number(Math.round(v)));
    // Generate trackId from descriptor
    const descriptorString = JSON.stringify(intDescriptor);
    const trackId = crypto.createHash("md5").update(descriptorString).digest("hex").substring(0, 10);
    const fileName = `${trackId}.mp3`;

    // Fetch all existing mappings and compare descriptors by cosine similarity
    const { data: allMappings, error: allError } = await supabase
      .from('face_track_mappings')
      .select('id, face_descriptor, track_id, audio_url, generated_count');
    if (allError) {
      return NextResponse.json({ error: 'Failed to fetch mappings', details: allError.message || allError }, { status: 500 });
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
    // Debug log incoming descriptor
    console.log('[generateTrack] Incoming descriptor:', intDescriptor);
    let matchedMapping = null;
  const SIMILARITY_THRESHOLD = 0.90; // Even more tolerant matching
    for (const mapping of allMappings || []) {
      if (mapping.face_descriptor && Array.isArray(mapping.face_descriptor) && mapping.face_descriptor.length === intDescriptor.length) {
        // Ensure stored descriptor is strictly integers
        const storedIntDescriptor = mapping.face_descriptor.map((v) => Number(Math.round(v)));
        const similarity = cosineSimilarity(intDescriptor, storedIntDescriptor);
        // Debug log similarity score for each mapping
        console.log(`[generateTrack] Comparing to mapping id=${mapping.id}, similarity=${similarity}`);
        if (similarity >= SIMILARITY_THRESHOLD) {
          matchedMapping = mapping;
          break;
        }
      }
    }
    if (matchedMapping) {
      // Update generated_count and last_accessed
      await supabase
        .from('face_track_mappings')
        .update({
          generated_count: matchedMapping.generated_count + 1,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', matchedMapping.id);
      const selectedStems = selectStemsFromHash(matchedMapping.track_id);
      return NextResponse.json({
        success: true,
        stems: selectedStems,
        trackId: matchedMapping.track_id,
        audioUrl: matchedMapping.audio_url,
        cached: true,
        accessCount: matchedMapping.generated_count + 1,
        message: "Generated your unique sound based on your biometric data. This track is now permanently linked to your face."
      });
    }
    // If not found, generate audio
    const selectedStems = selectStemsFromHash(trackId);
    // Check if each stem is accessible in Supabase
    const missingStems = [];
    for (const [category, url] of Object.entries(selectedStems)) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) {
          missingStems.push({ category, url, status: res.status });
        }
      } catch (err) {
        missingStems.push({ category, url, error: err instanceof Error ? err.message : String(err) });
      }
    }
    if (missingStems.length > 0) {
      return NextResponse.json({
        error: 'One or more stems are missing or inaccessible in Supabase storage.',
        missingStems,
        stems: selectedStems,
        trackId,
        message: 'Check Supabase storage for missing files and ensure public access.',
      }, { status: 500 });
    }
    let audioUrl = null;
    try {
      audioUrl = await processAudioJob(trackId, selectedStems);
    } catch (err) {
      return NextResponse.json({
        error: 'Failed to generate audio',
        details: err instanceof Error ? err.message : String(err),
        stems: selectedStems,
        trackId,
        audioUrl,
        message: 'Error occurred during audio generation. See details.',
      }, { status: 500 });
    }
    // INSERT
    const { error: insertError, data: insertData } = await supabase.from('face_track_mappings').insert([
      {
        face_descriptor: intDescriptor,
        track_id: trackId,
        audio_url: audioUrl,
        generated_count: 1,
        last_accessed: new Date().toISOString(),
      },
    ]);
    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert mapping', details: insertError.message || insertError }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      stems: selectedStems,
      trackId,
      audioUrl,
      cached: false,
      accessCount: 1,
      message: "Generated your unique sound based on your biometric data. This track is now permanently linked to your face."
    });
  } catch (error) {
    console.error('[generateTrack] Handler error (outer catch):', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error), status: 500 }, { status: 500 });
  }
}
