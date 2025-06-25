import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { testValue } = body;

  return NextResponse.json({
    message: `Test route received: ${testValue}`,
  });
}
