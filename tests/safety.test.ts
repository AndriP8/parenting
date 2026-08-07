import { describe, expect, it } from 'vitest'
import { containsRedFlag, EMERGENCY_RESPONSE } from '../app/lib/safety'
import { handleParentingQuery } from '../app/utils/parenting.function'

describe('deterministic red-flag safety gate', () => {
  it.each([
    'Anak sesak napas sejak tadi malam',
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
