import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface GenerateRequest {
  contentType: string
  title: string
  dateVenue?: string
  djs?: string
  moodKeywords: string
  language: 'korean' | 'english' | 'both'
}

export interface GenerateResponse {
  caption: string
  hashtags: string
}

function buildPrompt(req: GenerateRequest): string {
  const langInstruction =
    req.language === 'korean'
      ? '모든 내용을 한국어로 작성하세요.'
      : req.language === 'english'
      ? 'Write everything in English.'
      : '캡션은 한국어로 먼저 작성하고 그 아래에 영어 번역을 추가하세요. (Write the caption in Korean first, then add an English translation below.)'

  const contentTypeMap: Record<string, string> = {
    '이벤트/파티': 'event or party announcement',
    'DJ 믹스셋': 'DJ mix set release',
    '릴스/스토리': 'Reels or Stories short video',
    '일반 포스트': 'general post',
  }

  const contentTypeDesc = contentTypeMap[req.contentType] || req.contentType

  const lines = [
    `You are a social media copywriter for **ullim**, an underground electronic music DJ collective based in Korea.`,
    `ullim's aesthetic is dark, minimal, and editorial — rooted in techno, house, and experimental electronic music.`,
    `ullim's tone is confident, atmospheric, and community-driven. Never cheesy or overly promotional.`,
    ``,
    `Generate Instagram content for the following:`,
    `- Content type: ${contentTypeDesc}`,
    `- Title: ${req.title}`,
    req.dateVenue ? `- Date/Venue: ${req.dateVenue}` : null,
    req.djs ? `- Featured DJs: ${req.djs}` : null,
    `- Mood/Keywords: ${req.moodKeywords}`,
    ``,
    langInstruction,
    ``,
    `Respond in the following JSON format ONLY, no markdown, no extra text:`,
    `{`,
    `  "caption": "The full Instagram caption (2-5 sentences, evocative and atmospheric, can include line breaks with \\n)",`,
    `  "hashtags": "30 relevant hashtags as a single space-separated string starting with # (mix of Korean and English hashtags regardless of language setting, include tags like #ullim #언더그라운드 #테크노 #하우스 #electronicmusic #techno #house #underground and relevant specific tags)"`,
    `}`,
  ].filter(Boolean)

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    if (!body.title || !body.moodKeywords || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, title, moodKeywords' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = buildPrompt(body)

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned) as GenerateResponse

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
