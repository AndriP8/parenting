const redFlagPatterns = [
  /sesak\s+napas|napas.*\bsesak\b/i,
  /napas\s+cepat/i,
  /dada\s+cekung/i,
  /tarikan\s+dinding\s+dada/i,
  /\bretraksi\b/i,
  /(?:difficulty|trouble|shortness\s+of)\s+breath(?:ing)?/i,
  /\bkejang\b/i,
  /\b(?:seizure|convulsion)s?\b/i,
  /(?:tampak|terlihat)\s+biru/i,
  /\bcyanosis\b/i,
  /\bblue\s+(?:lips|skin)\b/i,
  /(?:kesadaran\s+menurun|tidak\s+sadar|tidak\s+responsif)/i,
  /\b(?:reduced|altered|loss\s+of)\s+consciousness\b/i,
  /\b(?:unconscious|unresponsive)\b/i,
  /(?:tidak|tak)\s+bisa\s+menyusu/i,
  /(?:unable|cannot|can't)\s+(?:to\s+)?(?:breast)?feed/i,
  /cannot\s+nurse/i,
]

export const EMERGENCY_RESPONSE =
  'Tanda bahaya medis terdeteksi. Segera bawa anak ke Puskesmas atau rumah sakit terdekat untuk mendapatkan pertolongan medis. Jangan menunda mencari pertolongan.'

export function containsRedFlag(question: string): boolean {
  const normalized = question.normalize('NFKC').replace(/\s+/g, ' ').trim()
  return redFlagPatterns.some((pattern) => pattern.test(normalized))
}
