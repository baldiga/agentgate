// apps/api/src/sources/router.ts
import { Router } from 'express'
import { requireSuperadmin } from '../auth/middleware'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { addSource, listSources, deleteSource } from './service'
import { indexSourceFile } from './indexing'

const SUPPORTED_TEXT_TYPES = ['.txt', '.md', '.csv']
const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } })

export const sourcesRouter = Router()

sourcesRouter.get('/:agentId', requireSuperadmin, async (req, res) => {
  try {
    res.json({ sources: await listSources(req.params.agentId) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sources' })
  }
})

sourcesRouter.post('/:agentId', requireSuperadmin, async (req, res) => {
  try {
    res.status(201).json({ source: await addSource(req.params.agentId, req.body) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add source' })
  }
})

sourcesRouter.post('/:agentId/upload', requireSuperadmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const ext = path.extname(req.file.originalname).toLowerCase()
    const source = await addSource(req.params.agentId, {
      type: 'file',
      name: req.file.originalname,
      config: { filePath: req.file.path, mimetype: req.file.mimetype, size: String(req.file.size) },
    })

    if (SUPPORTED_TEXT_TYPES.includes(ext)) {
      const text = fs.readFileSync(req.file.path, 'utf8')
      indexSourceFile(source.id, text).catch(console.error)
      return res.status(201).json({ source, status: 'indexing' })
    }

    res.status(201).json({ source, status: 'stored', note: 'Binary file stored. Text extraction not supported in v1 — use plain text, markdown, or CSV for indexing.' })
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' })
  }
})

sourcesRouter.delete('/:agentId/:sourceId', requireSuperadmin, async (req, res) => {
  try {
    await deleteSource(req.params.sourceId)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete source' })
  }
})
