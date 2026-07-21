export type Brand = 'ullim' | 'dfz'
export type ContentType = 'artist-image' | 'artist-caption' | 'poster-caption'

/* ────────────────────────────────────────────────────────────
   Brand identity + tone matrix (brand × content type)
   ──────────────────────────────────────────────────────────── */

const BRAND_IDENTITY: Record<Brand, string> = {
  ullim: `# Brand identity: ullim (울림) — main brand
- Identity: "사운드로 도시를 감싸 안는, 가장 포근한 나이트라이프의 울림"
- Slogan: 문턱은 낮게, 울림은 깊게 / Catchphrase: "Your Tempo, Our Resonance."
- Values: 포용성, 음악적 깊이(Deep House·Acid·Melodic), 감성적 연결, 도시적 따뜻함`,
  dfz: `# Brand identity: DFZ (Duty Free Zone) — ullim sub-brand, bi-weekly residency at BAR UNION, Itaewon
- Catchphrase: "No Duty, Only Flow." / "Find Your Flow, Find Your Frequency."
- Concept: 일상의 의무·경계를 내려놓는 해방의 공간. 국적·언어를 넘는 교류 허브. 도시적·미니멀한 'Frequency(주파수/파동)' 무드.
- Music: narrative House, Melodic Techno, Nu-Disco, Deep House, Acid.`,
}

// Tone rules per (brand × content type). Every generation uses EXACTLY one cell.
const TONE_MATRIX: Record<Brand, Record<ContentType, string>> = {
  ullim: {
    'artist-image': `# Tone rules — ullim × 아티스트 이미지
- 문체: 따뜻한 정중체. 종결어미는 "~합니다 / ~그려냅니다 / ~넘나듭니다"처럼 부드럽게 끝낸다.
- 어휘: 잔향, 파도, 온기, 공명, 몰입, 연결. 감성적이고 포근한 감각 어휘.
- 호흡: 여백 있는 단문. 절제된 세련미. 감성에서 시작해 연결로 마무리.`,
    'artist-caption': `# Tone rules — ullim × 아티스트 캡션
- 문체: 따뜻한 정중체 ("~합니다 / ~맡기세요 / ~초대합니다").
- 어휘: 잔향, 파도, 온기, 공명, 몰입, 연결. 포근하고 감성적인 표현.
- 마무리 문장은 부드러운 초대의 어조로.`,
    'poster-caption': `# Tone rules — ullim × 포스터 캡션
- 문체: 따뜻한 정중체 ("~합니다 / ~초대합니다 / ~내려놓으세요").
- 어휘: 잔향, 공명, 온기, 몰입, 여정, 안식처. 서정적이고 시적인 서사.
- 테마(공간·컨셉)를 중심으로 이야기를 풀고, 독자를 따뜻하게 초대하며 마무리.`,
  },
  dfz: {
    'artist-image': `# Tone rules — DFZ × 아티스트 이미지
- 문체(중요): 건조하고 단정적인 평서체. 종결어미는 "-한다 / -이다 / 명사형"으로만 끝낸다. "~합니다 / ~입니다 / ~하세요" 같은 정중체·경어체 절대 금지. (예: "에너지를 직조한다", "플로어를 움직인다", "루이빌 출신의 DJ/프로듀서.")
- 어휘: 어둠, 그루브, 주파수, 흐름(flow), 에너지, 밀도. 도시적·날것.
- 호흡: 군더더기 없는 단문. 차갑지만 밀도 높게.`,
    'artist-caption': `# Tone rules — DFZ × 아티스트 캡션
- 문체: 정중체를 사용한다 ("~합니다 / ~구축합니다 / ~맡기세요"). 이 콘텐츠 타입에서는 건조체를 쓰지 않는다.
- 어휘: 어둠, 그루브, 주파수, 플로우, 해방, 에너지. 도시적이고 에너지 중심.
- 마무리 문장은 플로어/흐름으로 끌어들이는 초대의 어조로.`,
    'poster-caption': `# Tone rules — DFZ × 포스터 캡션
- 문체: 정중체를 사용한다 ("~합니다 / ~마주합니다 / ~경험해 보세요"). 이 콘텐츠 타입에서는 건조체를 쓰지 않는다.
- 어휘: 파동, 해방, 흐름, 주파수, 밀도, 궤적. 도시적·미니멀한 서사.
- 일상의 질서에서 벗어나는 해방의 감각을 서사의 축으로.`,
  },
}

// Negative rules: what leaks in from the OTHER brand and must be kept out.
const TONE_CONTRAST: Record<Brand, string> = {
  ullim: `# 혼동 금지 (ullim ≠ DFZ)
- 지금 쓰는 것은 ullim 콘텐츠다. DFZ의 어휘·무드(어둠, 날것, 위협적, 해방, 주파수)를 섞지 마라.
- ullim은 어둡거나 차갑지 않다. 포근하고 감싸 안는 따뜻함이 핵심이다.`,
  dfz: `# 혼동 금지 (DFZ ≠ ullim)
- 지금 쓰는 것은 DFZ 콘텐츠다. ullim의 어휘·무드(포근함, 온기, 파도, 감싸 안는)를 섞지 마라.
- DFZ는 따뜻하지 않다. 도시적이고 어둡고 에너지 중심이다.`,
}

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  'artist-image': '아티스트 이미지 (캐러셀 카드용 짧은 소개)',
  'artist-caption': '아티스트 캡션 (캐러셀 게시물 본문)',
  'poster-caption': '포스터 캡션 (파티 공지 풀 캡션, 한/영)',
}

// Standard prompt header: make the model state-aware before any other rule.
export function toneContext(brand: Brand, contentType: ContentType): string {
  return [
    `# CONTEXT — read first`,
    `- BRAND: ${brand === 'ullim' ? 'ullim (메인 브랜드)' : 'DFZ (Duty Free Zone, ullim 서브 브랜드)'}`,
    `- CONTENT TYPE: ${CONTENT_TYPE_LABEL[contentType]}`,
    `- 아래의 톤 규칙은 정확히 이 브랜드×콘텐츠 조합을 위한 것이다. 다른 조합의 톤을 절대 섞지 마라.`,
    ``,
    BRAND_IDENTITY[brand],
    ``,
    TONE_MATRIX[brand][contentType],
    ``,
    TONE_CONTRAST[brand],
  ].join('\n')
}

export const SELF_CHECK = `# 출력 전 자가 점검 (조용히 수행)
1. 종결어미가 위 톤 규칙과 일치하는가?
2. 어휘가 이 브랜드의 것인가? 다른 브랜드의 무드가 섞이지 않았는가?
3. 포맷 규칙(구조·글자수·필수 요소)을 지켰는가?
위반이 있으면 고친 뒤에만 출력하라.`

export const SHARED_RULES = `# Universal rules
- 과장 마케팅 금지: "최고의", "핫한", "무조건", "매진 임박", "예매 서두르세요" 등.
- 자극적인 클럽 전단지 톤·밈·유행어 금지. 정돈되고 감각적인 호흡 유지.`
