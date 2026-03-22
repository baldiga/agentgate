import { renderHook, act } from '@testing-library/react'
import { useMessages } from '@/hooks/use-messages'

global.fetch = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('useMessages', () => {
  it('starts with empty messages', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] })
    const { result } = renderHook(() => useMessages('support'))
    expect(result.current.messages).toEqual([])
  })

  it('sendMessage sets loading to true then false on response', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ thread_id: 't1', id: 'm1' }) })
      .mockResolvedValue({ ok: true, json: async () => [{ id: 'm1', role: 'user', content: 'hi', created_at: new Date().toISOString(), thread_id: 't1' }, { id: 'm2', role: 'agent', content: 'hello', created_at: new Date().toISOString(), thread_id: 't1' }] })

    const { result } = renderHook(() => useMessages('support'))

    await act(async () => {
      await result.current.sendMessage('hi')
    })

    expect(result.current.loading).toBe(false)
  })
})
