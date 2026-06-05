import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export type Brand = 'ullim' | 'dfz'
export type ContentType = 'artist-image' | 'artist-caption' | 'poster-caption'

export interface GenerateRequest {
  contentType: ContentType
  brand: Brand
  input: string // bio text (artist) OR free-form event info (poster)
}

export interface GenerateResponse {
  korean?: string
  english?: string
}

/* ────────────────────────────────────────────────────────────
   Brand tone (from ullim brand guidebook + DFZ concept)
   ──────────────────────────────────────────────────────────── */

const BRAND_TONE: Record<Brand, string> = {
  ullim: `# Brand: ullim (울림) — main brand
- Identity: "사운드로 도시를 감싸 안는, 가장 포근한 나이트라이프의 울림"
- Slogan: 문턱은 낮게, 울림은 깊게 / Catchphrase: "Your Flow, Our Resonance."
- Values: 포용성, 음악적 깊이(Deep House·Acid·Melodic), 감성적 연결, 도시적 따뜻함
- Tone: 따뜻하고 포근, 여백 있는 단문, 절제된 세련미. 감각 어휘: 잔향, 파도, 온기, 공명, 몰입.`,
  dfz: `# Brand: DFZ (Duty Free Zone) — ullim sub-brand, bi-weekly residency at bar union, Itaewon
- Catchphrase: "No Duty, Only Flow." / "Find Your Flow, Find Your Frequency."
- Concept: 일상의 의무·경계를 내려놓는 해방의 공간. 국적·언어를 넘는 교류 허브. 도시적·미니멀한 'Frequency(주파수/파동)' 무드.
- Music: narrative House, Melodic Techno, Nu-Disco, Deep House, Acid.
- Tone: ullim의 따뜻함을 공유하되 더 도시적·날것·에너지 중심. 어둠, 그루브, 주파수, 흐름(flow).`,
}

const SHARED_RULES = `# Universal rules
- 과장 마케팅 금지: "최고의", "핫한", "무조건", "매진 임박", "예매 서두르세요" 등.
- 자극적인 클럽 전단지 톤·밈·유행어 금지. 정돈되고 감각적인 호흡 유지.`

/* ────────────────────────────────────────────────────────────
   1·2) Artist intro from biography text
   ──────────────────────────────────────────────────────────── */

const ARTIST_EXAMPLES: Record<Brand, string> = {
  ullim: `[KR] 사랑과 해변의 기억, 디스코와 보사노바의 감성을 멜로딕 하우스로 풀어내는 디제이 IDEALL. 따뜻한 연결을 음악으로 그려냅니다.
[EN] Blending disco, bossa nova, and melodic house, IDEALL weaves stories of love, coastal memories, and deep emotional connection through sound.

[KR] 음악을 통해 현실에서 잠시 벗어나 몸, 정신, 마음을 치유합니다. 미니멀과 로미니멀을 중심으로 딥테크, 테크하우스, 하우스 사이를 넘나듭니다.
[EN] Through music, escapes reality and heals body, mind, and soul — blending minimal, rominimal, deeptech, and house.`,
  dfz: `[KR] 루이빌 출신의 DJ/프로듀서. 어두운 분위기 속 위협적인 애시드와 쉴 새 없는 킥, 그루비한 베이스라인을 엮어 짙은 어둠의 에너지를 직조한다.
[EN] From Louisville, KY USA. Creates a dark, immersive atmosphere through a raw mix of menacing acid, relentless kicks, and driving, groovy basslines.

[KR] 덴마크 오르후스에서 서울까지. 최면적인 그루브와 묵직한 베이스로 공간의 에너지를 응축하며, 직관적인 리듬으로 플로어를 움직인다.
[EN] From Aarhus to Seoul. Weaving hypnotic grooves and heavy bass, Lurkie moves the crowd with intuitive rhythms drawn from the room's energy.`,
}

