// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../types'

describe('Calendar themes', () => {
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

  it('applies the selected theme id and theme variables to the calendar root', async () => {
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
      useSettingsStore: (selector: (state: { settings: typeof DEFAULT_SETTINGS }) => unknown) => selector({
        settings: {
          ...DEFAULT_SETTINGS,
          calendarTheme: 'night',
        },
      }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ pushFeedback: vi.fn() }),
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

    vi.doMock('./MonthView', () => ({
      MonthView: () => React.createElement('div', null, 'month-view'),
    }))

    vi.doMock('./WeekView', () => ({
      WeekView: () => React.createElement('div', null, 'week-view'),
    }))

    vi.doMock('./TaskDetailModal', () => ({
      TaskDetailModal: () => null,
    }))

    const { Calendar } = await import('./Calendar')

    await act(async () => {
      root.render(React.createElement(Calendar))
    })

    const calendarRoot = container.querySelector('[data-testid="calendar-root"]') as HTMLDivElement | null

    expect(calendarRoot).not.toBeNull()
    expect(calendarRoot?.dataset.calendarTheme).toBe('night')
    expect(calendarRoot?.style.getPropertyValue('--calendar-bg')).toBe('#161b24')
    expect(calendarRoot?.textContent).toContain('month-view')
  }, 15000)
})
