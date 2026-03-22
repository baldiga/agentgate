import { encrypt, decrypt } from '../src/crypto'

const secret = 'a'.repeat(64)

describe('crypto', () => {
  it('encrypts and decrypts a string', () => {
    const original = 'sensitive-api-key-12345'
    const encrypted = encrypt(original, secret)
    expect(encrypted).not.toBe(original)
    expect(encrypted).toContain(':')
    expect(decrypt(encrypted, secret)).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', () => {
    expect(encrypt('same', secret)).not.toBe(encrypt('same', secret))
  })
})
