// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function baseTask() {
  return {
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
    createdAt: '2026-04-15T00:00:00.000Z',
    completedAt: null,
    windowState: null,
  }
}

function baseIdea() {
  return {
    id: 'idea-1',
    title: '新便签 1',
    body: 'body',
    color: '#ffd93d',
    opacity: 0.95,
    fontSize: 14,
    fontFamily: 'default',
    fontColor: '#1a1a2e',
    isVisible: true,
    isPinned: true,
    createdAt: '2026-04-15T00:00:00.000Z',
    windowState: null,
  }
}

describe('window controls interaction layout', () => {
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

  it('renders TaskBox controls outside the drag handle region', async () => {
    vi.doMock('../stores/taskStore', () => ({
      useTaskStore: (selector: (state: {
        tasks: Record<string, ReturnType<typeof baseTask>>
        updateTask: () => void
        deleteTask: () => void
        loaded: boolean
      }) => unknown) => selector({
        tasks: { 'task-1': baseTask() },
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        loaded: true,
      }),
    }))

    vi.doMock('../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN' }
        update: () => Promise<void>
      }) => unknown) => selector({
        settings: { language: 'zh-CN' },
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }))

    vi.doMock('../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior: () => ({
        requestUserClose: vi.fn(),
        forceClose: vi.fn(),
      }),
    }))

    vi.doMock('../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./TaskBox/TimerDisplay', () => ({
      TimerDisplay: () => React.createElement('div', null, 'timer'),
    }))

    vi.doMock('./TaskBox/TimeSelector', () => ({
      TimeSelector: () => React.createElement('div', null, 'time-selector'),
    }))

    vi.doMock('./TaskBox/RestModal', () => ({
      RestModal: () => null,
    }))

    vi.doMock('./RichText/markdown', () => ({
      renderMarkdownHtml: () => '<p>body</p>',
    }))

    vi.doMock('./ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    }))

    vi.doMock('./TaskTagEditor', () => ({
      TaskTagEditor: () => React.createElement('div', null, 'tag-editor'),
    }))

    vi.doMock('../lib/taskMeta', () => ({
      buildTimerPatch: () => ({}),
    }))

    vi.doMock('../platform/runtime', () => ({
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

    const { TaskBox } = await import('./TaskBox/TaskBox')

    await act(async () => {
      root.render(React.createElement(TaskBox, { id: 'task-1' }))
    })

    const dragHandle = container.querySelector('[data-drag-handle="task-window"]')
    const closeButton = container.querySelector('button[title="关闭"]')

    expect(dragHandle).not.toBeNull()
    expect(closeButton).not.toBeNull()
    expect(dragHandle?.contains(closeButton as Node)).toBe(false)
  }, 15000)

  it('renders IdeaBox controls outside the drag handle region', async () => {
    vi.doMock('../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, ReturnType<typeof baseIdea>>
        updateIdea: () => void
        hideIdea: () => void
        showIdea: () => void
        hideAllIdeas: () => void
        showAllIdeas: () => void
        renameIdea: () => void
        deleteIdea: () => void
        loaded: boolean
      }) => unknown) => selector({
        ideas: { 'idea-1': baseIdea() },
        updateIdea: vi.fn(),
        hideIdea: vi.fn(),
        showIdea: vi.fn(),
        hideAllIdeas: vi.fn(),
        showAllIdeas: vi.fn(),
        renameIdea: vi.fn(),
        deleteIdea: vi.fn(),
        loaded: true,
      }),
    }))

    vi.doMock('../stores/settingsStore', () => ({
      useSettingsStore: (selector: (state: {
        settings: { language: 'zh-CN' }
        update: () => Promise<void>
      }) => unknown) => selector({
        settings: { language: 'zh-CN' },
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }))

    vi.doMock('../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: () => void }) => unknown) =>
        selector({ pushFeedback: vi.fn() }),
    }))

    vi.doMock('../hooks/useDrag', () => ({
      useDrag: () => ({ onMouseDown: vi.fn() }),
    }))

    vi.doMock('../hooks/useWindowCloseBehavior', () => ({
      useWindowCloseBehavior: () => ({
        requestUserClose: vi.fn(),
        forceClose: vi.fn(),
      }),
    }))

    vi.doMock('../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('./RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(() => React.createElement('div', null, 'editor')),
      richTextToPlainText: () => 'body',
    }))

    vi.doMock('./ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    }))

    vi.doMock('./contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'idea-1',
              applyGlassSurface: vi.fn().mockResolvedValue(undefined),
              setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
              setTitle: vi.fn().mockResolvedValue(undefined),
              minimize: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox/IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const dragHandle = container.querySelector('[data-drag-handle="idea-window"]')
    const closeButton = container.querySelector('button[title="关闭"]')

    expect(dragHandle).not.toBeNull()
    expect(closeButton).not.toBeNull()
    expect(dragHandle?.contains(closeButton as Node)).toBe(false)
  }, 15000)
})
