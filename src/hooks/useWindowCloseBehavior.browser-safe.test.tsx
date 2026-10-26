// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useWindowCloseBehavior browser safety', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('does not crash when the current desktop window is unavailable', async () => {
    const monitorEvent = vi.fn()

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: false,
            reason: 'requires_desktop_runtime',
            message: 'desktop runtime unavailable',
          }),
        },
      }),
    }))

    vi.doMock('../monitoring/runtimeMonitor', () => ({
      monitorError: vi.fn(),
      monitorEvent,
    }))

    const { useWindowCloseBehavior } = await import('./useWindowCloseBehavior')

    function Harness() {
      useWindowCloseBehavior('close')
      return React.createElement('div', null, 'ok')
    }

    await act(async () => {
      root.render(React.createElement(Harness))
    })

    expect(container.textContent).toContain('ok')
    expect(monitorEvent).toHaveBeenCalledWith(
      'window-close',
      'window-unavailable',
      expect.objectContaining({
        reason: 'requires_desktop_runtime',
      }),
      'warn',
    )
  })
})
