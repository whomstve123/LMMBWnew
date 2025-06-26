import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  const { testValue } = body;

  // Optional: Insert into Supabase
  const { data, error } = await supabase.from("test_data").insert([{ value: testValue }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Test route received: ${testValue}`,
    inserted: data,
  });
}
