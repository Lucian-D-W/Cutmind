import { beforeEach, describe, expect, it } from 'vitest'
import { clearLocalStoreWriteEchoState, markLocalStoreWrite, shouldIgnoreStoreEcho } from './storeUpdateEcho'

describe('storeUpdateEcho', () => {
  beforeEach(() => {
    clearLocalStoreWriteEchoState()
  })

  it('ignores the next local echo for the same store file', () => {
    markLocalStoreWrite('ideas.json', 1000)

    expect(shouldIgnoreStoreEcho('ideas.json', 1100)).toBe(true)
    expect(shouldIgnoreStoreEcho('ideas.json', 1100)).toBe(false)
  })

  it('tracks multiple pending local writes separately', () => {
    markLocalStoreWrite('tasks.json', 1000)
    markLocalStoreWrite('tasks.json', 1001)

    expect(shouldIgnoreStoreEcho('tasks.json', 1100)).toBe(true)
    expect(shouldIgnoreStoreEcho('tasks.json', 1101)).toBe(true)
    expect(shouldIgnoreStoreEcho('tasks.json', 1102)).toBe(false)
  })

  it('does not ignore stale echoes after the ttl expires', () => {
    markLocalStoreWrite('settings.json', 1000)

    expect(shouldIgnoreStoreEcho('settings.json', 4000)).toBe(false)
  })
})
