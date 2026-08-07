import { desc, gt, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db, pool } from '../app/db/client'
import { documentChunks, documents } from '../app/db/schema'

describe('Vector Retrieval Threshold', () => {
  let docId: number

  beforeAll(async () => {
    // Insert a dummy document
    const [insertedDoc] = await db
      .insert(documents)
      .values({
        title: 'Retrieval Test Doc',
        sourcePath: `test/retrieval_${Date.now()}.pdf`,
        category: 'Test',
      })
      .returning()
    docId = insertedDoc.id

    // Create a normalized vector (magnitude = 1) for match
    // 768 dimensions, value = 1/sqrt(768) approx 0.036084
    const val = 1 / Math.sqrt(768)
    const embeddingMatch = new Array(768).fill(val)
    const embeddingMiss = new Array(768).fill(-val) // Opposite direction

    await db.insert(documentChunks).values([
      {
        documentId: docId,
        chunkIndex: 0,
        content: 'This chunk should match',
        embedding: embeddingMatch,
      },
      {
        documentId: docId,
        chunkIndex: 1,
        content: 'This chunk should not match',
        embedding: embeddingMiss,
      },
    ])
  })

  afterAll(async () => {
    await db.delete(documents).where(sql`id = ${docId}`)
    // We don't end pool here if other tests might run in parallel using it,
    // but db.test.ts does. We'll leave it out or run it. Let's just not close it
    // since vitest might share the process. Actually, vitest runs each file in isolation
    // by default so it's fine to close it.
    await pool.end()
  })

  it('retrieves chunks with similarity >= 0.65', async () => {
    const val = 1 / Math.sqrt(768)
    const queryEmbedding = new Array(768).fill(val)

    const similarity = sql<number>`1 - (${documentChunks.embedding} <=> ${JSON.stringify(queryEmbedding)})`

    const relevantChunks = await db
      .select({
        content: documentChunks.content,
        similarity,
      })
      .from(documentChunks)
      .where(gt(similarity, 0.65))
      .orderBy(desc(similarity))
      .limit(5)

    expect(relevantChunks.length).toBe(1)
    expect(relevantChunks[0].content).toBe('This chunk should match')
    expect(relevantChunks[0].similarity).toBeGreaterThan(0.99)
  })
})
