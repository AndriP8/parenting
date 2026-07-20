export interface Citation {
  documentTitle: string
  pageNumber?: number
  sectionHeading?: string
  snippet: string
}

export interface QueryRequest {
  question: string
}

export interface QueryResponse {
  status: 'emergency' | 'fallback' | 'success'
  answer: string
  citations?: Citation[]
}

export async function submitParentingQuery(
  req: QueryRequest,
): Promise<QueryResponse> {
  const trimmed = req.question ? req.question.trim() : ''
  if (!trimmed) {
    return {
      status: 'fallback',
      answer:
        'Please enter a question regarding child health and growth development.',
    }
  }

  return {
    status: 'success',
    answer:
      'Your question has been received by the child growth and development information system.',
    citations: [],
  }
}
