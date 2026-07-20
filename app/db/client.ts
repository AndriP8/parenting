import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate as drizzleMigrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5432/parenting_db'

export const pool = new pg.Pool({
  connectionString,
})

export const db = drizzle(pool, { schema })

export async function migrate() {
  await drizzleMigrate(db, { migrationsFolder: './drizzle' })
}
