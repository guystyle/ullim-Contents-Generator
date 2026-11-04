// Gemini model IDs. Override in Vercel env vars without a code change.

// Caption writing (generate + partial rewrite): quality matters here.
export const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'

// Reading text off card images: a cheap model is enough.
export const OCR_MODEL = process.env.GEMINI_OCR_MODEL || 'gemini-3.1-flash-lite'
