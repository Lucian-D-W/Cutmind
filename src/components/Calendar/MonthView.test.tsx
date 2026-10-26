// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('MonthView', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

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

  it('renders all tasks in a month cell without collapsing them behind a +more indicator', async () => {
    const { MonthView } = await import('./MonthView')
    const day = '2026-04-14'
    const tasks = ['任务 A', '任务 B', '任务 C', '任务 D'].map((title, index) => ({
      id: `task-${index}`,
      title,
      body: '',
      color: '#e94560',
      opacity: 0.95,
      isPinned: false,
      showResetButton: false,
      tags: [],
      timerMinutes: 25,
      elapsedSeconds: 0,
      isRunning: false,
      isCompleted: false,
      isPlanningNextTask: false,
      isResting: false,
      restSeconds: 300,
      nextTaskDraft: null,
      nextStepMode: null,
      focusRecords: [],
      startTime: `${day}T0${index}:00:00.000Z`,
      endTime: `${day}T0${index}:25:00.000Z`,
      titleFontSize: 15,
      titleFontFamily: 'default',
      titleFontColor: '#ffffff',
      bodyFontSize: 14,
      bodyFontFamily: 'default',
      bodyFontColor: '#ffffff',
      fontColor: '#ffffff',
      createdAt: `${day}T0${index}:00:00.000Z`,
      completedAt: null,
      windowState: null,
    }))

    await act(async () => {
      root.render(
        React.createElement(MonthView, {
          date: new Date(`${day}T12:00:00.000Z`),
          tasks,
          language: 'zh-CN',
          weekStartsOn: 1,
          onSelectTask: vi.fn(),
          onCreateTask: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('任务 A')
    expect(container.textContent).toContain('任务 B')
    expect(container.textContent).toContain('任务 C')
    expect(container.textContent).toContain('任务 D')
    expect(container.textContent).not.toContain('+1 更多')
    expect(container.querySelectorAll('[data-week-row]').length).toBeGreaterThan(0)
  }, 20000)
})
