import { describe, expect, it } from 'vitest'
import { LIVE_TOPICS, SCOPE_TOPICS } from '../app/lib/scope'

describe('SCOPE_TOPICS', () => {
  it('all topics have unique ids', () => {
    const ids = SCOPE_TOPICS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all topics have non-empty labels', () => {
    for (const topic of SCOPE_TOPICS) {
      expect(topic.label).toBeTruthy()
    }
  })

  it('all live topics have non-empty exampleQuestion', () => {
    for (const topic of LIVE_TOPICS) {
      expect(
        topic.exampleQuestion,
        `"${topic.label}" is live but has no exampleQuestion`,
      ).toBeTruthy()
    }
  })
})
