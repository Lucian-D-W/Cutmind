// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type AppSettings, type Task } from '../../types'

const mockSettings: AppSettings = {
  ...DEFAULT_SETTINGS,
}

describe('SettingsPanel runtime boundary', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let update: ReturnType<typeof vi.fn>
  let pushFeedback: ReturnType<typeof vi.fn>
  let openDirectory: ReturnType<typeof vi.fn>
  let useWindowCloseBehavior: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    update = vi.fn().mockResolvedValue(undefined)
    pushFeedback = vi.fn()
    openDirectory = vi.fn()
    useWindowCloseBehavior = vi.fn()
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  async function renderPanel(runtimeKind: 'browser' | 'tauri') {
    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector?: (state: { settings: AppSettings; update: typeof update }) => unknown) => {
        const state = { settings: mockSettings, update }
        return selector ? selector(state) : state
      },
    }))

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: { tasks: Record<string, Task> }) => unknown) =>
        selector({ tasks: {} }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: typeof pushFeedback }) => unknown) =>
        selector({ pushFeedback }),
    }))

    vi.doMock('../../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior,
    }))

    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      clearMonitorEntries: vi.fn(),
      getMonitorEntries: vi.fn(() => []),
      monitorError: vi.fn(),
      monitorEvent: vi.fn(),
      subscribeMonitorEntries: vi.fn(() => () => {}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeKind: vi.fn(() => runtimeKind),
      getRuntimeBridge: vi.fn(() => ({
        dialog: {
          openDirectory,
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
  }

  it('opens on common settings and reveals data controls through the category navigation', async () => {
    await renderPanel('tauri')
    const folderButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('选择文件夹'),
    )!
    expect(folderButton.closest('section')?.hidden).toBe(true)
    const dataPage = Array.from(container.querySelectorAll('nav button')).find(button =>
      button.textContent === '数据与导出',
    )!
    await act(async () => {
      dataPage.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(dataPage.getAttribute('aria-pressed')).toBe('true')
    expect(folderButton.closest('section')?.hidden).toBe(false)
  })

  it('shows a desktop-only warning and avoids opening the native folder dialog in browser mode', async () => {
    await renderPanel('browser')

    expect(container.textContent).toContain('当前是浏览器调试页面')

    const chooseFolderButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('选择文件夹'),
    )
    expect(chooseFolderButton).toBeTruthy()

    await act(async () => {
      chooseFolderButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(openDirectory).not.toHaveBeenCalled()
    expect(container.textContent).toContain('不能打开系统文件夹选择器')
    expect(pushFeedback).toHaveBeenCalled()
  }, 15000)

  it('uses the runtime bridge to choose and persist the journal folder in desktop mode', async () => {
    openDirectory.mockResolvedValue({ ok: true, value: 'C:/Users/6/Desktop' })

    await renderPanel('tauri')

    const chooseFolderButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('选择文件夹'),
    )
    expect(chooseFolderButton).toBeTruthy()

    await act(async () => {
      chooseFolderButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(openDirectory).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({ dailyJournalFolder: 'C:/Users/6/Desktop' })
    expect(container.textContent).toContain('每日日志文件夹已更新到 C:/Users/6/Desktop')
  }, 15000)

  it('shows five calendar theme presets and no longer renders the temporary monitoring section', async () => {
    await renderPanel('tauri')

    const themeSelect = container.querySelector('[data-testid="calendar-theme-select"]') as HTMLSelectElement | null

    expect(themeSelect).not.toBeNull()
    expect(Array.from(themeSelect?.options ?? []).map(option => option.textContent)).toEqual([
      '暖日',
      '暗夜',
      '莫兰迪',
      '敦煌',
      '大地',
    ])
    expect(container.textContent).not.toContain('监控')
  }, 15000)

  it('does not scope the calendar close-behavior setting onto the settings window itself', async () => {
    await renderPanel('tauri')

    expect(useWindowCloseBehavior).not.toHaveBeenCalled()
  }, 15000)
})
