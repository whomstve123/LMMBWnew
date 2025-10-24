import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const { email, descriptor } = await request.json()

    if (!email || !descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: "Email and descriptor array are required" }, { status: 400 })
    }

    console.log(`Submission received: ${email}`)

      // Step 1: Generate the track using the existing generateTrack API
      // Resolve the base from the incoming request URL but be tolerant of dev proxies that
      // may present an https origin while the internal dev server is speaking plain http.
      const reqUrl = new URL(request.url)
      // If this is a local/private host (dev), prefer http to avoid TLS/proxy handshake issues.
      const isLocalHost = ["localhost", "127.0.0.1"].includes(reqUrl.hostname) || reqUrl.hostname.startsWith('10.') || reqUrl.hostname.startsWith('192.168.') || reqUrl.hostname === '::1'
      if (isLocalHost) reqUrl.protocol = 'http:'
      const generateTrackUrl = new URL('/api/generateTrack', reqUrl).toString()

      let generateTrackResponse: Response
      try {
        generateTrackResponse = await fetch(generateTrackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor })
        })
      } catch (err) {
        // If we failed and we tried https, retry with http for local hosts (common in dev/proxy setups)
        console.warn('Initial generateTrack fetch failed, attempting http fallback', err)
        if (reqUrl.protocol === 'https:' && isLocalHost) {
          reqUrl.protocol = 'http:'
          const fallbackUrl = new URL('/api/generateTrack', reqUrl).toString()
          generateTrackResponse = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descriptor })
          })
        } else {
          throw err
        }
      }

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
    const emailUrl = new URL('/api/sendEmail', reqUrl).toString()
    let emailResponse: Response
    try {
      emailResponse = await fetch(emailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          trackId, 
          audioUrl, 
          testMode: false 
        })
      })
    } catch (err) {
      console.warn('Initial sendEmail fetch failed, attempting http fallback', err)
      if (reqUrl.protocol === 'https:' && isLocalHost) {
        reqUrl.protocol = 'http:'
        const fallbackEmailUrl = new URL('/api/sendEmail', reqUrl).toString()
        emailResponse = await fetch(fallbackEmailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            trackId, 
            audioUrl, 
            testMode: false 
          })
        })
      } else {
        throw err
      }
    }

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
