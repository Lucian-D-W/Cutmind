// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Calendar close behavior wiring', () => {
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

  it('does not attach the close-behavior hook when the calendar window should close natively', async () => {
    const useWindowCloseBehavior = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, never>
        createTask: ReturnType<typeof vi.fn>
        updateTask: ReturnType<typeof vi.fn>
      }) => unknown) => selector({
        tasks: {},
        createTask: vi.fn().mockResolvedValue(undefined),
        updateTask: vi.fn(),
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: {
          language: 'zh-CN'
          calendarStartDay: 1
          calendarTheme: 'warm-day'
          dailyJournalFolder: ''
          windowCloseBehavior: 'minimize'
        }
      }) => unknown) => selector({
        settings: {
          language: 'zh-CN',
          calendarStartDay: 1,
          calendarTheme: 'warm-day',
          dailyJournalFolder: '',
          windowCloseBehavior: 'minimize',
        },
      }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ pushFeedback: vi.fn() }),
    }))

    vi.doMock('../../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior,
    }))

    vi.doMock('./MonthView', () => ({
      MonthView: () => React.createElement('div', null, 'month-view'),
    }))

    vi.doMock('./WeekView', () => ({
      WeekView: () => React.createElement('div', null, 'week-view'),
    }))

    vi.doMock('./TaskDetailModal', () => ({
      TaskDetailModal: () => null,
    }))

    vi.doMock('../../monitoring/runtimeMonitor', () => ({
      monitorError: vi.fn(),
      monitorEvent: vi.fn(),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeKind: () => 'tauri',
      getRuntimeBridge: () => ({
        backend: { invoke: vi.fn() },
      }),
    }))

    const { Calendar } = await import('./Calendar')

    await act(async () => {
      root.render(React.createElement(Calendar))
    })

    expect(useWindowCloseBehavior).not.toHaveBeenCalled()
    expect(container.textContent).toContain('month-view')
  }, 15000)
})
