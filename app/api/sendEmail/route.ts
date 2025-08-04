import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export async function POST(request: Request) {
  try {
    const { email, trackId, audioUrl, testMode = false } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!testMode && (!trackId || !audioUrl)) {
      return NextResponse.json({ error: "Track ID and audio URL are required" }, { status: 400 });
    }

    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
      console.error("Missing email environment variables");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const transporter = createTransporter();

    // Test email content or real email content
    const emailContent = testMode ? {
      subject: "Test Email from Mind Un-Wanderer",
      html: `
        <div style="font-family: 'Courier New', monospace; background-color: #000; color: #00ff00; padding: 20px; border: 2px solid #00ff00; max-width: 600px;">
          <h1 style="text-align: center; margin-bottom: 20px; text-shadow: 0 0 10px #00ff00;">MIND UN-WANDERER</h1>
          <h2 style="color: #00ff88;">🧪 Test Email Successful!</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p style="background: #1a1a1a; padding: 10px; border-left: 3px solid #00ff00;">
            <strong>Email Service Status:</strong> ✅ OPERATIONAL
          </p>
          <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    } : {
      subject: "Your Mind Un-Wanderer Track is Ready!",
      html: `
        <div style="font-family: 'Courier New', monospace; background-color: #000; color: #00ff00; padding: 20px; border: 2px solid #00ff00; max-width: 600px;">
          <h1 style="text-align: center; margin-bottom: 20px; text-shadow: 0 0 10px #00ff00;">MIND UN-WANDERER</h1>
          <p>Thank you for using Jill Blutt's Revolutionary Mind Un-Wanderer!</p>
          <p>Your unique sound has been generated based on your biometric data.</p>
          
          <div style="background: #1a1a1a; padding: 15px; margin: 20px 0; border-left: 3px solid #00ff00;">
            <p style="margin: 0;"><strong>Track ID:</strong> ${trackId}</p>
            <p style="margin: 10px 0 0 0;">
              <a href="${audioUrl}" 
                 style="color: #00ff88; text-decoration: none; background: #2a2a2a; padding: 8px 16px; border: 1px solid #00ff88; display: inline-block; margin-top: 10px;"
                 download>
                🎵 DOWNLOAD YOUR TRACK
              </a>
            </p>
          </div>
          
          <p>This link will allow you to download your personalized sound file that has been 
          specifically created based on your unique facial biometric data.</p>
          
          <p style="margin-top: 30px; opacity: 0.8; font-size: 14px;">
            Best regards,<br>
            The Mind Un-Wanderer Team
          </p>
          
          <p style="margin-top: 20px; font-size: 11px; opacity: 0.6;">
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    // Send the email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully to: ${email}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Email sent successfully",
      recipient: email,
      type: testMode ? "test" : "track_delivery"
    });

  } catch (error) {
    console.error("Email sending error:", error);
    
    // More specific error handling
    let errorMessage = "Failed to send email";
    if (error instanceof Error) {
      if (error.message.includes("Invalid login")) {
        errorMessage = "Email authentication failed - check your credentials";
      } else if (error.message.includes("ENOTFOUND")) {
        errorMessage = "Email server not found - check your SMTP host";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Connection refused - check your SMTP port and settings";
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Test endpoint for quick verification
export async function GET(request: Request) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get('email');
  
  if (!testEmail) {
    return NextResponse.json({ 
      message: "Email test endpoint",
      usage: "POST to this endpoint with { email, testMode: true } to test email functionality"
    });
  }
  
  // Quick test via GET request
  try {
    const testResponse = await POST(new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, testMode: true })
    }));
    
    return testResponse;
  } catch (error) {
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
