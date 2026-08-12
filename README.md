# Parenting QA

AI Q&A web app for Indonesian parents grounded in official pediatric resources (*Buku KIA 2024*, IDAI recommendations, Permenkes guidelines).

## Features

- **Grounded Q&A** — single-turn answers with inline citations to source documents
- **Emergency Gate** — deterministic red-flag symptom detection (*Tanda Bahaya*) that bypasses AI and shows an emergency banner
- **Scope Filtering** — cosine similarity cutoff (≥0.65) to reject out-of-domain queries
- **Ingestion Pipeline** — CLI script to parse official PDFs, chunk, embed, and store in pgvector

## Stack

- **Framework**: TanStack Start (React 19 + Nitro server)
- **Database**: PostgreSQL + pgvector
- **AI**: Gemini (`gemini-embedding-001`) via TanStack AI / Google GenAI SDK
- **Styling**: Tailwind CSS v4
- **ORM**: Drizzle
- **Package manager**: pnpm

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL + pgvector)

### Environment

```bash
cp .env.example .env
```

Fill in:

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `GEMINI_API_KEY` | Google Gemini API key |

### Database

```bash
docker compose up -d        # start postgres + pgvector
pnpm db:migrate             # run migrations
```

### Ingest documents

Place official PDFs in `indonesian_parenting_resources/`, then:

```bash
pnpm ingest
```

### Development

```bash
pnpm dev        # start dev server
```

### Production

```bash
pnpm build
pnpm start
```

Or via Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Commands

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start Nitro server |
| `pnpm test` | Run Vitest tests |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format |
| `pnpm check` | Biome check (lint + format) |
| `pnpm check:fix` | Biome auto-fix |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm ingest` | Run PDF ingestion pipeline |

## Architecture

```
User Query
  → SafeParentingAgent (Tanda Bahaya check)
    → KnowledgeBase (pgvector similarity search, cutoff ≥0.65)
      → ParentingAgent (LLM generation with citations)
        → Response
```

For scope-miss queries (similarity < 0.65) or emergency matches, the LLM is never called.

## Out of Scope (v1)

- Growth calculator (z-score classification)
- Multi-turn conversations
- User accounts / child profiles
- Postpartum mental health
