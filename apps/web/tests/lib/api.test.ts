import { apiFetch } from '@/lib/api'

global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'ok' }),
  })
})

describe('apiFetch', () => {
  it('calls the correct URL with base prepended', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'
    await apiFetch('/agents')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/agents',
      expect.any(Object)
    )
  })

  it('sets Content-Type to application/json by default', async () => {
    await apiFetch('/agents')
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('throws ApiError when response is not ok', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    })
    await expect(apiFetch('/agents')).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })
})
