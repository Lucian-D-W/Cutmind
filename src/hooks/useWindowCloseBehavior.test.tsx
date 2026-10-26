// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useWindowCloseBehavior', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let onCloseRequested: ReturnType<typeof vi.fn>
  let minimize: ReturnType<typeof vi.fn>
  let close: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    onCloseRequested = vi.fn().mockResolvedValue(vi.fn())
    minimize = vi.fn().mockResolvedValue(undefined)
    close = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('registers the native close listener only once even if beforeClose changes', async () => {
    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'settings',
              onCloseRequested,
              minimize,
              close,
            },
          }),
        },
      }),
    }))

    vi.doMock('../monitoring/runtimeMonitor', () => ({
      monitorError: vi.fn(),
      monitorEvent: vi.fn(),
    }))

    const { useWindowCloseBehavior } = await import('./useWindowCloseBehavior')

    function Harness({ beforeClose }: { beforeClose?: () => void }) {
      useWindowCloseBehavior('close', beforeClose)
      return React.createElement('div')
    }

    await act(async () => {
      root.render(React.createElement(Harness, { beforeClose: () => {} }))
    })

    await act(async () => {
      root.render(React.createElement(Harness, { beforeClose: () => {} }))
    })

    expect(onCloseRequested).toHaveBeenCalledTimes(1)
  })
})
