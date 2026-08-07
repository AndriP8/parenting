import { createServerFn } from '@tanstack/react-start'
import { handleParentingQuery } from './parenting.function'

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

export interface ChunkMetadata {
  documentTitle?: string
  pageNumber?: number
  sectionHeading?: string
}

export const submitParentingQuery = createServerFn({ method: 'POST' })
  .validator((data: QueryRequest) => data)
  .handler(async ({ data: req }): Promise<QueryResponse> => {
    return handleParentingQuery(req)
  })
