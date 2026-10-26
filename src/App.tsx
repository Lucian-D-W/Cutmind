import { useEffect } from 'react'
import { useWindowView } from './hooks/useWindowId'
import { TaskBox } from './components/TaskBox/TaskBox'
import { IdeaBox } from './components/IdeaBox/IdeaBox'
import { Calendar } from './components/Calendar/Calendar'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UiFeedbackHost } from './components/UiFeedbackHost'
import { RuntimeMonitorBootstrap } from './monitoring/RuntimeMonitorBootstrap'
import { useTaskStore } from './stores/taskStore'
import { useIdeaStore } from './stores/ideaStore'
import { useSettingsStore } from './stores/settingsStore'
import { useUiFeedbackStore } from './stores/uiFeedbackStore'
import { v4 as uuidv4 } from 'uuid'
import { openTaskWindow } from './lib/taskWindows'
import { closeIdeaWindow, openIdeaWindow } from './lib/ideaWindows'
import { openSettingsWindow } from './lib/settingsWindow'
import { initializeAlertAudio } from './lib/restAlerts'
import { getLocaleCopy, replaceTemplate } from './lib/i18n'
import { shouldIgnoreStoreEcho } from './lib/storeUpdateEcho'
import { monitorError, monitorEvent } from './monitoring/runtimeMonitor'
import { getRuntimeBridge, getRuntimeKind } from './platform/runtime'
import { scheduleDailyJournalSync } from './lib/dailyJournalSync'

