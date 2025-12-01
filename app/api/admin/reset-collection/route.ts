import { NextResponse } from "next/server";
import { resetCollection } from "@/utils/rekognition";

export async function POST(request: Request) {
  try {
    await resetCollection();
    return NextResponse.json({ success: true, message: "Rekognition collection reset" });
  } catch (error: any) {
    console.error("[reset-collection] Error:", error);
    return NextResponse.json(
      { error: "Failed to reset collection", details: error.message },
      { status: 500 }
    );
  }
}
