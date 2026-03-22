import { config } from './config'

export async function runMigrations(): Promise<void> {
  const mod = require('node-pg-migrate')
  const runner = mod.default ?? mod
  await runner({
    databaseUrl: config.DATABASE_URL,
    dir: 'migrations',
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg: string) => console.log('[migrate]', msg),
  })
}
