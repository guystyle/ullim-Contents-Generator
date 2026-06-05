import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export type Brand = 'ullim' | 'dfz'
export type ContentType = 'artist-image' | 'carousel-caption' | 'reels-caption'
export type Language = 'korean' | 'english' | 'both'

export interface GenerateRequest {
  contentType: ContentType
  brand: Brand
  language: Language
  // artist-image / shared
  artistName?: string
  origin?: string
  genres?: string
  vibe?: string
  // caption types
  partyName?: string
  dateVenue?: string
  lineup?: string
  ticketLink?: string
  notes?: string
}

export interface GenerateResponse {
  // artist-image
  korean?: string
  english?: string
  // caption types
  caption?: string
  hashtags?: string
}

/* ────────────────────────────────────────────────────────────
   Brand tone definitions (from ullim brand guidebook + DFZ concept)
   ──────────────────────────────────────────────────────────── */

const BRAND_TONE: Record<Brand, string> = {
  ullim: `# Brand: ullim (울림) — main brand
- One-line identity: "사운드로 도시를 감싸 안는, 가장 포근한 나이트라이프의 울림"
- Slogan: 문턱은 낮게, 울림은 깊게 / Catchphrase: "Your Tempo. Our Resonance."
- Core values: 포용성(Inclusivity), 음악적 깊이(Deep House·Acid·Melodic), 감성적 연결(Resonance), 도시적 따뜻함(Urban Warmth)
- Tone: 따뜻하고 포근함, 여백 있는 단문, 절제된 세련미. 감각적 어휘 사용: "잔향", "파도", "온기", "공명".
- Mood: emotional, warm, healing, connection. Leads with feeling/concept, weaves genre in naturally.`,
  dfz: `# Brand: DFZ (Duty Free Zone) — ullim sub-brand, bi-weekly residency at bar union, Itaewon
- Catchphrase: "No Duty, Only Flow." / "Find Your Flow, Find Your Frequency."
- Concept: 일상의 의무와 경계를 내려놓는 해방의 공간. 국적·언어를 넘는 교류 허브. 도시적이고 미니멀한 'Frequency(주파수/파동)' 무드.
- Music: narrative House, Melodic Techno, Nu-Disco, Deep House, Acid.
- Tone: ullim의 따뜻함을 공유하되, 조금 더 도시적·날것·에너지 중심. 어둠, 그루브, 주파수, 흐름(flow) 같은 키워드. 절제되지만 강렬한 호흡.`,
}

const SHARED_RULES = `# Universal rules (ullim & DFZ)
- 절대 과장 마케팅 표현 금지: "최고의", "핫한", "무조건", "매진 임박", "예매 서두르세요" 등.
- 자극적·원색적인 클럽 전단지 톤 금지. 밈/유행어 금지.
- 정돈되고 감각적인 호흡 유지. 군더더기 없는 문장.`

/* ────────────────────────────────────────────────────────────
   Prompt builders per content type
   ──────────────────────────────────────────────────────────── */

