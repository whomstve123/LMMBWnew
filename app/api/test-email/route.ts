import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get('email');
  
  return NextResponse.json({
    message: "Email Test Page",
    usage: testEmail 
      ? `Testing email delivery to: ${testEmail}`
      : "Add ?email=your@email.com to test email delivery",
    endpoints: {
      testEmail: "/api/test-email?email=your@email.com",
      sendEmail: "/api/sendEmail (POST)",
      submit: "/api/submit (POST)"
    },
    environment: {
      emailHost: process.env.EMAIL_HOST || "NOT SET",
      emailPort: process.env.EMAIL_PORT || "NOT SET", 
      emailUser: process.env.EMAIL_USER ? "SET" : "NOT SET",
      emailPass: process.env.EMAIL_PASS ? "SET" : "NOT SET",
      emailFrom: process.env.EMAIL_FROM || "NOT SET"
    }
  });
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Test the sendEmail API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sendEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        testMode: true 
      })
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      return NextResponse.json({ 
        error: "Email test failed", 
        details: emailResult 
      }, { status: emailResponse.status });
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully!",
      details: emailResult,
      nextSteps: [
        "Check your email inbox (and spam folder)",
        "If successful, try the full flow with the face capture form",
        "If failed, check your SMTP credentials in environment variables"
      ]
    });

  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json({ 
      error: "Email test failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
