// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('tauriBridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('opens a directory through the dialog plugin', async () => {
    const open = vi.fn().mockResolvedValue('C:/Users/6/Desktop')

    vi.doMock('./detectRuntime', () => ({
      waitForTauriRuntime: vi.fn().mockResolvedValue(true),
    }))
    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      monitorEvent: vi.fn(),
      monitorError: vi.fn(),
    }))
    vi.doMock('@tauri-apps/plugin-dialog', () => ({
      open,
    }))

    const { createTauriBridge } = await import('./tauriBridge')
    const bridge = createTauriBridge()
    const result = await bridge.dialog.openDirectory()

    expect(open).toHaveBeenCalled()
    expect(result).toEqual({ ok: true, value: 'C:/Users/6/Desktop' })
  })

  it('normalizes current window access into a safe handle', async () => {
    const onCloseRequested = vi.fn().mockResolvedValue(() => {})
    const minimize = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)
    const setAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
    const setTitle = vi.fn().mockResolvedValue(undefined)
    const startDragging = vi.fn().mockResolvedValue(undefined)
    const outerPosition = vi.fn().mockResolvedValue({ x: 12, y: 34 })
    const outerSize = vi.fn().mockResolvedValue({ width: 420, height: 260 })
    const innerSize = vi.fn().mockResolvedValue({ width: 400, height: 240 })
    const scaleFactor = vi.fn().mockResolvedValue(2)
    const setEffects = vi.fn().mockResolvedValue(undefined)
    const clearEffects = vi.fn().mockResolvedValue(undefined)
    const setShadow = vi.fn().mockResolvedValue(undefined)
    const setBackgroundColor = vi.fn().mockResolvedValue(undefined)

    vi.doMock('./detectRuntime', () => ({
      waitForTauriRuntime: vi.fn().mockResolvedValue(true),
    }))
    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      monitorEvent: vi.fn(),
      monitorError: vi.fn(),
    }))
    vi.doMock('@tauri-apps/api/window', () => ({
      getCurrentWindow: () => ({
        label: 'settings',
        onCloseRequested,
        minimize,
        close,
        setAlwaysOnTop,
        setTitle,
        startDragging,
        outerPosition,
        outerSize,
        innerSize,
        scaleFactor,
        setEffects,
        clearEffects,
        setShadow,
      }),
    }))
    vi.doMock('@tauri-apps/api/webview', () => ({
      getCurrentWebview: () => ({
        setBackgroundColor,
      }),
    }))

    const { createTauriBridge } = await import('./tauriBridge')
    const bridge = createTauriBridge()
    const result = await bridge.windows.getCurrentWindow()

    expect(result.ok).toBe(true)
    if (!result.ok) return

    await result.value.startDragging()
    await result.value.setAlwaysOnTop(true)
    await result.value.setTitle('Preferences')
    await result.value.applyGlassSurface(0)
    const position = await result.value.outerPosition()
    expect(result.value.outerSize).toBeTypeOf('function')
    const size = await result.value.outerSize?.()

    expect(position).toEqual({ x: 12, y: 34 })
    expect(size).toEqual({ width: 420, height: 260 })
    expect(await result.value.innerSize?.()).toEqual({ width: 400, height: 240 })
    expect(await result.value.scaleFactor?.()).toBe(2)
    expect(startDragging).toHaveBeenCalled()
    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(setTitle).toHaveBeenCalledWith('Preferences')
    expect(setBackgroundColor).toHaveBeenCalled()
    expect(onCloseRequested).not.toHaveBeenCalled()
  })

  it('creates windows directly through the WebviewWindow constructor', async () => {
    const show = vi.fn().mockResolvedValue(undefined)
    const unminimize = vi.fn().mockResolvedValue(undefined)
    const setFocus = vi.fn().mockResolvedValue(undefined)
    const setAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)
    const once = vi.fn()
    const WebviewWindow = vi.fn(function MockWebviewWindow(label: string) {
      return {
        label,
        show,
        unminimize,
        setFocus,
        setAlwaysOnTop,
        close,
        destroy,
        once,
      }
    })

    vi.doMock('./detectRuntime', () => ({
      waitForTauriRuntime: vi.fn().mockResolvedValue(true),
    }))
    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      monitorEvent: vi.fn(),
      monitorError: vi.fn(),
    }))
    vi.doMock('@tauri-apps/api/webviewWindow', () => ({
      WebviewWindow,
    }))

    const { createTauriBridge } = await import('./tauriBridge')
    const bridge = createTauriBridge()
    const result = await bridge.windows.createWindow('task-1', {
      url: '/?view=task&id=1',
      title: 'Task',
      width: 320,
      height: 420,
      x: 40,
      y: 80,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
    })

    expect(WebviewWindow).toHaveBeenCalledWith('task-1', expect.objectContaining({
      title: 'Task',
      url: '/?view=task&id=1',
      width: 320,
      height: 420,
      x: 40,
      y: 80,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
    }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.label).toBe('task-1')
  })
})
