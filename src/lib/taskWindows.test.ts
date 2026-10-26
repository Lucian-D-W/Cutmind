import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Monitor } from '@tauri-apps/api/window'
import { clampTaskWindowToMonitor } from './taskWindows'

function createMonitor(overrides: Record<string, unknown> = {}): Monitor {
  return {
    name: 'Test monitor',
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1920, height: 1040 },
    },
    scaleFactor: 1,
    ...overrides,
  } as unknown as Monitor
}

describe('taskWindows', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('keeps a carried-over position inside the same monitor work area', () => {
    const monitor = createMonitor()

    expect(clampTaskWindowToMonitor({ x: 1800, y: 900 }, monitor)).toEqual({
      x: 1476,
      y: 496,
      scaleFactor: 1,
    })
  })

  it('handles negative coordinates on a secondary monitor', () => {
    const monitor = createMonitor({
      position: { x: -1600, y: 0 },
      size: { width: 1600, height: 900 },
      workArea: {
        position: { x: -1600, y: 0 },
        size: { width: 1600, height: 860 },
      },
      scaleFactor: 1.25,
    })

    expect(clampTaskWindowToMonitor({ x: -20, y: 820 }, monitor)).toEqual({
      x: -555,
      y: 180,
      scaleFactor: 1.25,
    })
  })

  it('opens task windows without the experimental decorum flag', async () => {
    const getWindowByLabel = vi.fn().mockResolvedValue({ ok: true, value: null })
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'task-task-1' } })
    const getCurrentMonitor = vi.fn().mockResolvedValue({
      ok: true,
      value: createMonitor(),
    })
    const getPrimaryMonitor = vi.fn().mockResolvedValue({ ok: true, value: null })

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getWindowByLabel,
          createWindow,
          getCurrentMonitor,
          getPrimaryMonitor,
          getMonitorFromPoint: vi.fn(),
        },
      }),
    }))

    vi.doMock('../stores/taskStore', () => ({
      useTaskStore: {
        getState: () => ({
          tasks: {
            'task-1': {
              id: 'task-1',
              isPinned: false,
            },
          },
        }),
      },
    }))

    vi.doMock('./windowReady', () => ({
      awaitWindowReady: vi.fn(async window => window),
    }))

    const { openTaskWindow } = await import('./taskWindows')

    await openTaskWindow('task-1')

    expect(createWindow).toHaveBeenCalledWith('task-task-1', expect.objectContaining({
      decorations: false,
      transparent: true,
      alwaysOnTop: false,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
    }))
  })

  it('reapplies the persisted pin state when reusing an existing task window', async () => {
    const show = vi.fn().mockResolvedValue(undefined)
    const unminimize = vi.fn().mockResolvedValue(undefined)
    const setAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
    const setFocus = vi.fn().mockResolvedValue(undefined)
    const getWindowByLabel = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        show,
        unminimize,
        setAlwaysOnTop,
        setFocus,
      },
    })

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getWindowByLabel,
        },
      }),
    }))

    vi.doMock('../stores/taskStore', () => ({
      useTaskStore: {
        getState: () => ({
          tasks: {
            'task-1': {
              id: 'task-1',
              isPinned: false,
            },
          },
        }),
      },
    }))

    const { openTaskWindow } = await import('./taskWindows')

    await openTaskWindow('task-1')

    expect(show).toHaveBeenCalledTimes(1)
    expect(unminimize).toHaveBeenCalledTimes(1)
    expect(setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(setFocus).toHaveBeenCalledTimes(1)
  })
})
