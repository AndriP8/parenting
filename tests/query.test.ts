import { describe, expect, it, vi } from 'vitest'
import { handleParentingQuery } from '../app/utils/parenting.function'

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          embedContent: vi.fn().mockResolvedValue({
            embeddings: [{ values: new Array(768).fill(0.1) }],
          }),
          generateContent: vi.fn().mockResolvedValue({
            text: 'Ini adalah jawaban yang di-mock berdasarkan konteks.',
          }),
        },
      }
    }),
  }
})

describe('handleParentingQuery server function contract', () => {
  it('handles empty query gracefully with fallback status', async () => {
    const res = await handleParentingQuery({ question: '' })
    expect(res.status).toBe('fallback')
    expect(res.answer).toContain('Please enter a question')
  })

  it('returns valid QueryResponse shape for valid input', async () => {
    const res = await handleParentingQuery({
      question: 'When does a baby start complementary feeding?',
    })
    expect(['emergency', 'fallback', 'success']).toContain(res.status)
    expect(typeof res.answer).toBe('string')
    expect(res.answer.length).toBeGreaterThan(0)
  })

  it('bypasses AI generation on emergency query', async () => {
    const res = await handleParentingQuery({
      question: 'Bayi kejang-kejang',
    })
    expect(res.status).toBe('emergency')
  })
})
