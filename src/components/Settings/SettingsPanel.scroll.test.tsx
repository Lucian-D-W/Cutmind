// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type AppSettings, type Task } from '../../types'

describe('SettingsPanel scroll container', () => {
  let container: HTMLDivElement
  let root: Root

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

  it('uses a fixed-height scroll viewport so the mouse wheel can scroll the settings page', async () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
    }

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector?: (state: { settings: AppSettings; update: ReturnType<typeof vi.fn> }) => unknown) => {
        const state = { settings, update: vi.fn().mockResolvedValue(undefined) }
        return selector ? selector(state) : state
      },
    }))

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: { tasks: Record<string, Task> }) => unknown) =>
        selector({ tasks: {} }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ pushFeedback: vi.fn() }),
    }))

    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      clearMonitorEntries: vi.fn(),
      getMonitorEntries: vi.fn(() => []),
      monitorError: vi.fn(),
      monitorEvent: vi.fn(),
      subscribeMonitorEntries: vi.fn(() => () => {}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeKind: vi.fn(() => 'tauri'),
      getRuntimeBridge: vi.fn(() => ({
        dialog: {
          openDirectory: vi.fn(),
          saveFile: vi.fn(),
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
      })),
    }))

    const { SettingsPanel } = await import('./SettingsPanel')

    await act(async () => {
      root.render(React.createElement(SettingsPanel))
    })

    const scrollArea = container.querySelector('[data-testid="settings-scroll-area"]') as HTMLDivElement | null

    expect(scrollArea).not.toBeNull()
    expect(scrollArea?.style.height).toBe('100vh')
    expect(scrollArea?.style.overflowY).toBe('auto')
    expect(scrollArea?.style.scrollbarGutter).toBe('stable')
  }, 15000)
})
