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
      const errorText = await generateTrackResponse.text();
      console.error('Track generation failed:', generateTrackResponse.status, errorText);
      return NextResponse.json({ 
        error: "Failed to create track", 
        details: errorText.substring(0, 500)
      }, { status: 500 });
    }

    const responseText = await generateTrackResponse.text();
    let trackData;
    try {
      trackData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse generateTrack response as JSON:', responseText.substring(0, 500));
      return NextResponse.json({ 
        error: "Invalid response from track generation", 
        details: responseText.substring(0, 500) 
      }, { status: 500 });
    }
    const { trackId, audioUrl } = trackData;

    if (!trackId || !audioUrl) {
      console.error('Invalid track data received:', trackData);
      return NextResponse.json({ error: "Invalid track data created" }, { status: 500 });
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
      const emailErrorText = await emailResponse.text();
      console.error('Email sending failed:', emailResponse.status, emailErrorText);
      // Still return success with track data even if email fails
      return NextResponse.json({ 
        success: true, 
        trackGenerated: true,
        emailSent: false,
        trackId,
        audioUrl,
        warning: "Track created but email delivery failed"
      });
    }

    const emailResultText = await emailResponse.text();
    let emailResult;
    try {
      emailResult = JSON.parse(emailResultText);
    } catch (e) {
      console.warn('Email response not JSON, treating as success:', emailResultText.substring(0, 200));
      emailResult = { success: true };
    }
    console.log('Email sent successfully:', emailResult);

    return NextResponse.json({ 
      success: true,
      trackGenerated: true,
      emailSent: true,
      trackId,
      audioUrl,
      message: "Track created and email sent successfully"
    });

  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json({ 
      error: "Failed to process submission",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
