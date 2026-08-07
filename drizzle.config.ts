import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  dialect: 'postgresql',
  schema: './app/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is required
    url: process.env.DATABASE_URL!,
  },
})
