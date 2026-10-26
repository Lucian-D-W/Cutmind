import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('openSettingsWindow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('reuses the same in-flight open request so concurrent calls create only one settings window', async () => {
    const getWindowByLabel = vi.fn().mockResolvedValue({ ok: true, value: null })
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'settings' } })

    let resolveReady!: (value: { label: string }) => void
    const awaitWindowReady = vi.fn(() => new Promise<{ label: string }>(resolve => {
      resolveReady = resolve
    }))

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getWindowByLabel,
          createWindow,
        },
      }),
    }))

    vi.doMock('./windowReady', () => ({
      awaitWindowReady,
    }))

    const { openSettingsWindow } = await import('./settingsWindow')

    const first = openSettingsWindow('Cutmind - 设置')
    const second = openSettingsWindow('Cutmind - 设置')

    await vi.waitFor(() => {
      expect(createWindow).toHaveBeenCalledTimes(1)
      expect(awaitWindowReady).toHaveBeenCalledTimes(1)
    })

    resolveReady({ label: 'settings' })

    await expect(first).resolves.toEqual({ label: 'settings' })
    await expect(second).resolves.toEqual({ label: 'settings' })
  })

  it('opens a larger centered settings window when one does not already exist', async () => {
    const getWindowByLabel = vi.fn().mockResolvedValue({ ok: true, value: null })
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'settings' } })
    const getCurrentMonitor = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        workArea: {
          position: { x: 100, y: 40 },
          size: { width: 1600, height: 960 },
        },
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
        },
      }),
    }))

    vi.doMock('./windowReady', () => ({
      awaitWindowReady: vi.fn(async window => window),
    }))

    const { openSettingsWindow } = await import('./settingsWindow')

    await openSettingsWindow('Cutmind - 设置')

    expect(createWindow).toHaveBeenCalledWith('settings', expect.objectContaining({
      url: '/?view=settings',
      width: 960,
      height: 820,
      x: 412,
      y: 90,
      decorations: true,
      transparent: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
    }))
  })

  it('centers the complete native frame on a Windows monitor at 200% scaling', async () => {
    const createWindow = vi.fn().mockResolvedValue({ ok: true, value: { label: 'settings' } })
    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({ windows: {
        getWindowByLabel: vi.fn().mockResolvedValue({ ok: true, value: null }),
        createWindow,
        getCurrentMonitor: vi.fn().mockResolvedValue({ ok: true, value: {
          scaleFactor: 2,
          workArea: { position: { x: 0, y: 0 }, size: { width: 3072, height: 1824 } },
        } }),
        getPrimaryMonitor: vi.fn().mockResolvedValue({ ok: true, value: null }),
      } }),
    }))
    vi.doMock('./windowReady', () => ({ awaitWindowReady: vi.fn(async window => window) }))
    const { openSettingsWindow } = await import('./settingsWindow')
    await openSettingsWindow('Cutmind - 设置')
    expect(createWindow).toHaveBeenCalledWith('settings', expect.objectContaining({
      width: 960, height: 820, x: 280, y: 26,
    }))
  })
})
