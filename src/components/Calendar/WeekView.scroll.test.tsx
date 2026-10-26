// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Task } from '../../types'

describe('WeekView scroll area', () => {
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

  it('exposes a dedicated vertical scroll viewport for the wheel-driven day schedule', async () => {
    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        updateTask: ReturnType<typeof vi.fn>
        deleteTask: ReturnType<typeof vi.fn>
        save: ReturnType<typeof vi.fn>
      }) => unknown) => selector({
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
      }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ pushFeedback: vi.fn() }),
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../../lib/taskWindows', () => ({
      openTaskWindow: vi.fn().mockResolvedValue(undefined),
    }))

    const { WeekView } = await import('./WeekView')

    await act(async () => {
      root.render(React.createElement(WeekView, {
        date: new Date('2026-04-15T09:00:00.000Z'),
        tasks: [] as Task[],
        language: DEFAULT_SETTINGS.language,
        weekStartsOn: DEFAULT_SETTINGS.calendarStartDay,
        onSelectTask: vi.fn(),
        onCreateTask: vi.fn(),
      }))
    })

    const scrollArea = container.querySelector('[data-testid="week-scroll-area"]') as HTMLDivElement | null

    expect(scrollArea).not.toBeNull()
    expect(scrollArea?.style.overflowY).toBe('auto')
    expect(scrollArea?.style.scrollbarGutter).toBe('stable')
    expect(scrollArea?.style.overscrollBehavior).toBe('contain')
  }, 15000)
})
