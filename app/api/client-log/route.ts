import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // For now, just log to server console
    console.log('[CLIENT LOG]', JSON.stringify(body))
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[CLIENT LOG] Error:', err)
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 400 })
  }
}
