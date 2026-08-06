import { describe, expect, it } from 'vitest'
import { submitParentingQuery } from '../app/api/query'

describe('submitParentingQuery server function contract', () => {
  it('handles empty query gracefully with fallback status', async () => {
    const res = await submitParentingQuery({ question: '' })
    expect(res.status).toBe('fallback')
    expect(res.answer).toContain('Please enter a question')
  })

  it('returns valid QueryResponse shape for valid input', async () => {
    const res = await submitParentingQuery({
      question: 'When does a baby start complementary feeding?',
    })
    expect(['emergency', 'fallback', 'success']).toContain(res.status)
    expect(typeof res.answer).toBe('string')
    expect(res.answer.length).toBeGreaterThan(0)
  })
})
