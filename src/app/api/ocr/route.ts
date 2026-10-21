import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const maxDuration = 30

// Reads the artist-introduction text off a carousel card image.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }
    const { image, mimeType } = (await req.json()) as { image?: string; mimeType?: string }
    if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 })

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
    const result = await model.generateContent([
      { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } },
      [
        'This image is an Instagram carousel artwork (two slides side by side) introducing a DJ.',
        'Extract ONLY the artist introduction body text, exactly as written (Korean and/or English).',
        'Exclude: the artist name as a title, dates, venue, @handles, logos, event names, and any decorative text.',
        'Keep the original wording and line breaks. Do not translate, summarize, or add anything.',
        'Output only the extracted text, with no quotes or explanation. If there is no such text, output nothing.',
      ].join('\n'),
    ])
    const text = result.response.text().trim().replace(/^["'`]+|["'`]+$/g, '').trim()
    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
