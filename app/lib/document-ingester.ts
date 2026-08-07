import { createHash } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { documentChunks, documents } from '../db/schema'
import type { DocumentParser } from './document-parser'
import type { Embedder } from './embedding'

function chunkHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export class DocumentIngester {
  constructor(
    private parser: DocumentParser,
    private embedder: Embedder,
    private db: NodePgDatabase<Record<string, unknown>>,
  ) {}

  async processDocument({
    buffer,
    key,
    title,
    category,
    sourceVersion,
  }: {
    buffer: Buffer
    key: string
    title: string
    category: string
    sourceVersion?: string
  }): Promise<void> {
    const contentHash = createHash('sha256').update(buffer).digest('hex')
    const chunks = await this.parser.parseDocument(buffer)
    if (chunks.length === 0) throw new Error(`No text extracted from ${key}`)

    const document = await this.prepareDocument({
      key,
      title,
      category,
      contentHash,
      sourceVersion,
    })
    if (document.skipped) {
      console.log(`Unchanged, skipping ${key}`)
      return
    }

    try {
      const EMBEDDING_BATCH_SIZE = 50
      for (
        let start = 0;
        start < chunks.length;
        start += EMBEDDING_BATCH_SIZE
      ) {
        const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE)
        const hashes = batch.map((chunk) => chunkHash(chunk.content))
        const indices = batch.map((_, index) => start + index)

        const existingChunks = await this.db
          .select({
            chunkIndex: documentChunks.chunkIndex,
            contentHash: documentChunks.contentHash,
          })
          .from(documentChunks)
          .where(
            and(
              eq(documentChunks.documentId, document.id),
              inArray(documentChunks.chunkIndex, indices),
            ),
          )

        const existingByIndex = new Map(
          existingChunks.map((chunk) => [chunk.chunkIndex, chunk.contentHash]),
        )
        const missing = batch.flatMap((chunk, index) =>
          existingByIndex.get(start + index) === hashes[index]
            ? []
            : [
                {
                  chunk,
                  chunkIndex: start + index,
                  contentHash: hashes[index],
                },
              ],
        )

        if (missing.length === 0) {
          console.log(
            `Skipping completed batch ${start} / ${chunks.length} for ${key}`,
          )
          continue
        }

        const missingContents = missing.map(({ chunk }) => chunk.content)
        // GeminiEmbedder handles the batch retries internally
        const embeddings = await this.embedder.embedDocuments(
          missingContents,
          title,
        )

        await this.db.transaction(async (tx) => {
          await tx.delete(documentChunks).where(
            and(
              eq(documentChunks.documentId, document.id),
              inArray(
                documentChunks.chunkIndex,
                missing.map(({ chunkIndex }) => chunkIndex),
              ),
            ),
          )
          await tx.insert(documentChunks).values(
            missing.map(({ chunk, chunkIndex, contentHash }, index) => ({
              documentId: document.id,
              chunkIndex,
              content: chunk.content,
              contentHash,
              metadata: {
                documentTitle: title,
                sourcePath: key,
                sourceVersion,
                pageNumber: chunk.pageNumber,
                sectionHeading: chunk.sectionHeading,
              },
              embedding: embeddings[index],
            })),
          )
        })
        console.log(`Stored batch ${start} / ${chunks.length} for ${key}`)
      }

      await this.db
        .update(documents)
        .set({ ingestionStatus: 'ready', chunkCount: chunks.length })
        .where(eq(documents.id, document.id))
      console.log(`Ingested ${key}: ${chunks.length} chunks`)
    } catch (error) {
      await this.db
        .update(documents)
        .set({ ingestionStatus: 'failed' })
        .where(eq(documents.id, document.id))
      throw error
    }
  }

  private async prepareDocument({
    key,
    title,
    category,
    contentHash,
    sourceVersion,
  }: {
    key: string
    title: string
    category: string
    contentHash: string
    sourceVersion?: string
  }): Promise<{ id: number; skipped: boolean }> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: documents.id,
          contentHash: documents.contentHash,
          ingestionStatus: documents.ingestionStatus,
          embeddingModel: documents.embeddingModel,
        })
        .from(documents)
        .where(eq(documents.sourcePath, key))

      const EMBEDDING_MODEL = 'gemini-embedding-001'

      if (
        existing[0]?.contentHash === contentHash &&
        existing[0].embeddingModel === EMBEDDING_MODEL &&
        existing[0].ingestionStatus === 'ready'
      ) {
        return { id: existing[0].id, skipped: true }
      }

      if (
        existing[0] &&
        (existing[0].contentHash !== contentHash ||
          existing[0].embeddingModel !== EMBEDDING_MODEL)
      ) {
        await tx.delete(documents).where(eq(documents.id, existing[0].id))
      } else if (existing[0]) {
        return { id: existing[0].id, skipped: false }
      }

      const [document] = await tx
        .insert(documents)
        .values({
          title,
          sourcePath: key,
          category,
          sourceVersion,
          contentHash,
          embeddingModel: EMBEDDING_MODEL,
          ingestionStatus: 'pending',
          chunkCount: 0,
        })
        .returning({ id: documents.id })

      return { id: document.id, skipped: false }
    })
  }
}
