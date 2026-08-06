export interface PageText {
  pageNumber: number
  text: string
}

export interface IngestionChunk {
  content: string
  pageNumber: number
  sectionHeading?: string
}

const headingPattern = /^(?:BAB\s+\w+|[A-Z][A-Z0-9À-ÿ ,/&()'’:-]{5,})$/

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function detectHeading(line: string): string | undefined {
  const cleaned = cleanLine(line)
  if (!cleaned || cleaned.length > 140 || /^\d+[.)]\s/.test(cleaned)) {
    return undefined
  }
  return headingPattern.test(cleaned) ? cleaned : undefined
}

function splitByLength(text: string, maxLength: number): string[] {
  const words = text.split(' ')
  const parts: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && candidate.length > maxLength) {
      parts.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) parts.push(current)
  return parts
}

export function createSectionChunks(
  pages: PageText[],
  maxLength = 1200,
): IngestionChunk[] {
  const chunks: IngestionChunk[] = []
  let activeHeading: string | undefined

  for (const page of pages) {
    const lines = page.text.split(/\r?\n/)
    let sectionText = ''
    let sectionPage = page.pageNumber

    const flush = () => {
      const cleaned = sectionText.replace(/\s+/g, ' ').trim()
      for (const content of splitByLength(cleaned, maxLength)) {
        if (content)
          chunks.push({
            content,
            pageNumber: sectionPage,
            sectionHeading: activeHeading,
          })
      }
      sectionText = ''
    }

    for (const line of lines) {
      const heading = detectHeading(line)
      if (heading) {
        flush()
        activeHeading = heading
        sectionPage = page.pageNumber
      } else if (cleanLine(line)) {
        sectionText += `${cleanLine(line)} `
      }
    }
    flush()
  }
  return chunks
}