function artistPrompt(req: GenerateRequest, isImage: boolean): string {
  const limits = isImage
    ? `- Korean: 약 70자 (한글 70자 내외).
- English: 약 130자 (~130 chars).`
    : `- Korean: 2~4문장의 정제된 소개 (캡션 본문용, 길이 여유 있게).
- English: a polished 2~4 sentence introduction (caption body).`

  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}.`,
    `TASK: Take the artist's raw biography text below and REFINE it into a clean ${isImage ? 'carousel image card' : 'carousel post caption'} artist introduction.`,
    BRAND_TONE[req.brand],
    SHARED_RULES,
    ``,
    `# Format examples (match this style, tone, and rhythm)`,
    ARTIST_EXAMPLES[req.brand],
    ``,
    `# Raw artist biography (input)`,
    req.input,
    ``,
    `# Requirements`,
    `- Write in THIRD PERSON describing the artist. Do not address the reader.`,
    `- Keep only the essence; remove filler. Weave genres in naturally.`,
    limits,
    req.brand === 'dfz'
      ? `- DFZ: if an origin city is present, you may lead with it ("From [city].", "[city] 출신의").`
      : `- ullim: lead with feeling/concept, end on a warm note of connection.`,
    `- English is a natural rewrite, NOT a literal translation of the Korean.`,
    ``,
    `Respond ONLY as JSON, no markdown:`,
    `{ "korean": "...", "english": "..." }`,
  ].join('\n')
}

/* ────────────────────────────────────────────────────────────
   3) Poster / Reels caption (party announcement, bilingual)
   ──────────────────────────────────────────────────────────── */

const POSTER_EXAMPLE: Record<Brand, string> = {
  dfz: `ullim presents: Duty Free Zone vol.13

[English Below]

열세 번째 울림, 익숙한 공간을 채우는 가장 낯설고 선명한 파동. DFZ vol.13의 흐름을 시작합니다.

반년의 축적을 지나 새로운 주축을 세우는 지점, 우리는 다시 한번 본질적인 해방의 감각을 마주합니다. 일상의 견고한 질서를 잠시 지워낸 자리에 차오르는 건 오직 소리의 유기적인 흐름과 밀도 높은 에너지뿐입니다.

공간을 가르는 날카로운 전자음의 코어, 그리고 그 사이를 정교하게 파고드는 현(絃)의 진동과 유기적인 질감들. 아티스트들이 설계한 낯설고도 아름다운 궤적 속에서 멈추지 않는 흐름을 경험해 보세요.

NO DUTY, Only Flow.

🗓️ 2026. 05. 21. 목요일
📍 BAR UNION @unionseoul
🎧 DJ
mingsturn
ÅNGEL 004 (live)
T Pharo
with ullim

Your Tempo, Our Resonance.
ullim.

/

ullim presents: Duty Free Zone vol.13

The thirteenth resonance, the most unfamiliar yet vivid wave filling a familiar space. Starting the flow of DFZ vol.13.

At the point of building a new axis beyond six months of accumulation, we once again encounter the essential sense of liberation. In the space where the rigid order of the mundane is erased, only the organic flow of sound and dense energy remain.

The sharp electronic core piercing the space, accompanied by the organic textures and vibrations of strings weaving through the gaps. Experience the unstoppable movement within the unfamiliar yet beautiful trajectories engineered by the artists.

NO DUTY, Only Flow.

🗓️ Thursday, May 21st, 2026
📍 BAR UNION @unionseoul
🎧 DJ
mingsturn
ÅNGEL 004 (live)
T Pharo
with ullim

Your Tempo, Our Resonance.
ullim.`,
  ullim: `AUS of Resonance at MUA HAUS 🏢
[English Below]

이태원의 스카이라인이 펼쳐지는 숨겨진 안식처, 무아하우스(MUA HAUS)에서 ullim의 새로운 여정이 시작됩니다.

이번 밤의 테마는 '무아(無我, MUA)'입니다. 자아의 경계가 흐릿해지고 더 큰 흐름 속에 나를 맡기는 몰입의 상태. 국적, 나이, 배경이라는 테두리를 벗어나 오직 음악과 서로의 존재만이 남는 드문 순간으로 당신을 초대합니다.

특별 게스트로는 UK 하우스/디스코 씬의 전설, Faze Action의 Robin Lee가 함께합니다. 런던의 언더그라운드에서 제주, 그리고 서울의 밤으로 이어지는 그의 깊고 소울풀한 서사가 이태원의 야경 위로 겹쳐집니다.

도시의 불빛 아래에서 길을 잃고, 다시 발견되는 경험.
올라와서, 모든 것을 내려놓으세요.

/

Step into the HAUS of Resonance. ullim lands at @muahaus_seoul, a sanctuary overlooking the Itaewon skyline.

Tonight, we enter the state of 'MUA(無我)' — a rare space where the self dissolves and a collective flow takes over. No backgrounds, no borders, just the pure resonance of the present moment.

Featuring a master of the craft: Robin Lee (Faze Action). A pioneer who shaped the UK House & Disco scene, Robin brings a storied, soulful selection that perfectly captures the spirit of this loft.

Lose yourself in the city's glow.
Come up. Let go.

🗓️ 2026. 04. 04 (SAT)
📍 MUA HAUS (@muahaus_seoul )
🎧 Music by
20:00 Gun Avoir @gun_avoir
21:00 ESCBR @dj_escbr
22:00 Dasol x Y0i @chudasol b2b @iamy0i
23:15 Robin Lee (Faze Action) @robin_lee_
24:45 GUYSTYLE x Ideall (ullim) @guystyle b2b @id.all
02:00 Adroit Joe @adroitjoe

Your Flow, Our Resonance.
ullim.`,
}

