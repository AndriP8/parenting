# AI Agent Guidelines & Project Context

## Project Overview
`parenting-qa` is an Indonesian Early Childhood Parenting Q&A System designed to provide evidence-based, medically safe, and culturally relevant educational advice for parents in Indonesia.

## Package Manager & Tooling
> [!IMPORTANT]
> **Use `pnpm` exclusively for this project.** Do NOT use `npm` or `yarn`.

### Common Commands
- **Install dependencies**: `pnpm install`
- **Add package**: `pnpm add <package>` (or `pnpm add -D <package>`)
- **Dev Server**: `pnpm dev`
- **Production Build**: `pnpm build`
- **Preview Build**: `pnpm start`
- **Run Tests**: `pnpm test`
- **Watch Tests**: `pnpm test:watch`
- **Type Check**: `pnpm typecheck`

## Tech Stack
- **Framework**: TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`) with Vite & Vinxi
- **UI & Logic**: React 19, TypeScript
- **Database**: PostgreSQL (`postgres` driver)
- **Testing**: Vitest (`vitest`)
- **AI Integration**: Google Gen AI SDK (`@google/genai`), PDF parsing (`pdf-parse`)

## Domain & Safety Rules

### Domain Terms
- **MPASI** (*Makanan Pendamping Air Susu Ibu*): Complementary feeding introduced at 6 months alongside breastfeeding.
- **Buku KIA** (*Buku Kesehatan Ibu dan Anak*): Indonesian MoH (Kemenkes RI) official maternal & child health guidebook.
- **Tumbuh Kembang**: *Pertumbuhan* (quantitative growth: weight, height, head circumference) vs *Perkembangan* (qualitative milestones: motor, speech, social).
- **Tanda Bahaya** (*Red Flags*): Emergency symptoms requiring immediate clinical triage (Puskesmas/Hospital).

### Scope Boundaries
- **In-Scope**: Educational Q&A grounded in verified official Kemenkes RI and IDAI publications.
- **Out-of-Scope**: Medical diagnostic verdicts, drug dosage calculation, personalized z-score math, commercial/paid frameworks, parental mental health treatment.

## Code Conventions
- Keep type safety strict (`pnpm typecheck` must pass clean).
- Ensure unit test suite passes (`pnpm test`).
- Maintain existing codebase comments and domain boundaries.
