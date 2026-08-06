import { describe, expect, it } from 'vitest'
import { createSectionChunks } from '../app/lib/ingestion'

describe('section-aware document chunking', () => {
  it('preserves page numbers and detected headings', () => {
    const chunks = createSectionChunks([
      {
        pageNumber: 1,
        text: 'PANDUAN MPASI\nMulai pada usia enam bulan.\nBerikan makanan bertahap.',
      },
      {
        pageNumber: 2,
        text: 'KEAMANAN MAKANAN\nAwasi anak saat makan.',
      },
    ])

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toMatchObject({
      pageNumber: 1,
      sectionHeading: 'PANDUAN MPASI',
    })
    expect(chunks[1]).toMatchObject({
      pageNumber: 2,
      sectionHeading: 'KEAMANAN MAKANAN',
    })
  })

  it('splits long section text into bounded chunks', () => {
    const chunks = createSectionChunks(
      [{ pageNumber: 4, text: `NUTRISI\n${'kata '.repeat(1000)}` }],
      120,
    )
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.content.length <= 120)).toBe(true)
    expect(chunks.every((chunk) => chunk.pageNumber === 4)).toBe(true)
  })
})
