// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('IdeaBox close behavior scope', () => {
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

  it('destroys the current idea window directly and does not depend on the close-behavior hook', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()
    const close = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)
    const useWindowCloseBehavior = vi.fn(() => ({
      requestUserClose: vi.fn(),
      forceClose: vi.fn(),
    }))

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../../stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: typeof pushFeedback }) => unknown) =>
        selector({ pushFeedback }),
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onChange: (html: string) => void
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close,
              destroy,
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const closeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('关闭'),
    )

    expect(closeButton).toBeTruthy()

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useWindowCloseBehavior).not.toHaveBeenCalled()
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  }, 20000)

  it('renders the pin control as an icon button instead of literal P text', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    expect(pinButton).toBeTruthy()
    expect(pinButton?.textContent?.trim()).not.toBe('P')
    expect(pinButton?.textContent?.trim()).not.toBe('p')
  })

  it('shows an error instead of silently toggling pin when the current window is unavailable', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
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

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    await act(async () => {
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(updateIdea).not.toHaveBeenCalledWith('idea-1', expect.objectContaining({ isPinned: true }))
    expect(pushFeedback).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
    }))
  })

  it('shows an error and preserves the current pin state when always-on-top fails', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
      getRuntimeBridge: () => ({
        windows: {
          getCurrentWindow: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              label: 'idea-1',
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

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const pinButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('总在最前'),
    )

    await act(async () => {
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(updateIdea).not.toHaveBeenCalledWith('idea-1', expect.objectContaining({ isPinned: true }))
    expect(pushFeedback).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
    }))
  })

  it('starts dragging from the dedicated toolbar handle', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()
    const startDragging = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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
      useDrag: () => ({
        onMouseDown: () => {
          void startDragging()
        },
      }),
    }))

    vi.doMock('../../hooks/useSystemFonts', () => ({
      useSystemFonts: () => [],
    }))

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const dragHandle = container.querySelector('[data-drag-handle="idea-window"]') as HTMLElement | null

    expect(dragHandle).toBeTruthy()

    await act(async () => {
      dragHandle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    })

    expect(startDragging).toHaveBeenCalledTimes(1)
    expect(dragHandle?.style.cursor).toBe('grab')
  })

  it('limits the editable title field width to 75 percent of the title area', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const titleDisplay = container.querySelector('[title="新便签 1"]') as HTMLElement | null

    expect(titleDisplay).toBeTruthy()

    await act(async () => {
      titleDisplay?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    const titleShell = container.querySelector('[data-testid="idea-title-shell"]') as HTMLElement | null
    const titleInput = container.querySelector('input') as HTMLInputElement | null

    expect(titleShell).toBeTruthy()
    expect(titleShell?.style.width).toBe('75%')
    expect(titleInput).toBeTruthy()
  })

  it('keeps the window toolbar sticky and shows the selection tools below it instead of as a floating menu', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => {
      return {
        RichTextEditor: React.forwardRef(function MockRichTextEditor(
          props: {
            value: string
            onContextMenu?: (event: React.MouseEvent) => void
            placeholder?: string
            style?: React.CSSProperties
          },
          ref,
        ) {
          React.useImperativeHandle(ref, () => ({
            focus: vi.fn(),
            getSelectedText: () => '选中文字',
            applyFontFamily: vi.fn(),
            applyFontSize: vi.fn(),
            applyTextColor: vi.fn(),
            toggleStyle: vi.fn(),
          }))

          return React.createElement('div', {
            'data-testid': 'idea-rich-text-editor',
            onContextMenu: props.onContextMenu,
            style: props.style,
          }, props.value || props.placeholder)
        }),
        richTextToPlainText: () => 'hello',
      }
    })

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'idea-floating-menu' }, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => new DOMRect(12, 12, 80, 20),
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const surface = container.firstElementChild as HTMLElement | null
    expect(surface).toBeTruthy()
    expect(surface?.style.overflowY).toBe('auto')

    const toolbar = container.querySelector('[data-testid="idea-window-toolbar"]') as HTMLElement | null
    expect(toolbar).toBeTruthy()
    expect(toolbar?.style.position).toBe('sticky')
    expect(toolbar?.style.top).toBe('0px')

    const editor = container.querySelector('[data-testid="idea-rich-text-editor"]') as HTMLElement | null
    expect(editor).toBeTruthy()

    await act(async () => {
      editor?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 60, clientY: 70 }))
    })

    const inlineToolbar = container.querySelector('[data-testid="idea-selection-toolbar"]') as HTMLElement | null
    expect(inlineToolbar).toBeTruthy()
    expect(inlineToolbar?.style.position).not.toBe('sticky')
    expect(container.querySelector('[data-testid="idea-floating-menu"]')).toBeNull()
  })

  it('creates a task from selected text without copying the whole idea body into task notes', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()
    const createTask = vi.fn().mockResolvedValue(undefined)
    const updateTask = vi.fn()
    const saveTaskStore = vi.fn().mockResolvedValue(undefined)
    const openTaskWindow = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>整段原始内容</p><p>第二段</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../../stores/taskStore', () => {
      const useTaskStore = vi.fn() as unknown as typeof import('../../stores/taskStore').useTaskStore
      Object.assign(useTaskStore, {
        getState: () => ({
          createTask,
          updateTask,
          save: saveTaskStore,
        }),
      })
      return { useTaskStore }
    })

    vi.doMock('../../lib/taskWindows', () => ({
      openTaskWindow,
    }))

    vi.doMock('uuid', () => ({
      v4: () => 'task-new-1',
    }))

    vi.doMock('../RichText/RichTextEditor', () => {
      return {
        RichTextEditor: React.forwardRef(function MockRichTextEditor(
          props: {
            value: string
            onContextMenu?: (event: React.MouseEvent) => void
            placeholder?: string
            style?: React.CSSProperties
          },
          ref,
        ) {
          React.useImperativeHandle(ref, () => ({
            focus: vi.fn(),
            getSelectedText: () => 'wega阿萨德',
            applyFontFamily: vi.fn(),
            applyFontSize: vi.fn(),
            applyTextColor: vi.fn(),
            toggleStyle: vi.fn(),
          }))

          return React.createElement('div', {
            'data-testid': 'idea-rich-text-editor',
            onContextMenu: props.onContextMenu,
            style: props.style,
          }, props.value || props.placeholder)
        }),
        richTextToPlainText: () => '纯文本备选标题',
      }
    })

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'idea-floating-menu' }, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => new DOMRect(12, 12, 80, 20),
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close: vi.fn().mockResolvedValue(undefined),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const editor = container.querySelector('[data-testid="idea-rich-text-editor"]') as HTMLElement | null
    expect(editor).toBeTruthy()

    await act(async () => {
      editor?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 60, clientY: 70 }))
    })

    const createTaskButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('创建任务'),
    )
    expect(createTaskButton).toBeTruthy()

    await act(async () => {
      createTaskButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(createTask).toHaveBeenCalledWith('task-new-1')
    expect(updateTask).toHaveBeenCalledWith('task-new-1', {
      title: 'wega阿萨德',
      body: '',
    })
    expect(saveTaskStore).toHaveBeenCalledTimes(1)
    expect(openTaskWindow).toHaveBeenCalledWith('task-new-1')
  })

  it('persists the current window bounds before hiding the idea window', async () => {
    const updateIdea = vi.fn()
    const hideIdea = vi.fn()
    const showIdea = vi.fn()
    const hideAllIdeas = vi.fn()
    const showAllIdeas = vi.fn()
    const renameIdea = vi.fn()
    const deleteIdea = vi.fn()
    const saveSettings = vi.fn()
    const pushFeedback = vi.fn()
    const close = vi.fn().mockResolvedValue(undefined)
    const destroy = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../../stores/ideaStore', () => ({
      useIdeaStore: (selector: (state: {
        ideas: Record<string, unknown>
        updateIdea: typeof updateIdea
        hideIdea: typeof hideIdea
        showIdea: typeof showIdea
        hideAllIdeas: typeof hideAllIdeas
        showAllIdeas: typeof showAllIdeas
        renameIdea: typeof renameIdea
        deleteIdea: typeof deleteIdea
        loaded: boolean
      }) => unknown) => selector({
        ideas: {
          'idea-1': {
            id: 'idea-1',
            title: '新便签 1',
            body: '<p>hello</p>',
            color: '#ffd93d',
            opacity: 0.95,
            isPinned: false,
            isVisible: true,
            fontSize: 14,
            fontFamily: 'default',
            fontColor: '#1a1a2e',
            windowState: null,
          },
        },
        updateIdea,
        hideIdea,
        showIdea,
        hideAllIdeas,
        showAllIdeas,
        renameIdea,
        deleteIdea,
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

    vi.doMock('../RichText/RichTextEditor', () => ({
      RichTextEditor: React.forwardRef(function MockRichTextEditor(
        props: {
          value: string
          onContextMenu?: (event: React.MouseEvent) => void
          placeholder?: string
          style?: React.CSSProperties
        },
        _ref,
      ) {
        return React.createElement('div', {
          onContextMenu: props.onContextMenu,
          style: props.style,
        }, props.value || props.placeholder)
      }),
      richTextToPlainText: () => 'hello',
    }))

    vi.doMock('../ContextMenuLayer', () => ({
      ContextMenuLayer: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    }))

    vi.doMock('../contextMenuAnchors', () => ({
      getSelectionAnchorRect: () => null,
    }))

    vi.doMock('../../platform/runtime', () => ({
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
              close,
              destroy,
              outerPosition: vi.fn().mockResolvedValue({ x: 120, y: 160 }),
              outerSize: vi.fn().mockResolvedValue({ width: 420, height: 260 }),
              innerSize: vi.fn().mockResolvedValue({ width: 400, height: 240 }),
              scaleFactor: vi.fn().mockResolvedValue(2),
            },
          }),
        },
      }),
    }))

    const { IdeaBox } = await import('./IdeaBox')

    await act(async () => {
      root.render(React.createElement(IdeaBox, { id: 'idea-1' }))
    })

    const closeButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.getAttribute('title')?.includes('关闭'),
    )

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(updateIdea).toHaveBeenCalledWith('idea-1', expect.objectContaining({
      isVisible: false,
      windowState: {
        x: 120,
        y: 160,
        width: 200,
        height: 120,
        sizeUnit: 'logical',
      },
    }))
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
  })
})
