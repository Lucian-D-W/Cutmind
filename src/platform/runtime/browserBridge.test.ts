// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('browserBridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns a desktop-runtime failure when the native runtime is unavailable', async () => {
    vi.doMock('./detectRuntime', () => ({
      waitForTauriRuntime: vi.fn().mockResolvedValue(false),
    }))

    const { createBrowserBridge } = await import('./browserBridge')
    const bridge = createBrowserBridge()

    const result = await bridge.dialog.openDirectory()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('requires_desktop_runtime')
    }
  })

  it('delegates to the tauri bridge if the runtime becomes available late', async () => {
    vi.doMock('./detectRuntime', () => ({
      waitForTauriRuntime: vi.fn().mockResolvedValue(true),
    }))
    vi.doMock('./tauriBridge', () => ({
      createTauriBridge: () => ({
        dialog: {
          openDirectory: vi.fn().mockResolvedValue({ ok: true, value: 'C:/Desktop' }),
        },
        files: {
          writeTextFile: vi.fn(),
        },
        backend: {
          invoke: vi.fn(),
        },
        events: {
          listen: vi.fn(),
        },
        windows: {
          getCurrentWindow: vi.fn(),
          getWindowByLabel: vi.fn(),
          createWindow: vi.fn(),
          getCurrentMonitor: vi.fn(),
          getPrimaryMonitor: vi.fn(),
          getMonitorFromPoint: vi.fn(),
        },
      }),
    }))

    const { createBrowserBridge } = await import('./browserBridge')
    const bridge = createBrowserBridge()

    const result = await bridge.dialog.openDirectory()

    expect(result).toEqual({ ok: true, value: 'C:/Desktop' })
  })
})
