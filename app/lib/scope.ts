export type ScopeStatus = 'live' | 'planned'

export interface ScopeTopic {
  id: string
  label: string
  exampleQuestion: string
  status: ScopeStatus
}

export const SCOPE_TOPICS: ScopeTopic[] = [
  {
    id: 'growth',
    status: 'live',
    label: 'Pertumbuhan',
    exampleQuestion:
      'Bagaimana membaca kurva pertumbuhan berat badan bayi di Buku KIA?',
  },
  {
    id: 'sleep',
    status: 'live',
    label: 'Tidur',
    exampleQuestion:
      'Berapa lama bayi seharusnya tidur dalam sehari, dan bagaimana pola tidurnya?',
  },
  {
    id: 'immunization',
    status: 'live',
    label: 'Imunisasi',
    exampleQuestion:
      'Kapan jadwal imunisasi DPT berikutnya dan apa efek samping yang wajar?',
  },
  {
    id: 'danger-signs',
    status: 'live',
    label: 'Tanda Bahaya',
    exampleQuestion:
      'Apa saja tanda bahaya pada bayi yang harus segera dibawa ke dokter?',
  },
  {
    id: 'milestones',
    status: 'live',
    label: 'Perkembangan',
    exampleQuestion: 'Kapan bayi biasanya mulai merangkak dan duduk sendiri?',
  },
  {
    id: 'mpasi',
    status: 'live',
    label: 'MPASI',
    exampleQuestion:
      'Kapan dan bagaimana memulai MPASI pertama untuk bayi usia 6 bulan?',
  },
  {
    id: 'family-welfare',
    status: 'planned',
    label: 'Kesejahteraan Keluarga',
    exampleQuestion: '',
  },
  {
    id: 'nurturing-care',
    status: 'planned',
    label: 'Pengasuhan & Stimulasi',
    exampleQuestion: '',
  },
]

export const LIVE_TOPICS = SCOPE_TOPICS.filter((t) => t.status === 'live')
export const PLANNED_TOPICS = SCOPE_TOPICS.filter((t) => t.status === 'planned')

export const OUT_OF_SCOPE_NOTE =
  'Di luar cakupan: dosis obat, diagnosis medis, perhitungan kalkulator pertumbuhan, dan konten berbayar/komersial.'

const outOfScopePatterns = [
  /hitung.*z[- ]?(score|skor)|z[- ]?(score|skor).*hitung/i,
  /\bhitung.*\b(BB|TB)\/(U|TB)|(BB|TB)\/(U|TB).*\bhitung/i,
  /dosis\s+obat|dosisnya\s+\d/i,
  /\bantidepresan\b/i,
]

export function containsOutOfScope(question: string): boolean {
  const normalized = question.normalize('NFKC').replace(/\s+/g, ' ').trim()
  return outOfScopePatterns.some((pattern) => pattern.test(normalized))
}
