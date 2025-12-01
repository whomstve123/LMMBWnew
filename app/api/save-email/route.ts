import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const { email, trackId, descriptor, promotionalConsent } = await request.json();

    if (!email || !trackId || !descriptor) {
      return NextResponse.json({ error: "Email, trackId, and descriptor are required" }, { status: 400 });
    }

    // Ensure descriptor is strictly integers
    const intDescriptor = descriptor.map((v: number) => Number(Math.round(v)));

    // Find the matching face mapping by descriptor similarity
    const { data: allMappings, error: fetchError } = await supabase
      .from('face_track_mappings')
      .select('id, face_descriptor, track_id');

    if (fetchError) {
      console.error('[save-email] Failed to fetch mappings:', fetchError);
      return NextResponse.json({ error: 'Failed to lookup mapping' }, { status: 500 });
    }

    // Euclidean distance function (standard for face-api.js)
    function euclideanDistance(a: number[], b: number[]): number {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    }

    // Find best matching mapping
    let matchedMapping = null;
    let bestDistance = Infinity;
    const DISTANCE_THRESHOLD = 85; // Same person 0-80, different person 90+

    for (const mapping of allMappings || []) {
      if (!mapping.face_descriptor) continue;

      let stored: number[] | null = null;
      try {
        if (Array.isArray(mapping.face_descriptor)) {
          stored = mapping.face_descriptor.map((v: any) => Number(v));
        } else if (typeof mapping.face_descriptor === 'string') {
          stored = JSON.parse(mapping.face_descriptor).map((v: any) => Number(v));
        }
      } catch (e) {
        continue;
      }

      if (!stored || stored.length !== intDescriptor.length) continue;

      const distance = euclideanDistance(intDescriptor, stored);
      if (distance < bestDistance) {
        bestDistance = distance;
        if (distance <= DISTANCE_THRESHOLD) {
          matchedMapping = mapping;
          break;
        }
      }
    }

    if (!matchedMapping) {
      console.error('[save-email] No matching face mapping found');
      return NextResponse.json({ error: 'No matching face mapping found' }, { status: 404 });
    }

    // Update the mapping with email and consent
    const { error: updateError } = await supabase
      .from('face_track_mappings')
      .update({
        user_email: email,
        promotional_consent: promotionalConsent,
      })
      .eq('id', matchedMapping.id);

    if (updateError) {
      console.error('[save-email] Failed to update mapping:', updateError);
      return NextResponse.json({ error: 'Failed to save email', details: updateError.message }, { status: 500 });
    }

    console.log(`[save-email] Saved email for mapping id=${matchedMapping.id}, consent=${promotionalConsent}`);

    return NextResponse.json({
      success: true,
      message: "Email saved successfully"
    });

  } catch (error) {
    console.error("[save-email] Error:", error);
    return NextResponse.json({ 
      error: "Failed to save email",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
