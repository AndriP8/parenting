import 'dotenv/config'
import { createHash } from 'node:crypto'
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import { GoogleGenAI } from '@google/genai'
import { and, eq, inArray } from 'drizzle-orm'
import pdfParse from 'pdf-parse'
import { db } from '../app/db/client'
import { documentChunks, documents } from '../app/db/schema'
import { createSectionChunks, type PageText } from '../app/lib/ingestion'

const requiredEnvironment = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'GEMINI_API_KEY',
] as const

for (const name of requiredEnvironment) {
  if (!process.env[name])
    throw new Error(`Missing required environment variable: ${name}`)
}

const accountId = process.env.R2_ACCOUNT_ID as string
const bucketName = process.env.R2_BUCKET_NAME as string
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string })
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_BATCH_SIZE = 50
const EMBEDDING_MIN_INTERVAL_MS = 750
let lastEmbeddingAt = 0

export const APPROVED_KEYS = [
  'kemenkes_national_standards/Buku_KIA_2024.pdf',
  'kemenkes_national_standards/Juknis_Pemantauan_MPASI_2024.pdf',
  'kemenkes_national_standards/Jadwal_Imunisasi_IDAI_2024.pdf',
  'idai_clinical_recommendations/Jadwal_Imunisasi_IDAI_2024.pdf',
  'idai_clinical_recommendations/Pedoman_Praktik_Pemberian_Makan_IDAI.pdf',
] as const

interface PdfPageData {
  pageIndex: number
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
}

function streamToBuffer(
  stream: AsyncIterable<Uint8Array | string>,
): Promise<Buffer> {
  return (async () => {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  })()
}

async function parsePages(buffer: Buffer): Promise<PageText[]> {
  const pages: PageText[] = []
  await pdfParse(buffer, {
    pagerender: async (pageData: PdfPageData) => {
      const textContent = await pageData.getTextContent()
      const text = textContent.items.map((item) => item.str ?? '').join(' ')
      pages.push({ pageNumber: pageData.pageIndex + 1, text })
      return text
    },
  })
  return pages.sort((a, b) => a.pageNumber - b.pageNumber)
}

function documentTitle(key: string): string {
  const fileName = key.split('/').pop() ?? key
  return fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ')
}

function documentVersion(key: string): string | undefined {
  return key.match(/20\d{2}/)?.[0]
}

function documentCategory(key: string): string {
  return key.split('/')[0] ?? 'official'
}

function chunkHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { status?: number; message?: string }
  return candidate.status === 429 || candidate.message?.includes('429') === true
}

async function embedBatch(
  contents: string[],
  title: string,
): Promise<number[][]> {
  const elapsed = Date.now() - lastEmbeddingAt
  if (elapsed < EMBEDDING_MIN_INTERVAL_MS) {
    await sleep(EMBEDDING_MIN_INTERVAL_MS - elapsed)
  }

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents,
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      title,
      outputDimensionality: 768,
    },
  })
  lastEmbeddingAt = Date.now()

  if (!response.embeddings || response.embeddings.length !== contents.length) {
    throw new Error(`Embedding count mismatch for ${title}`)
  }
  return response.embeddings.map((embedding) => {
    if (embedding.values?.length !== 768) {
      throw new Error(`Invalid embedding dimension for ${title}`)
    }
    return embedding.values
  })
}

async function embedBatchWithRetry(
  contents: string[],
  title: string,
): Promise<number[][]> {
  const delays = [30_000, 60_000, 120_000, 240_000, 300_000]
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await embedBatch(contents, title)
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= delays.length) throw error
      console.warn(
        `Embedding quota/rate limit reached for ${title}; retrying in ${delays[attempt] / 1000}s`,
      )
      await sleep(delays[attempt])
    }
  }
}

async function prepareDocument(
  key: string,
  title: string,
  contentHash: string,
): Promise<{ id: number; skipped: boolean }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: documents.id,
        contentHash: documents.contentHash,
        ingestionStatus: documents.ingestionStatus,
        embeddingModel: documents.embeddingModel,
      })
      .from(documents)
      .where(eq(documents.sourcePath, key))

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
        category: documentCategory(key),
        sourceVersion: documentVersion(key),
        contentHash,
        ingestionStatus: 'processing',
        chunkCount: 0,
        embeddingModel: EMBEDDING_MODEL,
      })
      .returning({ id: documents.id })
    return { id: document.id, skipped: false }
  })
}

async function ingestKey(key: string): Promise<void> {
  console.log(`Downloading ${key}...`)
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
  )
  if (!response.Body) throw new Error(`R2 returned no body for ${key}`)
  const buffer = await streamToBuffer(
    response.Body as AsyncIterable<Uint8Array | string>,
  )
  const contentHash = createHash('sha256').update(buffer).digest('hex')
  const title = documentTitle(key)
  const chunks = createSectionChunks(await parsePages(buffer))
  if (chunks.length === 0) throw new Error(`No text extracted from ${key}`)

  const document = await prepareDocument(key, title, contentHash)
  if (document.skipped) {
    console.log(`Unchanged, skipping ${key}`)
    return
  }

  try {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE)
      const hashes = batch.map((chunk) => chunkHash(chunk.content))
      const indices = batch.map((_, index) => start + index)
      const existingChunks = await db
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
          : [{ chunk, chunkIndex: start + index, contentHash: hashes[index] }],
      )

      if (missing.length === 0) {
        console.log(
          `Skipping completed batch ${start} / ${chunks.length} for ${key}`,
        )
        continue
      }

      const embeddings = await embedBatchWithRetry(
        missing.map(({ chunk }) => chunk.content),
        title,
      )
      await db.transaction(async (tx) => {
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
              sourceVersion: documentVersion(key),
              pageNumber: chunk.pageNumber,
              sectionHeading: chunk.sectionHeading,
            },
            embedding: embeddings[index],
          })),
        )
      })
      console.log(`Stored batch ${start} / ${chunks.length} for ${key}`)
    }

    await db
      .update(documents)
      .set({ ingestionStatus: 'ready', chunkCount: chunks.length })
      .where(eq(documents.id, document.id))
    console.log(`Ingested ${key}: ${chunks.length} chunks`)
  } catch (error) {
    await db
      .update(documents)
      .set({ ingestionStatus: 'failed' })
      .where(eq(documents.id, document.id))
    throw error
  }
}

async function listApprovedKeys(): Promise<string[]> {
  const requested = process.argv.slice(2)
  if (requested.length > 0) {
    const invalid = requested.filter(
      (key) => !APPROVED_KEYS.includes(key as (typeof APPROVED_KEYS)[number]),
    )
    if (invalid.length > 0) {
      throw new Error(`Unsupported ingestion key: ${invalid.join(', ')}`)
    }
    return requested
  }

  const listed = await s3Client.send(
    new ListObjectsV2Command({ Bucket: bucketName }),
  )
  const available = new Set((listed.Contents ?? []).map((object) => object.Key))
  return APPROVED_KEYS.filter((key) => available.has(key))
}

async function main(): Promise<void> {
  const keys = await listApprovedKeys()
  if (keys.length === 0) {
    throw new Error('None of the approved PDFs were found in R2')
  }
  let failed = false
  for (const key of keys) {
    try {
      await ingestKey(key)
    } catch (error) {
      failed = true
      console.error(`Failed to ingest ${key}:`, error)
    }
  }
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error('Ingestion failed:', error)
  process.exitCode = 1
})
