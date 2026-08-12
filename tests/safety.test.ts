import { describe, expect, it } from 'vitest'
import { containsRedFlag, EMERGENCY_RESPONSE } from '../app/lib/safety'
import { containsOutOfScope } from '../app/lib/scope'
import { handleParentingQuery } from '../app/utils/parenting.function'

describe('deterministic red-flag safety gate', () => {
  it.each([
    'Anak sesak napas sejak tadi malam',
    'Bayi saya umurnya 3 bulan, napasnya terlihat sangat cepat dan sesak sampai dadanya cekung, harus bagaimana?',
    'napas cepat dan dada cekung',
    'tarikan dinding dada pada bayi',
    'ada retraksi di dada bayi',
    'My baby is having a seizure',
    'Bibir tampak biru',
    'The child is unresponsive',
    'Bayi tidak bisa menyusu',
  ])('detects %s', (question) => {
    expect(containsRedFlag(question)).toBe(true)
  })

  it('uses conservative matching for negated danger phrases', () => {
    expect(
      containsRedFlag('Tidak sesak napas, tetapi saya ingin tahu tandanya'),
    ).toBe(true)
  })

  it('returns the fixed emergency response before normal processing', async () => {
    const result = await handleParentingQuery({ question: 'Baby has cyanosis' })
    expect(result).toEqual({ status: 'emergency', answer: EMERGENCY_RESPONSE })
  })
})

describe('deterministic out-of-scope gate', () => {
  it.each([
    'Tolong hitungkan z-score BB/U anak saya, berat 6.5 kg umur 4 bulan',
    'hitung z-skor berat badan bayi saya',
    'berapa dosis obat paracetamol untuk bayi 3 bulan',
    'dosisnya 0.5ml apakah aman',
    'apakah obat antidepresan aman untuk ibu menyusui',
  ])('detects %s', (question) => {
    expect(containsOutOfScope(question)).toBe(true)
  })

  it('does not flag in-scope questions', () => {
    expect(
      containsOutOfScope('Kapan waktu yang tepat untuk mulai MPASI?'),
    ).toBe(false)
    expect(
      containsOutOfScope('Bagaimana cara menstimulasi bayi 3 bulan?'),
    ).toBe(false)
    expect(
      containsOutOfScope('Berapa kenaikan berat badan minimal untuk bayi?'),
    ).toBe(false)
  })

  it('returns fallback for out-of-scope questions before LLM generation', async () => {
    const result = await handleParentingQuery({
      question:
        'Tolong hitungkan z-score BB/U anak saya, berat 6.5 kg umur 4 bulan',
    })
    expect(result.status).toBe('fallback')
    expect(result.answer).toContain('di luar cakupan')
  })
})
