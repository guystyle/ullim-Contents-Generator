import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { fetchRealExamples, realExamples, type RealExamples } from '@/lib/insta-examples'
import { toneContext, SHARED_RULES, SELF_CHECK, type Brand, type ContentType } from '@/lib/tone'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export type { Brand, ContentType }

export interface PosterData {
  vol: string // e.g. "vol.13" (optional)
  theme: string // free-text theme/concept/notes — feeds the narrative body
  krInfo: string // deterministic Korean info block (date/venue/lineup), pre-formatted
  enInfo: string // deterministic English info block, pre-formatted
}

export interface GenerateRequest {
  contentType: ContentType
  brand: Brand
  input: string // bio text (artist) OR theme text (poster)
  poster?: PosterData // structured event info for poster-caption
}

export interface GenerateResponse {
  korean?: string
  english?: string
}

// Standard prompt header: make the model state-aware before any other rule.
const contextBlock = (req: GenerateRequest): string => toneContext(req.brand, req.contentType)

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

function artistImagePrompt(req: GenerateRequest): string {
  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}.`,
    `TASK: Take the artist's raw biography text below and REFINE it into a clean carousel image card artist introduction.`,
    ``,
    contextBlock(req),
    SHARED_RULES,
    ``,
    `# Format examples (match this style, tone, and rhythm)`,
    ARTIST_EXAMPLES[req.brand],
    ``,
    `# Raw artist biography (input)`,
    req.input,
    ``,
    `# Requirements`,
    `- GROUND EVERYTHING IN THE BIOGRAPHY: every fact, genre, place, and image must come from (or be directly implied by) the input bio. Do not add scenes, moods, or claims that have no basis in the bio. The brand tone decides HOW you write; the biography decides WHAT you write.`,
    `- Brand vocabulary (잔향/온기/그루브/주파수 등) may only be used where it genuinely fits what the bio describes — never force it in.`,
    `- Write in THIRD PERSON describing the artist. Do NOT mention the artist's name anywhere in the text.`,
    `- Keep only the essence; remove filler. Weave genres in naturally.`,
    `- Korean: STRICTLY 60~75자. Count carefully before outputting. If over 75자, trim. If under 60자, expand.`,
    `- English: STRICTLY 120~140 characters (count spaces too). If over 140, trim. If under 120, expand.`,
    req.brand === 'dfz'
      ? `- DFZ: if an origin city is present, you may lead with it ("From [city].", "[city] 출신의").`
      : `- ullim: lead with feeling/concept, end on a warm note of connection.`,
    `- English is a natural rewrite, NOT a literal translation of the Korean.`,
    ``,
    SELF_CHECK,
    ``,
    `Respond ONLY as JSON, no markdown:`,
    `{ "korean": "...", "english": "..." }`,
  ].join('\n')
}

/* ────────────────────────────────────────────────────────────
   2) Artist carousel POST caption (fixed format + event info block)
   ──────────────────────────────────────────────────────────── */

const ARTIST_CAPTION_EXAMPLE = `ESCBR을 소개합니다.

전 세계 하우스와 디스코 사운드를 탐험하며 플로어를 뜨겁게 달구는 큐레이터.
그는 70~80년대 아시아 바이닐 컬렉터로서 고전적인 깊이와 현재의 에너지를 결합하는 독특한 음악적 정체성을 구축합니다.

대전과 서울을 기반으로 활동하며 쌓아 올린 그의 깊고 서사적인 플로우에 몸을 맡기세요.

ullim presents: DFZ (Duty Free Zone)
🗓️ 2025. 11. 28. 금요일
📍 BAR UNION @unionseoul
👤 ESCBR @dj_escbr`

