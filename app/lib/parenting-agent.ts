import type { QueryResponse } from '../utils/parenting'
import type { KnowledgeBase } from './knowledge-base'
import type { LLMClient } from './llm-client'
import { containsRedFlag, EMERGENCY_RESPONSE } from './safety'

export interface Agent {
  handleQuery(question: string): Promise<QueryResponse>
}

export class CoreParentingAgent implements Agent {
  constructor(
    private knowledgeBase: KnowledgeBase,
    private llmClient: LLMClient,
  ) {}

  async handleQuery(question: string): Promise<QueryResponse> {
    const trimmed = question ? question.trim() : ''
    if (!trimmed) {
      return {
        status: 'fallback',
        answer:
          'Please enter a question regarding child health and growth development.',
      }
    }

    const relevantChunks = await this.knowledgeBase.findRelevantChunks(trimmed)

    if (relevantChunks.length === 0) {
      return {
        status: 'fallback',
        answer:
          'Maaf, saya tidak dapat menemukan informasi yang relevan dari buku KIA atau panduan IDAI terkait pertanyaan Anda. Silakan lihat daftar topik yang tersedia di atas, atau konsultasikan langsung dengan tenaga kesehatan.',
      }
    }

    const contextText = relevantChunks
      .map((c, i) => {
        const meta = c.metadata
        return `[Source ${i + 1}]: ${meta?.documentTitle} (Page ${meta?.pageNumber})\n${c.content}`
      })
      .join('\n\n')

    const systemPrompt = `You are a maternal and child health assistant in Indonesia.
HINT: You MUST answer in Indonesian (Bahasa Indonesia).
Use ONLY the provided context from the official MCH Handbook (Buku KIA) and IDAI guidelines to answer the question.
DO NOT provide medical diagnoses, calculate drug dosages, or give definitive nutritional/growth status verdicts.
Always include a citation [Source X] for every claim you make based on the context.
If the context does not contain enough information to answer the question, firmly state that you do not know.

Context:
${contextText}`

    const answer = await this.llmClient.generateResponse(systemPrompt, trimmed)

    const citations = relevantChunks.map((c) => {
      const meta = c.metadata
      return {
        documentTitle: meta?.documentTitle || 'Unknown Source',
        pageNumber: meta?.pageNumber,
        sectionHeading: meta?.sectionHeading,
        snippet: `${c.content.substring(0, 100)}...`,
      }
    })

    return {
      status: 'success',
      answer,
      citations,
    }
  }
}

export class SafeParentingAgent implements Agent {
  constructor(private coreAgent: Agent) {}

  async handleQuery(question: string): Promise<QueryResponse> {
    const trimmed = question ? question.trim() : ''
    if (containsRedFlag(trimmed)) {
      return { status: 'emergency', answer: EMERGENCY_RESPONSE }
    }
    return this.coreAgent.handleQuery(question)
  }
}
