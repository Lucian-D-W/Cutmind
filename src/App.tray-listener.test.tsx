// @vitest-environment happy-dom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('App tray listener lifecycle', () => {
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

  it('does not leak a stale tray listener when async registration resolves after unmount', async () => {
    const trayListeners: Array<(action: string) => void | Promise<void>> = []
    const storeListeners: Array<(filename: string) => void | Promise<void>> = []
    const pendingRegistrations: Array<() => void> = []

    const loadTasks = vi.fn().mockResolvedValue(undefined)
    const reloadTasks = vi.fn().mockResolvedValue(undefined)
    const createTask = vi.fn().mockResolvedValue(undefined)
    const loadIdeas = vi.fn().mockResolvedValue(undefined)
    const reloadIdeas = vi.fn().mockResolvedValue(undefined)
    const loadSettings = vi.fn().mockResolvedValue(undefined)
    const reloadSettings = vi.fn().mockResolvedValue(undefined)
    const pushFeedback = vi.fn()
    const openTaskWindow = vi.fn().mockResolvedValue(undefined)

    const taskStore = ((selector: (state: {
      load: typeof loadTasks
      reload: typeof reloadTasks
    }) => unknown) => selector({
      load: loadTasks,
      reload: reloadTasks,
    })) as unknown as typeof import('./stores/taskStore').useTaskStore
    Object.assign(taskStore, {
      getState: () => ({
        createTask,
      }),
    })

    const ideaStore = ((selector: (state: {
      load: typeof loadIdeas
      reload: typeof reloadIdeas
    }) => unknown) => selector({
      load: loadIdeas,
      reload: reloadIdeas,
    })) as unknown as typeof import('./stores/ideaStore').useIdeaStore
    Object.assign(ideaStore, {
      getState: () => ({
        createIdea: vi.fn(),
        ideas: {},
        showIdea: vi.fn(),
        hideIdea: vi.fn(),
        showAllIdeas: vi.fn(),
        hideAllIdeas: vi.fn(),
      }),
    })

    const settingsStore = ((selector: (state: {
      load: typeof loadSettings
      reload: typeof reloadSettings
      settings: { language: 'zh-CN' }
    }) => unknown) => selector({
      load: loadSettings,
      reload: reloadSettings,
      settings: { language: 'zh-CN' },
    })) as unknown as typeof import('./stores/settingsStore').useSettingsStore

    vi.doMock('./hooks/useWindowId', () => ({
      useWindowView: () => ({ view: 'calendar', id: null }),
    }))

    vi.doMock('./components/TaskBox/TaskBox', () => ({
      TaskBox: () => React.createElement('div', null, 'task-box'),
    }))

    vi.doMock('./components/IdeaBox/IdeaBox', () => ({
      IdeaBox: () => React.createElement('div', null, 'idea-box'),
    }))

    vi.doMock('./components/Calendar/Calendar', () => ({
      Calendar: () => React.createElement('div', null, 'calendar'),
    }))

    vi.doMock('./components/Settings/SettingsPanel', () => ({
      SettingsPanel: () => React.createElement('div', null, 'settings'),
    }))

    vi.doMock('./components/ErrorBoundary', () => ({
      ErrorBoundary: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    }))

    vi.doMock('./components/UiFeedbackHost', () => ({
      UiFeedbackHost: () => null,
    }))

    vi.doMock('./monitoring/RuntimeMonitorBootstrap', () => ({
      RuntimeMonitorBootstrap: () => null,
    }))

    vi.doMock('./stores/taskStore', () => ({
      useTaskStore: taskStore,
    }))

    vi.doMock('./stores/ideaStore', () => ({
      useIdeaStore: ideaStore,
    }))

    vi.doMock('./stores/settingsStore', () => ({
      useSettingsStore: settingsStore,
    }))

    vi.doMock('./stores/uiFeedbackStore', () => ({
      useUiFeedbackStore: (selector: (state: { pushFeedback: typeof pushFeedback }) => unknown) =>
        selector({ pushFeedback }),
    }))

    vi.doMock('./lib/taskWindows', () => ({
      openTaskWindow,
    }))

    vi.doMock('./lib/ideaWindows', () => ({
      openIdeaWindow: vi.fn(),
      closeIdeaWindow: vi.fn(),
    }))

    vi.doMock('./lib/settingsWindow', () => ({
      openSettingsWindow: vi.fn(),
    }))

    vi.doMock('./lib/restAlerts', () => ({
      initializeAlertAudio: vi.fn(),
    }))

    vi.doMock('./lib/i18n', () => ({
      getLocaleCopy: () => ({
        app: {
          settingsWindowTitle: '设置',
        },
        common: {
          untitledIdea: '未命名想法',
        },
        feedback: {
          taskWindowReady: 'task-ready',
          taskWindowFailed: 'task-failed',
          ideaWindowReady: 'idea-ready',
          ideaWindowFailed: 'idea-failed',
          showAllIdeasReady: 'show-all-ready',
          showAllIdeasFailed: 'show-all-failed',
          hideAllIdeasReady: 'hide-all-ready',
          hideAllIdeasFailed: 'hide-all-failed',
          ideaHidden: 'idea-hidden',
          ideaShown: 'idea-shown',
          ideaToggleFailed: 'idea-toggle-failed',
          settingsWindowReady: 'settings-ready',
          settingsWindowFailed: 'settings-failed',
        },
        settings: {
          desktopOnlyBannerTitle: 'desktop-only',
          desktopOnlyBannerBody: 'desktop-only-body',
        },
      }),
      replaceTemplate: (template: string) => template,
    }))

    vi.doMock('./monitoring/runtimeMonitor', () => ({
      monitorEvent: vi.fn(),
      monitorError: vi.fn(),
    }))

    vi.doMock('uuid', () => {
      let counter = 0
      return {
        v4: () => `task-${++counter}`,
      }
    })

    vi.doMock('./platform/runtime', () => ({
      getRuntimeKind: () => 'tauri',
      getRuntimeBridge: () => ({
        events: {
          listen: vi.fn((event: string, handler: (payload: string) => void | Promise<void>) =>
            new Promise(resolve => {
              pendingRegistrations.push(() => {
                const listeners = event === 'tray-action' ? trayListeners : storeListeners
                listeners.push(handler)
                resolve({
                  ok: true,
                  value: () => {
                    const index = listeners.indexOf(handler)
                    if (index >= 0) {
                      listeners.splice(index, 1)
                    }
                  },
                })
              })
            }),
          ),
        },
      }),
    }))

    const { default: App } = await import('./App')

    await act(async () => {
      root.render(React.createElement(App))
    })

    const firstMountRegistrations = pendingRegistrations.splice(0)

    await act(async () => {
      root.unmount()
    })

    await act(async () => {
      firstMountRegistrations.forEach(resolve => resolve())
    })

    root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(App))
    })

    const secondMountRegistrations = pendingRegistrations.splice(0)

    await act(async () => {
      secondMountRegistrations.forEach(resolve => resolve())
    })

    expect(trayListeners).toHaveLength(1)

    await act(async () => {
      await Promise.all(trayListeners.map(listener => listener('new_task')))
    })

    expect(createTask).toHaveBeenCalledTimes(1)
    expect(openTaskWindow).toHaveBeenCalledTimes(1)
  })
})
