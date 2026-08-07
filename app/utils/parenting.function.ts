import { RawGeminiEmbedder, ResilientEmbedder } from '../lib/embedding'
import { PgVectorKnowledgeBase } from '../lib/knowledge-base'
import { GeminiLLMClient } from '../lib/llm-client'
import { CoreParentingAgent, SafeParentingAgent } from '../lib/parenting-agent'
import type { QueryRequest, QueryResponse } from './parenting'

export async function handleParentingQuery(
  req: QueryRequest,
): Promise<QueryResponse> {
  if (!req.question?.trim()) {
    return {
      status: 'fallback',
      answer: 'Please enter a question',
    }
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY environment variable')
      return {
        status: 'fallback',
        answer:
          'Sistem tidak dapat memproses pertanyaan Anda saat ini (Konfigurasi server belum lengkap).',
      }
    }

    const llmClient = new GeminiLLMClient(apiKey)
    const rawEmbedder = new RawGeminiEmbedder(apiKey)
    const embedder = new ResilientEmbedder(rawEmbedder)
    const knowledgeBase = new PgVectorKnowledgeBase(embedder)
    const coreAgent = new CoreParentingAgent(knowledgeBase, llmClient)
    const agent = new SafeParentingAgent(coreAgent)

    return await agent.handleQuery(req.question || '')
  } catch (error) {
    console.error('Error in handleParentingQuery:', error)
    return {
      status: 'fallback',
      answer:
        'Maaf, terjadi kesalahan sistem saat memproses pertanyaan Anda. Silakan coba lagi beberapa saat kemudian.',
    }
  }
}
