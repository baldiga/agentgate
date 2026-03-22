import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AGENTGATE_SECRET: z.string().length(64, 'Must be 32-byte hex (64 chars). Run: openssl rand -hex 32'),
  JWT_SECRET: z.string().length(64, 'Must be 32-byte hex (64 chars). Run: openssl rand -hex 32'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
