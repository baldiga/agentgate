import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function keyBuffer(secret: string): Buffer {
  return Buffer.from(secret, 'hex')
}

export function encrypt(text: string, secret: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, keyBuffer(secret), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(payload: string, secret: string): string {
  const parts = payload.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format')
  }
  const [ivHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, keyBuffer(secret), iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