export default function App() {
  const { view, id } = useWindowView()
  console.log('[App] view =', view, ', id =', id, ', href =', window.location.href)
  const loadTasks = useTaskStore(s => s.load)
  const reloadTasks = useTaskStore(s => s.reload)
  const flushPendingTaskSave = useTaskStore(s => s.flushPendingSave)
  const loadIdeas = useIdeaStore(s => s.load)
  const reloadIdeas = useIdeaStore(s => s.reload)
  const flushPendingIdeaSave = useIdeaStore(s => s.flushPendingSave)
  const loadSettings = useSettingsStore(s => s.load)
  const reloadSettings = useSettingsStore(s => s.reload)
  const tasks = useTaskStore(s => s.tasks)
  const language = useSettingsStore(s => s.settings.language)
  const dailyJournalFolder = useSettingsStore(s => s.settings.dailyJournalFolder)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(language)
  const runtimeKind = getRuntimeKind()
  const runtimeBridge = getRuntimeBridge()
  const isBrowserRuntime = runtimeKind === 'browser'

  useEffect(() => {
    monitorEvent('app', 'boot', { view, runtimeKind })
    loadTasks()
    loadIdeas()
    loadSettings()
    initializeAlertAudio()
  }, [loadIdeas, loadSettings, loadTasks, runtimeKind, view])

  useEffect(() => {
    const flushPendingStoreSaves = () => {
      void flushPendingTaskSave?.()
      void flushPendingIdeaSave?.()
    }

    window.addEventListener('pagehide', flushPendingStoreSaves)
    window.addEventListener('beforeunload', flushPendingStoreSaves)

    return () => {
      window.removeEventListener('pagehide', flushPendingStoreSaves)
      window.removeEventListener('beforeunload', flushPendingStoreSaves)
      flushPendingStoreSaves()
    }
  }, [flushPendingIdeaSave, flushPendingTaskSave])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let disposed = false

    void runtimeBridge.events.listen<string>('store-updated', async filename => {
      if (shouldIgnoreStoreEcho(filename)) {
        monitorEvent('app', 'store-updated-ignored-self-echo', { filename })
        return
      }
      monitorEvent('app', 'store-updated', { filename })
      if (filename === 'tasks.json') {
        await reloadTasks()
      } else if (filename === 'ideas.json') {
        await reloadIdeas()
      } else if (filename === 'settings.json') {
        await reloadSettings()
      }
    }).then(result => {
      if (result.ok) {
        if (disposed) {
          result.value()
          return
        }
        cleanup = result.value
        return
      }

      monitorEvent('app', 'store-updated-listener-unavailable', {
        runtimeKind,
        reason: result.reason,
        message: result.message,
      }, 'warn')
    }).catch(error => {
      monitorError('app', error, {
        action: 'listen-store-updated',
        runtimeKind,
      })
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [reloadIdeas, reloadSettings, reloadTasks, runtimeBridge.events, runtimeKind])

  useEffect(() => {
    const transparentView = view === 'idea' || view === 'task'
    const background = transparentView ? 'transparent' : 'var(--bg-primary)'
    document.documentElement.style.background = background
    document.body.style.background = background
    return () => {
      document.documentElement.style.background = 'var(--bg-primary)'
      document.body.style.background = 'var(--bg-primary)'
    }
  }, [view])

  useEffect(() => {
    if (view !== 'calendar') return

    scheduleDailyJournalSync({
      tasks: Object.values(tasks ?? {}),
      folderPath: dailyJournalFolder ?? '',
      language,
    })
  }, [dailyJournalFolder, language, tasks, view])

  // Listen for tray actions (only in the main/calendar window)
  useEffect(() => {
    if (view !== 'calendar') return

    let cleanup: (() => void) | undefined
    let disposed = false

    void runtimeBridge.events.listen<string>('tray-action', async (action) => {
      monitorEvent('tray', 'action', { action })
      try {
        if (action === 'new_task') {
          const taskId = uuidv4()
          const store = useTaskStore.getState()
          await store.createTask(taskId)
          await openTaskWindow(taskId)
          pushFeedback({ kind: 'success', message: copy.feedback.taskWindowReady })
        } else if (action === 'new_idea') {
          const ideaId = uuidv4()
          const store = useIdeaStore.getState()
          const idea = await store.createIdea(ideaId)
          store.showIdea(ideaId)
          try {
            await openIdeaWindow({ ...idea, isVisible: true })
            pushFeedback({ kind: 'success', message: copy.feedback.ideaWindowReady })
          } catch (error) {
            store.hideIdea(ideaId)
            throw error
          }
        } else if (action === 'show_all_ideas') {
          const store = useIdeaStore.getState()
          const ideas = Object.values(store.ideas)
          store.showAllIdeas()
          const results = await Promise.allSettled(
            ideas.map(idea => openIdeaWindow({ ...idea, isVisible: true })),
          )
          const failedIdeas = results
            .map((result, index) => ({ result, idea: ideas[index] }))
            .filter(({ result }) => result.status === 'rejected')

          if (failedIdeas.length > 0) {
            failedIdeas.forEach(({ idea }) => store.hideIdea(idea.id))
            const firstFailure = failedIdeas[0].result
            if (firstFailure.status === 'rejected') {
              throw firstFailure.reason
            }
          }
          pushFeedback({ kind: 'success', message: copy.feedback.showAllIdeasReady })
        } else if (action === 'hide_all_ideas') {
          const store = useIdeaStore.getState()
          const ideas = Object.values(store.ideas)
          store.hideAllIdeas()
          const results = await Promise.allSettled(ideas.map(idea => closeIdeaWindow(idea.id)))
          const failedIdeas = results
            .map((result, index) => ({ result, idea: ideas[index] }))
            .filter(({ result }) => result.status === 'rejected')

          if (failedIdeas.length > 0) {
            failedIdeas.forEach(({ idea }) => store.showIdea(idea.id))
            const firstFailure = failedIdeas[0].result
            if (firstFailure.status === 'rejected') {
              throw firstFailure.reason
            }
          }
          pushFeedback({ kind: 'success', message: copy.feedback.hideAllIdeasReady })
        } else if (action.startsWith('toggle_idea::')) {
          const ideaId = action.slice('toggle_idea::'.length)
          const store = useIdeaStore.getState()
          const idea = store.ideas[ideaId]
          if (!idea) return
          const wasVisible = idea.isVisible
          if (wasVisible) {
            store.hideIdea(ideaId)
            try {
              await closeIdeaWindow(ideaId)
              pushFeedback({
                kind: 'success',
                message: replaceTemplate(copy.feedback.ideaHidden, { title: idea.title || copy.common.untitledIdea }),
              })
            } catch (error) {
              store.showIdea(ideaId)
              throw error
            }
          } else {
            store.showIdea(ideaId)
            try {
              await openIdeaWindow({ ...idea, isVisible: true })
              pushFeedback({
                kind: 'success',
                message: replaceTemplate(copy.feedback.ideaShown, { title: idea.title || copy.common.untitledIdea }),
              })
            } catch (error) {
              store.hideIdea(ideaId)
              throw error
            }
          }
        } else if (action === 'preferences') {
          await openSettingsWindow(copy.app.settingsWindowTitle)
          pushFeedback({ kind: 'success', message: copy.feedback.settingsWindowReady })
        }
      } catch (err) {
        console.error('Tray action failed:', action, err)
        monitorError('tray', err, { action })
        const message = err instanceof Error ? err.message : String(err)
        if (action === 'new_task') {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.taskWindowFailed, { message }),
          })
        } else if (action === 'new_idea') {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.ideaWindowFailed, { message }),
          })
        } else if (action === 'show_all_ideas') {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.showAllIdeasFailed, { message }),
          })
        } else if (action === 'hide_all_ideas') {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.hideAllIdeasFailed, { message }),
          })
        } else if (action === 'preferences') {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.settingsWindowFailed, { message }),
          })
        } else if (action.startsWith('toggle_idea::')) {
          pushFeedback({
            kind: 'error',
            message: replaceTemplate(copy.feedback.ideaToggleFailed, { message }),
          })
        }
      }
    })
      .then(result => {
        if (result.ok) {
          if (disposed) {
            result.value()
            return
          }
          cleanup = result.value
          return
        }

        monitorEvent('tray', 'listener-unavailable', {
          runtimeKind,
          reason: result.reason,
          message: result.message,
        }, 'warn')
      })
      .catch(error => {
        monitorError('tray', error, {
          action: 'listen-tray-action',
          runtimeKind,
        })
      })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [
    copy.app.settingsWindowTitle,
    copy.common.untitledIdea,
    copy.feedback.hideAllIdeasFailed,
    copy.feedback.hideAllIdeasReady,
    copy.feedback.ideaHidden,
    copy.feedback.ideaShown,
    copy.feedback.ideaToggleFailed,
    copy.feedback.ideaWindowFailed,
    copy.feedback.ideaWindowReady,
    copy.feedback.settingsWindowFailed,
    copy.feedback.settingsWindowReady,
    copy.feedback.showAllIdeasFailed,
    copy.feedback.showAllIdeasReady,
    copy.feedback.taskWindowFailed,
    copy.feedback.taskWindowReady,
    pushFeedback,
    runtimeBridge.events,
    runtimeKind,
    view,
  ])

  const desktopOnlyFallback = (title: string, body: string) => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f6f2ec',
      padding: 24,
      color: '#2f2922',
    }}>
      <div style={{
        maxWidth: 420,
        borderRadius: 18,
        border: '1px solid rgba(126, 113, 95, 0.14)',
        background: 'rgba(255,255,255,0.84)',
        boxShadow: '0 18px 36px rgba(84, 58, 28, 0.10)',
        padding: '20px 22px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#7a6d5d' }}>{body}</div>
      </div>
    </div>
  )

  const renderView = () => {
    switch (view) {
      case 'task':
        if (isBrowserRuntime) {
          return desktopOnlyFallback(
            copy.settings.desktopOnlyBannerTitle,
            copy.settings.desktopOnlyBannerBody,
          )
        }
        return <TaskBox id={id!} />
      case 'idea':
        if (isBrowserRuntime) {
          return desktopOnlyFallback(
            copy.settings.desktopOnlyBannerTitle,
            copy.settings.desktopOnlyBannerBody,
          )
        }
        return <IdeaBox id={id!} />
      case 'calendar':
        return <Calendar />
      case 'settings':
        return <SettingsPanel />
      default:
        return <Calendar />
    }
  }

  // Debug: show raw view info at the top if something is wrong
  if (view === 'idea' && !id) {
    return <div style={{ color: '#e94560', padding: 20, background: '#1a1a2e' }}>
      [DEBUG] view=idea but id is null. href={window.location.href}
    </div>
  }

  return (
    <ErrorBoundary>
      <RuntimeMonitorBootstrap view={view} />
      {renderView()}
      <UiFeedbackHost />
    </ErrorBoundary>
  )
}
