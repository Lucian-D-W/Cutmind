import { describe, expect, it, vi } from 'vitest'
import {
  applyWindowCloseBehavior,
  forceCloseWindow,
  handleWindowCloseRequested,
  normalizeWindowCloseBehavior,
} from './windowCloseBehavior'

describe('windowCloseBehavior', () => {
  it('defaults to close when the persisted value is missing or invalid', () => {
    expect(normalizeWindowCloseBehavior(undefined)).toBe('close')
    expect(normalizeWindowCloseBehavior('something-else')).toBe('close')
    expect(normalizeWindowCloseBehavior('minimize')).toBe('minimize')
  })

  it('minimizes instead of closing when the behavior is minimize', async () => {
    const minimize = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)

    await applyWindowCloseBehavior('minimize', { minimize, close })

    expect(minimize).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  })

  it('closes directly when the behavior is close', async () => {
    const minimize = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)

    await applyWindowCloseBehavior('close', { minimize, close })

    expect(close).toHaveBeenCalledTimes(1)
    expect(minimize).not.toHaveBeenCalled()
  })

  it('prevents a native close request and minimizes the window when configured', async () => {
    const preventDefault = vi.fn()
    const minimize = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)

    await handleWindowCloseRequested(
      { preventDefault },
      {
        behavior: 'minimize',
        allowClose: false,
        minimize,
        destroy,
      },
    )

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(minimize).toHaveBeenCalledTimes(1)
    expect(destroy).not.toHaveBeenCalled()
  })

  it('lets a forced close request pass through without minimizing', async () => {
    const preventDefault = vi.fn()
    const minimize = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)

    await handleWindowCloseRequested(
      { preventDefault },
      {
        behavior: 'minimize',
        allowClose: true,
        minimize,
        destroy,
      },
    )

    expect(preventDefault).not.toHaveBeenCalled()
    expect(minimize).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
  })

  it('prevents a native close request and destroys the window when behavior is close', async () => {
    const preventDefault = vi.fn()
    const minimize = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)

    await handleWindowCloseRequested(
      { preventDefault },
      {
        behavior: 'close',
        allowClose: false,
        minimize,
        destroy,
      },
    )

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(minimize).not.toHaveBeenCalled()
  })

  it('uses destroy for a forced close so it does not re-enter close-request handlers', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined)

    await forceCloseWindow({
      label: 'task-1',
      destroy,
    })

    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
