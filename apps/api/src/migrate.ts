import { config } from './config'

export async function runMigrations(): Promise<void> {
  const runner = require('node-pg-migrate').default
  await runner({
    databaseUrl: config.DATABASE_URL,
    dir: 'migrations',
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg: string) => console.log('[migrate]', msg),
  })
}
