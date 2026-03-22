import { Pool } from 'pg'
import { config } from './config'

export const db = new Pool({ connectionString: config.DATABASE_URL })

export async function checkDb(): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}