function artistCaptionPrompt(req: GenerateRequest, examples: RealExamples): string {
  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}.`,
    `TASK: Take the input below (artist biography + event info) and write an Instagram carousel POST caption introducing the artist, following the EXACT format shown.`,
    ``,
    contextBlock(req),
    SHARED_RULES,
    ``,
    `# Format example (follow this structure EXACTLY)`,
    ARTIST_CAPTION_EXAMPLE,
    realExamples(examples, req.brand, 'artistCaptions'),
    ``,
    `# Strict format rules`,
    `1. First line: use the "오프닝(첫 줄, 그대로 사용):" value from the input VERBATIM as the opening line. Do not change the 조사 or wording.`,
    `2. Blank line.`,
    `3. Body: 2~3 sentences. Do NOT copy the input biography sentences verbatim — REWRITE them in the brand's own voice. Extract only the essence (genre, identity, background) and restructure into fresh sentences with varied phrasing and rhythm. Keep all facts accurate; never invent new facts. Third person.`,
    `4. Blank line.`,
    `5. Exactly ONE closing sentence inviting the reader (e.g. "~에 몸을 맡기세요.").`,
    `6. Blank line.`,
    `7. Event info block. Use ONLY information present in the input — never invent dates, venues, handles, or names. Keep @handles exactly as given. Format:`,
    req.brand === 'dfz'
      ? `   Header line: "ullim presents: DFZ (Duty Free Zone)" — if a 회차(round, e.g. vol.13) is given, append it: "ullim presents: DFZ (Duty Free Zone) vol.13".`
      : `   Header line: "ullim presents:" — if a 회차(round) is given, append it after.`,
    `   🗓️ {date}  (use the 날짜 value exactly as given, keep the "(요일)" part)`,
    `   📍 {venue name} {@venue handle}`,
    `   👤 {dj name} {@dj handle}`,
    `   (omit any line whose info is missing in the input)`,
    ``,
    `# Input (biography + event info)`,
    req.input,
    ``,
    SELF_CHECK,
    ``,
    `# Output`,
    `Write the entire caption in Korean. Put it all in the "korean" field, leave "english" empty.`,
    `Respond ONLY as JSON, no markdown:`,
    `{ "korean": "...full caption...", "english": "" }`,
  ].join('\n')
}

/* ────────────────────────────────────────────────────────────
   3) Poster / Reels caption (party announcement, bilingual)
   ──────────────────────────────────────────────────────────── */

const POSTER_EXAMPLE: Record<Brand, string> = {
  dfz: `ullim presents: Duty Free Zone vol.13

[English Below]

열세 번째 울림, 익숙한 공간을 채우는 가장 낯설고 선명한 파동. DFZ vol.13의 흐름을 시작한다.

반년의 축적을 지나 새로운 주축을 세우는 지점, 다시 한번 본질적인 해방의 감각을 마주한다. 일상의 견고한 질서를 잠시 지워낸 자리에 차오르는 건 오직 소리의 유기적인 흐름과 밀도 높은 에너지뿐이다.

공간을 가르는 날카로운 전자음의 코어, 그리고 그 사이를 정교하게 파고드는 현(絃)의 진동과 유기적인 질감들. 아티스트들이 설계한 낯설고도 아름다운 궤적 속에서 멈추지 않는 흐름을 마주한다.

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

Your Tempo, Our Resonance.
ullim.`,
}

function posterPrompt(req: GenerateRequest, examples: RealExamples): string {
  const p = req.poster
  const titleRule =
    req.brand === 'dfz'
      ? `- DO NOT write a title. The header line ("ullim presents: Duty Free Zone…") is added automatically — leave krTitle and enTitle as empty strings "".`
      : `- Write a short themed TITLE line for each language (krTitle, enTitle) with a fitting emoji, derived from the theme. These open each language section.`

  return [
    `You are the copywriter for ${req.brand === 'ullim' ? 'ullim' : 'DFZ (ullim sub-brand)'}, writing the NARRATIVE BODY of an Instagram poster caption for a party.`,
    ``,
    contextBlock(req),
    SHARED_RULES,
    ``,
    `# Reference example (for TONE and rhythm of the body only — do NOT copy its structure/info block)`,
    POSTER_EXAMPLE[req.brand],
    realExamples(examples, req.brand, 'posterCaptions'),
    ``,
    `# Your job — write ONLY the narrative body, in BOTH Korean and English`,
    `- The event's fixed info (date, venue, DJ lineup), the "[English Below]" marker, the header, the "NO DUTY, Only Flow." line, and the closing signature are ALL added automatically afterward. DO NOT write any of them.`,
    `- Write 2~3 short paragraphs of narrative that set the mood and reflect the artists/theme below. This is the only creative text.`,
    titleRule,
    `- The English body is a natural rewrite of the Korean, NOT a literal translation.`,
    `- No hashtags. Do NOT list the lineup, date, or venue inside the body.`,
    ``,
    `# Theme / concept / notes`,
    p?.theme?.trim() || req.input,
    ``,
    `# Fixed info for reference (already formatted — reference the artists in your body, but DO NOT reproduce this block)`,
    p?.krInfo ?? '',
    ``,
    SELF_CHECK,
    ``,
    `# Output`,
    `Respond ONLY as JSON, no markdown:`,
    `{ "krTitle": "...", "enTitle": "...", "koreanBody": "...", "englishBody": "..." }`,
  ].join('\n')
}

