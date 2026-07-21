import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { toneContext, SHARED_RULES, type Brand, type ContentType } from '@/lib/tone'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface RewriteRequest {
  brand: Brand
  contentType: ContentType
  lang: 'ko' | 'en'
  fullText: string // the whole caption, for context
  fragment: string // the selected span to rewrite
  instruction?: string // optional user direction (e.g. "더 짧게", "따뜻하게")
}

const strip = (s: string) => s.trim().replace(/^["'`]+|["'`]+$/g, '').trim()

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }
    const body = (await req.json()) as RewriteRequest
    if (!body.brand || !body.contentType || !body.fragment?.trim() || !body.fullText?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.5 },
    })

    const langName = body.lang === 'en' ? 'English' : 'Korean'
    const prompt = [
      `You are editing one small part of an Instagram caption for ${body.brand === 'ullim' ? 'ullim' : 'DFZ'}.`,
      ``,
      toneContext(body.brand, body.contentType),
      SHARED_RULES,
      ``,
      `# Full caption (context only — DO NOT rewrite all of it)`,
      body.fullText,
      ``,
      `# The selected fragment to rewrite (${langName})`,
      body.fragment,
      ``,
      body.instruction?.trim() ? `# 추가 지시\n${body.instruction.trim()}` : '',
      ``,
      `# Rules`,
      `- Rewrite ONLY the selected fragment so it drops seamlessly back into its exact position in the caption.`,
      `- Write in ${langName}.`,
      `- Keep it close to the original fragment's length (do not add or drop whole sentences unless asked).`,
      `- Match the surrounding tone, tense, and 문체 exactly (see tone rules above).`,
      `- Do NOT include any surrounding text, quotes, labels, or explanation. Output ONLY the replacement text for the fragment.`,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await model.generateContent(prompt)
    const rewritten = strip(result.response.text())
    if (!rewritten) return NextResponse.json({ error: 'Empty rewrite' }, { status: 502 })

    return NextResponse.json({ rewritten })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
