import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const { email, faceHash } = await request.json()

    if (!email || !faceHash) {
      return NextResponse.json({ error: "Email and face data are required" }, { status: 400 })
    }

    // Store the submission (in a real app, you'd use a database)
    // For now, we'll just log it
    console.log(`Submission received: ${email}`)

    // Generate a track ID from the face hash
    const trackId = crypto.createHash("md5").update(faceHash).digest("hex").substring(0, 10)

    // Generate a download link for the track
    const downloadLink = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/download?hash=${encodeURIComponent(faceHash)}`

    // Send confirmation email
    await sendConfirmationEmail(email, downloadLink, trackId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}

async function sendConfirmationEmail(email: string, downloadLink: string, trackId: string) {
  // In a production app, you would use a real email service
  // For this example, we'll just log the email content
  console.log(`
    To: ${email}
    Subject: Your Mind Un-Wanderer Sound
    
    Thank you for using Jill Blutt's Revolutionary Mind Un-Wanderer!
    
    Your unique sound has been generated based on your biometric data.
    
    Download your sound here: ${downloadLink}
    
    Your unique track ID: ${trackId}
    
    This link will allow you to download your personalized sound file that has been 
    specifically created based on your unique facial biometric data.
    
    Best regards,
    The Mind Un-Wanderer Team
  `)

  // Uncomment this code when you have a real email service set up
  /*
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Your Mind Un-Wanderer Sound",
    text: `
      Thank you for using Jill Blutt's Revolutionary Mind Un-Wanderer!
      
      Your unique sound has been generated based on your biometric data.
      
      Download your sound here: ${downloadLink}
      
      Your unique track ID: ${trackId}
      
      This link will allow you to download your personalized sound file that has been 
      specifically created based on your unique facial biometric data.
      
      Best regards,
      The Mind Un-Wanderer Team
    `,
    html: `
      <h1>Thank you for using Jill Blutt's Revolutionary Mind Un-Wanderer!</h1>
      <p>Your unique sound has been generated based on your biometric data.</p>
      <p><a href="${downloadLink}">Download your sound here</a></p>
      <p><strong>Your unique track ID:</strong> ${trackId}</p>
      <p>This link will allow you to download your personalized sound file that has been 
      specifically created based on your unique facial biometric data.</p>
      <p>Best regards,<br>The Mind Un-Wanderer Team</p>
    `,
  })
  */
}
