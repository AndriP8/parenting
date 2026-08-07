import { GoogleGenAI } from '@google/genai'

export interface Embedder {
  embedQuery(query: string): Promise<number[]>
  embedDocuments(contents: string[], title: string): Promise<number[][]>
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { status?: number; message?: string }
  return candidate.status === 429 || candidate.message?.includes('429') === true
}

export interface ResilientEmbedderConfig {
  maxBatchSize: number
  minIntervalMs: number
  retryDelaysMs: number[]
}

export const DEFAULT_CONFIG: ResilientEmbedderConfig = {
  maxBatchSize: 50,
  minIntervalMs: 750,
  retryDelaysMs: [30_000, 60_000, 120_000, 240_000, 300_000],
}

export class ResilientEmbedder implements Embedder {
  private lastEmbeddingAt = 0

  constructor(
    private inner: Embedder,
    private config: ResilientEmbedderConfig = DEFAULT_CONFIG,
  ) {}

  async embedQuery(query: string): Promise<number[]> {
    return this.inner.embedQuery(query)
  }

  async embedDocuments(contents: string[], title: string): Promise<number[][]> {
    const allEmbeddings: number[][] = []

    for (let i = 0; i < contents.length; i += this.config.maxBatchSize) {
      const batch = contents.slice(i, i + this.config.maxBatchSize)
      const batchEmbeddings = await this.embedBatchWithRetry(batch, title)
      allEmbeddings.push(...batchEmbeddings)
    }

    return allEmbeddings
  }

  private async embedBatchWithRetry(
    contents: string[],
    title: string,
  ): Promise<number[][]> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const elapsed = Date.now() - this.lastEmbeddingAt
        if (elapsed < this.config.minIntervalMs) {
          await sleep(this.config.minIntervalMs - elapsed)
        }

        const result = await this.inner.embedDocuments(contents, title)
        this.lastEmbeddingAt = Date.now()
        return result
      } catch (error) {
        if (
          !isRateLimitError(error) ||
          attempt >= this.config.retryDelaysMs.length
        ) {
          throw error
        }
        const delay = this.config.retryDelaysMs[attempt]
        console.warn(
          `Embedding quota/rate limit reached for ${title}; retrying in ${delay / 1000}s`,
        )
        await sleep(delay)
      }
    }
  }
}

export class RawGeminiEmbedder implements Embedder {
  private ai: GoogleGenAI
  private readonly MODEL = 'gemini-embedding-001'

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  async embedQuery(query: string): Promise<number[]> {
    const embedRes = await this.ai.models.embedContent({
      model: this.MODEL,
      contents: [query],
      config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
    })

    const queryEmbedding = embedRes.embeddings?.[0]?.values
    if (queryEmbedding?.length !== 768) {
      throw new Error('Failed to generate query embedding or invalid dimension')
    }
    return queryEmbedding
  }

  async embedDocuments(contents: string[], title: string): Promise<number[][]> {
    const response = await this.ai.models.embedContent({
      model: this.MODEL,
      contents,
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        title,
        outputDimensionality: 768,
      },
    })

    if (
      !response.embeddings ||
      response.embeddings.length !== contents.length
    ) {
      throw new Error(`Embedding count mismatch for ${title}`)
    }
    return response.embeddings.map((embedding) => {
      if (embedding.values?.length !== 768) {
        throw new Error(`Invalid embedding dimension for ${title}`)
      }
      return embedding.values
    })
  }
}
