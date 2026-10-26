// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('TaskBox context menu coverage', () => {
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

  it('closes the current task window directly and does not depend on the close-behavior hook', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()
    const close = vi.fn().mockResolvedValue(undefined)
    const useWindowCloseBehavior = vi.fn(() => ({
      requestUserClose: vi.fn(),
      forceClose: vi.fn(),
    }))

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'minimize' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'minimize' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior,
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
              close,
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const deleteButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('删除'),
    )

    const closeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('关闭'),
    )

    expect(deleteButton).toBeFalsy()
    expect(closeButton).toBeTruthy()

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useWindowCloseBehavior).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledTimes(1)
  }, 20000)

  it('opens the custom menu from the top toolbar instead of falling back to the browser menu', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
            color: '#e94560',
            opacity: 0.95,
            isPinned: true,
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior: () => ({
        requestUserClose: vi.fn(),
        forceClose: vi.fn(),
      }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'task-context-menu' }, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const outerRoot = container.firstElementChild as HTMLElement
    const toolbar = outerRoot.children[1] as HTMLElement
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 24, clientY: 24 })

    await act(async () => {
      toolbar.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(container.textContent).toContain('取消总在最前')
  }, 20000)

  it('renders the pin control as an icon button instead of literal P text', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    expect(pinButton).toBeTruthy()
    expect(pinButton?.textContent?.trim()).not.toBe('P')
    expect(pinButton?.textContent?.trim()).not.toBe('p')
  })

  it('shows an error instead of silently toggling pin when the current window is unavailable', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: typeof pushFeedback }) => unknown) =>
        selector({ pushFeedback }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: false,
            reason: 'requires_desktop_runtime',
            message: 'windows.getCurrentWindow requires the Cutmind desktop window.',
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    await act(async () => {
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(updateTask).not.toHaveBeenCalledWith('task-1', expect.objectContaining({ isPinned: true }))
    expect(pushFeedback).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
    }))
  })

  it('shows an error and preserves the current pin state when always-on-top fails', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: typeof pushFeedback }) => unknown) =>
        selector({ pushFeedback }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockRejectedValue(new Error('native pin failed')),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    await act(async () => {
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(updateTask).not.toHaveBeenCalledWith('task-1', expect.objectContaining({ isPinned: true }))
    expect(pushFeedback).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
    }))
  })

  it('uses a grab cursor on the draggable toolbar area', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const dragHandle = container.querySelector('[data-drag-handle="task-window"]') as HTMLElement | null

    expect(dragHandle).toBeTruthy()
    expect(dragHandle?.style.cursor).toBe('grab')
  })

  it('keeps the top toolbar sticky and renders the formatting tools below the timer section', async () => {
    const updateTask = vi.fn()
    const deleteTask = vi.fn()
    const saveSettings = vi.fn()

    vi.doMock('../../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, unknown>
        updateTask: typeof updateTask
        deleteTask: typeof deleteTask
        loaded: boolean
      }) => unknown) => selector({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: '任务 1',
            body: 'body',
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
            startTime: null,
            endTime: null,
            titleFontSize: 15,
            titleFontFamily: 'default',
            titleFontColor: '#ffffff',
            bodyFontSize: 14,
            bodyFontFamily: 'default',
            bodyFontColor: '#ffffff',
            fontColor: '#ffffff',
            createdAt: '2026-04-14T12:00:00.000Z',
            completedAt: null,
            windowState: null,
          },
        },
        updateTask,
        deleteTask,
        loaded: true,
      }),
    }))

    vi.doMock('../../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN'; windowCloseBehavior: 'close' }
        update: typeof saveSettings
      }) => unknown) => selector({
        settings: { language: 'zh-CN', windowCloseBehavior: 'close' },
        update: saveSettings,
      }),
    }))

    vi.doMock('../../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', { 'data-testid': 'task-timer-section' }, 'timer'),
    }))

    vi.doMock('./TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('../RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'task-floating-menu' }, children),
    }))

    vi.doMock('../TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'task-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { TaskBox } = await import('./TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const toolbar = container.querySelector('[data-testid="task-window-toolbar"]') as HTMLElement | null
    expect(toolbar).toBeTruthy()
    expect(toolbar?.style.position).toBe('sticky')
    expect(toolbar?.style.top).toBe('0px')

    const titleInput = container.querySelector('textarea[placeholder="任务标题..."]') as HTMLTextAreaElement | null
    expect(titleInput).toBeTruthy()

    await act(async () => {
      titleInput?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 80, clientY: 120 }))
    })

    const inlineToolbar = container.querySelector('[data-testid="task-format-toolbar"]') as HTMLElement | null
    const timerSection = container.querySelector('[data-testid="task-timer-section"]') as HTMLElement | null

    expect(inlineToolbar).toBeTruthy()
    expect(timerSection).toBeTruthy()
    expect(
      timerSection && inlineToolbar
        ? Boolean(timerSection.compareDocumentPosition(inlineToolbar) & Node.DOCUMENT_POSITION_FOLLOWING)
        : false,
    ).toBe(true)
    expect(container.querySelector('[data-testid="task-floating-menu"]')).toBeNull()
  })
})
