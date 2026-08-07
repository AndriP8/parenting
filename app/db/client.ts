import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate as drizzleMigrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

export const pool = new pg.Pool({
  connectionString,
})

export const db = drizzle(pool, { schema })

export async function migrate() {
  await drizzleMigrate(db, { migrationsFolder: './drizzle' })
}
