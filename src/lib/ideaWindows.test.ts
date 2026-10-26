import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ideaWindows', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('opens idea windows without the experimental decorum flag', async () => {
    const getWindowByLabel = vi.fn().mockResolvedValue({ ok: true, value: null })
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'idea-idea-1' } })
    const getCurrentMonitor = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        name: 'Test monitor',
        position: { x: 0, y: 0 },
        size: { width: 1920, height: 1080 },
        workArea: {
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1040 },
        },
        scaleFactor: 1,
      },
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

    vi.doMock('./windowReady', () => ({
      awaitWindowReady: vi.fn(async window => window),
    }))

    const { openIdeaWindow } = await import('./ideaWindows')

    await openIdeaWindow({
      id: 'idea-1',
      title: 'Idea',
      body: '<p>body</p>',
      color: '#ffd93d',
      opacity: 0.95,
      isPinned: true,
      isVisible: true,
      fontSize: 14,
      fontFamily: 'default',
      fontColor: '#1a1a2e',
      createdAt: '2026-04-14T12:00:00.000Z',
    } as never)

    expect(createWindow).toHaveBeenCalledWith('idea-idea-1', expect.objectContaining({
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
    }))
  })

  it('restores the persisted idea window bounds when reopening a hidden note', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const getWindowByLabel = vi.fn().mockResolvedValue({ ok: true, value: null })
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'idea-idea-1' } })
    const getCurrentMonitor = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        name: 'Test monitor',
        position: { x: 0, y: 0 },
        size: { width: 1920, height: 1080 },
        workArea: {
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1040 },
        },
        scaleFactor: 1,
      },
    })
    const getPrimaryMonitor = vi.fn().mockResolvedValue({ ok: true, value: null })
    const getMonitorFromPoint = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        name: 'Test monitor',
        position: { x: 0, y: 0 },
        size: { width: 1920, height: 1080 },
        workArea: {
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1040 },
        },
        scaleFactor: 1,
      },
    })

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getWindowByLabel,
          createWindow,
          getCurrentMonitor,
          getPrimaryMonitor,
          getMonitorFromPoint,
        },
      }),
    }))

    vi.doMock('./windowReady', () => ({
      awaitWindowReady: vi.fn(async window => window),
    }))

    const { openIdeaWindow } = await import('./ideaWindows')

    await openIdeaWindow({
      id: 'idea-1',
      title: 'Idea',
      body: '<p>body</p>',
      color: '#ffd93d',
      opacity: 0.95,
      isPinned: false,
      isVisible: false,
      fontSize: 14,
      fontFamily: 'default',
      fontColor: '#1a1a2e',
      createdAt: '2026-04-14T12:00:00.000Z',
      windowState: {
        x: 440,
        y: 320,
        width: 480,
        height: 300,
      },
    } as never)

    expect(createWindow).toHaveBeenCalledWith('idea-idea-1', expect.objectContaining({
      x: 440,
      y: 320,
      width: 480,
      height: 300,
    }))

    randomSpy.mockRestore()
  })
})
