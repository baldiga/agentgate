// apps/api/src/sources/indexing.ts
import { db } from '../db'
import { config } from '../config'

const CHUNK_WORDS = 512
const OVERLAP = 50

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(' '))
    i += CHUNK_WORDS - OVERLAP
  }
  return chunks
}

export async function indexSourceFile(sourceId: string, text: string): Promise<void> {
  if (!config.OPENAI_API_KEY) {
    console.warn('[indexing] No OPENAI_API_KEY — skipping embedding generation')
    return
  }
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  await db.query('DELETE FROM source_chunks WHERE source_id = $1', [sourceId])
  const chunks = chunkText(text)
  for (let i = 0; i < chunks.length; i++) {
    const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks[i] })
    await db.query(
      `INSERT INTO source_chunks (source_id, chunk_text, embedding, chunk_index) VALUES ($1, $2, $3::vector, $4)`,
      [sourceId, chunks[i], JSON.stringify(data[0].embedding), i]
    )
  }
}

export async function searchSourceChunks(agentId: string, query: string, limit = 5): Promise<string[]> {
  if (!config.OPENAI_API_KEY) return []
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query })
  const result = await db.query(
    `SELECT sc.chunk_text FROM source_chunks sc JOIN agent_sources s ON s.id = sc.source_id WHERE s.agent_id = $1 ORDER BY sc.embedding <=> $2::vector LIMIT $3`,
    [agentId, JSON.stringify(data[0].embedding), limit]
  )
  return result.rows.map((r) => r.chunk_text)
}