interface PosterParts {
  krTitle?: string
  enTitle?: string
  koreanBody?: string
  englishBody?: string
}

// Deterministically assemble the full bilingual poster caption around the
// AI-written narrative. The recurring info block, header, mandatory line and
// closing are fixed here so they never drift between generations.
function assemblePoster(brand: Brand, p: PosterData, parts: PosterParts): string {
  const closing = 'Your Tempo, Our Resonance.\nullim.'
  const header =
    brand === 'dfz' ? `ullim presents: Duty Free Zone${p.vol.trim() ? ` ${p.vol.trim()}` : ''}` : ''
  const mandatory = brand === 'dfz' ? 'NO DUTY, Only Flow.' : ''
  const krBody = (parts.koreanBody ?? '').trim()
  const enBody = (parts.englishBody ?? '').trim()

  const section = (top: string, body: string, info: string) =>
    [top, body, mandatory, info, closing].filter(Boolean).join('\n\n')

  const krTop = brand === 'dfz' ? `${header}\n\n[English Below]` : `${(parts.krTitle ?? '').trim()}\n[English Below]`
  const enTop = brand === 'dfz' ? header : (parts.enTitle ?? '').trim()

  return [section(krTop, krBody, p.krInfo), '/', section(enTop, enBody, p.enInfo)].join('\n\n')
}

function buildPrompt(req: GenerateRequest, examples: RealExamples): string {
  switch (req.contentType) {
    case 'artist-image':
      return artistImagePrompt(req)
    case 'artist-caption':
      return artistCaptionPrompt(req, examples)
    case 'poster-caption':
    default:
      return posterPrompt(req, examples)
  }
}

const stripQuotes = (s: string) => s.trim().replace(/^["'`]+|["'`]+$/g, '').trim()

// Re-compress an over-length field via a focused follow-up call. Tries up to 2 times.
async function enforceLength(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  text: string,
  lang: 'ko' | 'en',
  min: number,
  max: number,
  brand: Brand
): Promise<string> {
  const dryRule =
    brand === 'dfz'
      ? ' 종결어미는 반드시 "-한다 / -이다 / 명사형"으로 끝내고, "~합니다 / ~입니다 / ~하세요" 같은 경어체는 절대 쓰지 마.'
      : ''
  let current = stripQuotes(text)
  for (let i = 0; i < 2 && current.length > max; i++) {
    const prompt =
      lang === 'ko'
        ? `다음 아티스트 소개 문장을 의미와 톤은 유지하되 반드시 ${min}~${max}자 사이로 줄여줘. 아티스트 이름은 절대 넣지 마.${dryRule} 다른 설명 없이 줄인 문장만 출력해.\n\n현재 ${current.length}자:\n${current}`
        : `Rewrite this artist introduction to STRICTLY ${min}-${max} characters (currently ${current.length}). Keep the meaning and tone. Do not include the artist's name. Output only the rewritten sentence, nothing else.\n\n${current}`
    try {
      const r = await model.generateContent(prompt)
      const next = stripQuotes(r.response.text())
      if (next) current = next
    } catch {
      break
    }
  }
  return current
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
    if (body.contentType === 'poster-caption' && !body.poster) {
      return NextResponse.json({ error: 'Missing poster event info' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      // Low temperature keeps the brand tone consistent across runs.
      generationConfig: { temperature: 0.35 },
    })
    const examples = await fetchRealExamples()
    const prompt = buildPrompt(body, examples)

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

    // Poster: the model returns only narrative parts; we assemble the full caption
    // deterministically so the recurring info block never drifts.
    if (body.contentType === 'poster-caption') {
      const parts = JSON.parse(cleaned) as PosterParts
      const korean = assemblePoster(body.brand, body.poster!, parts)
      return NextResponse.json({ korean, english: '' } as GenerateResponse)
    }

    const parsed = JSON.parse(cleaned) as GenerateResponse

    // Hard-enforce length limits for the image card (model is unreliable on its own).
    if (body.contentType === 'artist-image') {
      if (parsed.korean) parsed.korean = await enforceLength(model, parsed.korean, 'ko', 60, 75, body.brand)
      if (parsed.english) parsed.english = await enforceLength(model, parsed.english, 'en', 120, 140, body.brand)
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
