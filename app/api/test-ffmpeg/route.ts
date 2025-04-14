import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execPromise = promisify(exec)

export async function GET() {
  try {
    // Test if ffmpeg is available
    const { stdout, stderr } = await execPromise("ffmpeg -version")

    return NextResponse.json({
      success: true,
      message: "ffmpeg is available",
      version: stdout.split("\n")[0],
      fullOutput: stdout,
      stderr,
    })
  } catch (error) {
    console.error("ffmpeg test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "ffmpeg is not available",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