function artistImagePrompt(req: GenerateRequest): string {
  const examples =
    req.brand === 'ullim'
      ? `# Format examples (ullim main — match this exact style, tone, and length)
[KR] 사랑과 해변의 기억, 디스코와 보사노바의 감성을 멜로딕 하우스로 풀어내는 디제이 IDEALL. 따뜻한 연결을 음악으로 그려냅니다.
[EN] Blending disco, bossa nova, and melodic house, IDEALL weaves stories of love, coastal memories, and deep emotional connection through sound.

[KR] 음악을 통해 현실에서 잠시 벗어나 몸, 정신, 마음을 치유합니다. 미니멀과 로미니멀을 중심으로 딥테크, 테크하우스, 하우스 사이를 넘나듭니다.
[EN] Through music, escapes reality and heals body, mind, and soul — blending minimal, rominimal, deeptech, and house.`
      : `# Format examples (DFZ — match this exact style, tone, and length)
[KR] 루이빌 출신의 DJ/프로듀서. 어두운 분위기 속 위협적인 애시드와 쉴 새 없는 킥, 그루비한 베이스라인을 엮어 짙은 어둠의 에너지를 직조한다.
[EN] From Louisville, KY USA. Creates a dark, immersive atmosphere through a raw mix of menacing acid, relentless kicks, and driving, groovy basslines.

[KR] 덴마크 오르후스에서 서울까지. 최면적인 그루브와 묵직한 베이스로 공간의 에너지를 응축하며, 직관적인 리듬으로 플로어를 움직인다.
[EN] From Aarhus to Seoul. Weaving hypnotic grooves and heavy bass, Lurkie moves the crowd with intuitive rhythms drawn from the room's energy.`

  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}, writing an ARTIST INTRODUCTION for an Instagram carousel image card.`,
    BRAND_TONE[req.brand],
    SHARED_RULES,
    ``,
    examples,
    ``,
    `# This artist`,
    req.artistName ? `- Name: ${req.artistName}` : null,
    req.origin ? `- Origin/based: ${req.origin}` : null,
    req.genres ? `- Genres: ${req.genres}` : null,
    req.vibe ? `- Vibe / notes: ${req.vibe}` : null,
    ``,
    `# Strict requirements`,
    `- Write in THIRD PERSON describing the artist (do not address the reader).`,
    `- Korean text: about 70 characters (한글 70자 내외). Warm, sensory, no filler.`,
    `- English text: about 130 characters (~130 chars). Natural, not a literal translation of the Korean.`,
    req.brand === 'dfz'
      ? `- DFZ style: if an origin is given, you may lead with it ("From [city].", "[city] 출신의").`
      : `- ullim style: lead with feeling/concept, weave the genres in naturally, end on a warm note of connection.`,
    `- Match the rhythm and length of the examples closely.`,
    ``,
    `Respond ONLY as JSON, no markdown:`,
    `{ "korean": "...", "english": "..." }`,
  ]
    .filter(Boolean)
    .join('\n')
}

function captionPrompt(req: GenerateRequest, isReels: boolean): string {
  const langInstruction =
    req.language === 'korean'
      ? '캡션을 한국어로만 작성하세요.'
      : req.language === 'english'
      ? 'Write the caption in English only.'
      : '캡션을 한국어로 먼저 쓰고, 한 줄 띄운 뒤 영어 버전을 이어서 작성하세요.'

  const structure = isReels
    ? `# Reels caption structure (릴스는 영상이 중심 — 짧고 여운 있게)
- 1~2줄의 짧은 문장. CTA(행동유도)보다 '분위기'와 여운 전달.
- 예: "첫 울림이 남긴 흔적, 아직도 잔향이 이어집니다."`
    : `# Carousel post caption structure (아티스트 라인업 캐러셀 포스트)
- 1줄: 감성적 키워드/컨셉으로 시작
- 2~3줄: 파티 분위기 또는 라인업 소개
- 마지막: 필수 정보(날짜 · 장소 · 라인업 · 예매)를 정돈되게 나열
- 예: "첫 파도의 시작, 그 온기를 함께합니다.\\nullim vol.1 – The First Wave 🌊\\n2025.08.16 @ Mellow Seoul"`

  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}, writing an Instagram ${isReels ? 'Reels' : 'carousel'} post caption.`,
    BRAND_TONE[req.brand],
    SHARED_RULES,
    ``,
    structure,
    ``,
    `# Post details`,
    req.partyName ? `- Event/Party: ${req.partyName}` : null,
    req.dateVenue ? `- Date/Venue: ${req.dateVenue}` : null,
    req.lineup ? `- Lineup: ${req.lineup}` : null,
    req.vibe ? `- Vibe/Keywords: ${req.vibe}` : null,
    req.ticketLink ? `- Ticket/Link: ${req.ticketLink}` : null,
    req.notes ? `- Notes: ${req.notes}` : null,
    ``,
    langInstruction,
    ``,
    `Respond ONLY as JSON, no markdown:`,
    `{`,
    `  "caption": "the caption text, line breaks as \\n",`,
    `  "hashtags": "about 20-30 hashtags, single space-separated string starting with #. Mix Korean + English. Always include #ullim${req.brand === 'dfz' ? ' #dfz #dutyfreezone' : ''} and relevant genre/scene tags."`,
    `}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildPrompt(req: GenerateRequest): string {
  switch (req.contentType) {
    case 'artist-image':
      return artistImagePrompt(req)
    case 'reels-caption':
      return captionPrompt(req, true)
    case 'carousel-caption':
    default:
      return captionPrompt(req, false)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    if (!body.contentType || !body.brand) {
      return NextResponse.json({ error: 'Missing required fields: contentType, brand' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = buildPrompt(body)

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned) as GenerateResponse

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
