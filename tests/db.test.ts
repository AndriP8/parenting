import { sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db, migrate, pool } from '../app/db/client'
import { documentChunks, documents } from '../app/db/schema'

describe('Database & pgvector Migration', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('runs migrations and verifies vector extension and tables exist', async () => {
    await migrate()

    // Query pg_extension to check vector is installed
    const extResult = await db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector';`,
    )
    const extRows = extResult.rows as Array<{ extname: string }>
    expect(extRows.length).toBeGreaterThan(0)
    expect(extRows[0].extname).toBe('vector')

    // Query information_schema.tables to verify documents and document_chunks exist
    const tablesResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('documents', 'document_chunks');`,
    )
    const tableNames = (tablesResult.rows as Array<{ table_name: string }>).map(
      (t) => t.table_name,
    )
    expect(tableNames).toContain('documents')
    expect(tableNames).toContain('document_chunks')
  })

  it('can perform CRUD operations using Drizzle schema', async () => {
    const [insertedDoc] = await db
      .insert(documents)
      .values({
        title: 'Test Document',
        sourcePath: `test/path/doc_${Date.now()}.pdf`,
        category: 'MPASI',
      })
      .returning()

    expect(insertedDoc.id).toBeDefined()
    expect(insertedDoc.title).toBe('Test Document')

    const [insertedChunk] = await db
      .insert(documentChunks)
      .values({
        documentId: insertedDoc.id,
        chunkIndex: 0,
        content: 'Test content for MPASI chunk',
      })
      .returning()

    expect(insertedChunk.id).toBeDefined()
    expect(insertedChunk.documentId).toBe(insertedDoc.id)
  })
})
