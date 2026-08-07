import pdfParse from 'pdf-parse'
import {
  createSectionChunks,
  type IngestionChunk,
  type PageText,
} from './ingestion'

interface PdfPageData {
  pageIndex: number
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
}

export class DocumentParser {
  async parseDocument(buffer: Buffer): Promise<IngestionChunk[]> {
    const pages: PageText[] = []

    await pdfParse(buffer, {
      pagerender: async (pageData: PdfPageData) => {
        const textContent = await pageData.getTextContent()
        const text = textContent.items.map((item) => item.str ?? '').join(' ')
        pages.push({ pageNumber: pageData.pageIndex + 1, text })
        return text
      },
    })

    const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber)
    return createSectionChunks(sortedPages)
  }
}
