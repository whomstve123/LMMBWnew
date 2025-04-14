import { NextResponse } from "next/server"

// Supabase storage base URL
const SUPABASE_URL = "https://stvydnlkuyjdcfgroqaw.supabase.co/storage/v1/object/public/stems"

export async function GET() {
  try {
    // Test URLs for each category
    const testUrls = [
      `${SUPABASE_URL}/drums/d1.wav`,
      `${SUPABASE_URL}/pads/p1.wav`,
      `${SUPABASE_URL}/bass/b1.wav`,
      `${SUPABASE_URL}/noise/n1.wav`,
    ]

    // Check if files exist
    const results = await Promise.all(
      testUrls.map(async (url) => {
        try {
          const response = await fetch(url, { method: "HEAD" })
          return {
            url,
            exists: response.ok,
            status: response.status,
            contentType: response.headers.get("content-type"),
            contentLength: response.headers.get("content-length"),
          }
        } catch (error) {
          return {
            url,
            exists: false,
            error: (error as Error).message,
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      message: "Supabase connection test",
      results,
    })
  } catch (error) {
    console.error("Supabase test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
