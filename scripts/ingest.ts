import 'dotenv/config'
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import { db } from '../app/db/client'
import { DocumentIngester } from '../app/lib/document-ingester'
import { DocumentParser } from '../app/lib/document-parser'
import { RawGeminiEmbedder, ResilientEmbedder } from '../app/lib/embedding'

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

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

export const APPROVED_KEYS = [
  'kemenkes_national_standards/Buku_KIA_2024.pdf',
  'kemenkes_national_standards/Juknis_Pemantauan_MPASI_2024.pdf',
  'kemenkes_national_standards/Jadwal_Imunisasi_IDAI_2024.pdf',
  'idai_clinical_recommendations/Jadwal_Imunisasi_IDAI_2024.pdf',
  'idai_clinical_recommendations/Pedoman_Praktik_Pemberian_Makan_IDAI.pdf',
] as const

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

async function ingestKey(key: string): Promise<void> {
  console.log(`Downloading ${key}...`)
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
  )
  if (!response.Body) throw new Error(`R2 returned no body for ${key}`)
  const buffer = await streamToBuffer(
    response.Body as AsyncIterable<Uint8Array | string>,
  )

  const title = documentTitle(key)
  const category = documentCategory(key)
  const sourceVersion = documentVersion(key)

  const parser = new DocumentParser()
  const rawEmbedder = new RawGeminiEmbedder(
    process.env.GEMINI_API_KEY as string,
  )
  const embedder = new ResilientEmbedder(rawEmbedder)
  const ingester = new DocumentIngester(parser, embedder, db)

  await ingester.processDocument({
    buffer,
    key,
    title,
    category,
    sourceVersion,
  })
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
