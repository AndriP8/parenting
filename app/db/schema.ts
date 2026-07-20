import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  sourcePath: text('source_path').notNull().unique(),
  category: text('category'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: serial('id').primaryKey(),
    documentId: integer('document_id').references(() => documents.id, {
      onDelete: 'cascade',
    }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').default({}),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_document_chunks_embedding').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
)