function posterPrompt(req: GenerateRequest): string {
  const mandatory =
    req.brand === 'dfz'
      ? `# Mandatory elements (DFZ)
- Header line: "ullim presents: Duty Free Zone vol.{number}" (use the volume number from input).
- Include the line "NO DUTY, Only Flow." after the body, before the info block.
- Closing must be exactly two lines:
  Your Tempo, Our Resonance.
  ullim.`
      : `# Mandatory elements (ullim)
- A short themed title line at the very top (with a fitting emoji), derived from the event theme.
- Closing must be exactly two lines:
  Your Flow, Our Resonance.
  ullim.`

  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}, writing the full Instagram POSTER caption for a party.`,
    BRAND_TONE[req.brand],
    SHARED_RULES,
    ``,
    `# Reference example (follow this exact structure, tone, and bilingual layout)`,
    POSTER_EXAMPLE[req.brand],
    ``,
    mandatory,
    ``,
    `# Structure rules`,
    `- Start with "[English Below]" near the top (after the title/header).`,
    `- Korean version first, then a single line "/", then the English version.`,
    `- Analyze the participating artists from the input and reflect their character/sound in the body.`,
    `- Include an info block with: 🗓️ date, 📍 venue (keep @handles exactly as given), 🎧 lineup (keep times and @handles exactly as given).`,
    `- Do NOT invent dates, venues, handles, or names. Use only what's in the input. If something is missing, omit that line.`,
    `- No hashtags.`,
    ``,
    `# Event info (input)`,
    req.input,
    ``,
    `# Output`,
    `Put the ENTIRE caption (Korean + "/" + English, including title, info block, and closing) into the "korean" field as one complete string. Leave "english" empty.`,
    `Respond ONLY as JSON, no markdown:`,
    `{ "korean": "...full caption...", "english": "" }`,
  ].join('\n')
}

function buildPrompt(req: GenerateRequest): string {
  switch (req.contentType) {
    case 'artist-image':
      return artistPrompt(req, true)
    case 'artist-caption':
      return artistPrompt(req, false)
    case 'poster-caption':
    default:
      return posterPrompt(req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }
    if (!body.contentType || !body.brand || !body.input?.trim()) {
      return NextResponse.json({ error: 'Missing required fields: contentType, brand, input' }, { status: 400 })
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
