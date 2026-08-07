import { desc, gt, sql } from 'drizzle-orm'
import type { ChunkMetadata } from '../utils/parenting'
import { db } from '../db/client'
import { documentChunks } from '../db/schema'
import type { Embedder } from './embedding'

export interface ChunkResult {
  content: string
  metadata: ChunkMetadata
}

export interface KnowledgeBase {
  findRelevantChunks(query: string): Promise<ChunkResult[]>
}

export class PgVectorKnowledgeBase implements KnowledgeBase {
  constructor(private embedder: Embedder) {}

  async findRelevantChunks(query: string): Promise<ChunkResult[]> {
    const queryEmbedding = await this.embedder.embedQuery(query)

    const similarity = sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)})`

    const relevantChunks = await db
      .select({
        content: documentChunks.content,
        metadata: documentChunks.metadata,
      })
      .from(documentChunks)
      .where(gt(similarity, 0.65))
      .orderBy(desc(similarity))
      .limit(5)

    return relevantChunks as ChunkResult[]
  }
}
