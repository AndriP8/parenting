import { describe, expect, it } from 'vitest'
import type { ChunkResult, KnowledgeBase } from '../app/lib/knowledge-base'
import type { LLMClient } from '../app/lib/llm-client'
import {
  CoreParentingAgent,
  SafeParentingAgent,
} from '../app/lib/parenting-agent'
import { EMERGENCY_RESPONSE } from '../app/lib/safety'

class MockKnowledgeBase implements KnowledgeBase {
  async findRelevantChunks(query: string): Promise<ChunkResult[]> {
    if (query.toLowerCase().includes('mpasi')) {
      return [
        {
          content: 'MPASI diberikan mulai usia 6 bulan.',
          metadata: { documentTitle: 'Buku KIA', pageNumber: 10 },
        },
      ]
    }
    return []
  }
}

class MockLLMClient implements LLMClient {
  async generateResponse(
    _systemPrompt: string,
    _userMessage: string,
  ): Promise<string> {
    return 'Ini adalah jawaban dari agent.'
  }
}

describe('ParentingAgent', () => {
  it('returns fallback if question is empty', async () => {
    const agent = new SafeParentingAgent(
      new CoreParentingAgent(new MockKnowledgeBase(), new MockLLMClient()),
    )
    const res = await agent.handleQuery('   ')
    expect(res.status).toBe('fallback')
  })

  it('returns emergency response for Tanda Bahaya (red flags)', async () => {
    const agent = new SafeParentingAgent(
      new CoreParentingAgent(new MockKnowledgeBase(), new MockLLMClient()),
    )
    // "kejang" is a common red flag, this relies on containsRedFlag checking for it
    const res = await agent.handleQuery('anak saya kejang')
    expect(res.status).toBe('emergency')
    expect(res.answer).toBe(EMERGENCY_RESPONSE)
  })

  it('queries knowledge base and returns fallback if no chunks found', async () => {
    const agent = new SafeParentingAgent(
      new CoreParentingAgent(new MockKnowledgeBase(), new MockLLMClient()),
    )
    const res = await agent.handleQuery('bagaimana cara terbang?')
    expect(res.status).toBe('fallback')
    expect(res.answer).toContain('Maaf, saya tidak dapat menemukan informasi')
  })

  it('returns success and citations if relevant chunks found', async () => {
    const agent = new SafeParentingAgent(
      new CoreParentingAgent(new MockKnowledgeBase(), new MockLLMClient()),
    )
    const res = await agent.handleQuery('kapan mulai mpasi?')
    expect(res.status).toBe('success')
    expect(res.answer).toBe('Ini adalah jawaban dari agent.')
    expect(res.citations).toBeDefined()
    expect(res.citations?.[0].documentTitle).toBe('Buku KIA')
  })
})
