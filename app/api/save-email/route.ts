import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const { email, trackId, descriptor, promotionalConsent } = await request.json();

    console.log('[save-email] Received:', { email, trackId, hasDescriptor: !!descriptor, promotionalConsent });

    if (!email || !trackId) {
      return NextResponse.json({ error: "Email and trackId are required" }, { status: 400 });
    }

    // Find the matching face mapping by trackId (from Rekognition)
    const { data: mapping, error: fetchError } = await supabase
      .from('face_track_mappings')
      .select('id, track_id')
      .eq('track_id', trackId)
      .single();

    if (fetchError || !mapping) {
      console.error('[save-email] No matching face mapping found for trackId:', trackId, fetchError);
      return NextResponse.json({ error: 'No matching face mapping found' }, { status: 404 });
    }

    console.log('[save-email] Found mapping:', mapping);

    // Update the mapping with email and consent
    const { error: updateError } = await supabase
      .from('face_track_mappings')
      .update({
        user_email: email,
        promotional_consent: promotionalConsent ?? false,
      })
      .eq('id', mapping.id);

    if (updateError) {
      console.error('[save-email] Failed to update mapping:', updateError);
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
    }

    console.log('[save-email] Successfully saved email for track:', trackId);
    return NextResponse.json({ success: true, message: "Email saved successfully" });
  } catch (error) {
    console.error('[save-email] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
