import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const { email, faceHash } = await request.json()

    if (!email || !faceHash) {
      return NextResponse.json({ error: "Email and face data are required" }, { status: 400 })
    }

    console.log(`Submission received: ${email}`)

    // Step 1: Generate the track using the existing generateTrack API
    const generateTrackResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generateTrack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceHash })
    });

    if (!generateTrackResponse.ok) {
      const errorData = await generateTrackResponse.json();
      console.error('Track generation failed:', errorData);
      return NextResponse.json({ error: "Failed to generate track" }, { status: 500 });
    }

    const trackData = await generateTrackResponse.json();
    const { trackId, audioUrl } = trackData;

    if (!trackId || !audioUrl) {
      console.error('Invalid track data received:', trackData);
      return NextResponse.json({ error: "Invalid track data generated" }, { status: 500 });
    }

    // Step 2: Send the email with the track download link
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sendEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        trackId, 
        audioUrl, 
        testMode: false 
      })
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json();
      console.error('Email sending failed:', emailError);
      // Still return success with track data even if email fails
      return NextResponse.json({ 
        success: true, 
        trackGenerated: true,
        emailSent: false,
        trackId,
        audioUrl,
        warning: "Track generated but email delivery failed"
      });
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return NextResponse.json({ 
      success: true,
      trackGenerated: true,
      emailSent: true,
      trackId,
      audioUrl,
      message: "Track generated and email sent successfully"
    });

  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json({ 
      error: "Failed to process submission",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
