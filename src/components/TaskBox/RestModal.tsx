import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '../../stores/taskStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getTaskEnd } from '../../lib/taskMeta'
import { appendTaskBody, createNextTaskDraft, startTaskFocus } from './taskFlow'
import { sendAlertNotification, startAlertLoop, stopAlertLoop } from '../../lib/restAlerts'
import { getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import type { NextStepMode } from '../../types'
import { getRuntimeBridge } from '../../platform/runtime'

interface Props {
  taskId: string
}

export function RestModal({ taskId }: Props) {
  const task = useTaskStore(s => s.tasks[taskId])
  const updateTask = useTaskStore(s => s.updateTask)
  const settings = useSettingsStore(s => s.settings)
  const copy = getLocaleCopy(settings.language)
  const nextStepOptions: Array<{
    mode: NextStepMode
    title: string
    description: string
  }> = [
    {
      mode: 'continue',
      title: copy.restModal.continueTitle,
      description: copy.restModal.continueDescription,
    },
    {
      mode: 'retitle',
      title: copy.restModal.retitleTitle,
      description: copy.restModal.retitleDescription,
    },
    {
      mode: 'new-task',
      title: copy.restModal.newTaskTitle,
      description: copy.restModal.newTaskDescription,
    },
    {
      mode: 'finish-task',
      title: copy.restModal.finishTitle,
      description: copy.restModal.finishDescription,
    },
  ]
  const [restElapsed, setRestElapsed] = useState(0)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftRestMinutes, setDraftRestMinutes] = useState('5')
  const intervalRef = useRef<number | null>(null)
  const notifiedRestDoneRef = useRef(false)
  const resolveCurrentWindow = async () => {
    const result = await getRuntimeBridge().windows.getCurrentWindow()
    return result.ok ? result.value : null
  }

  useEffect(() => {
    if (task?.isResting) {
      setRestElapsed(0)
      intervalRef.current = window.setInterval(() => {
        setRestElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [task?.isResting])

  useEffect(() => {
    if (!task?.isResting) {
      notifiedRestDoneRef.current = false
      return
    }

    const remaining = Math.max(0, task.restSeconds - restElapsed)
    if (remaining === 0 && !notifiedRestDoneRef.current) {
      notifiedRestDoneRef.current = true
      startAlertLoop(`rest-finished:${taskId}`, settings)
      void sendAlertNotification(copy.restModal.breakFinishedTitle, copy.restModal.breakFinishedBody)
    }
  }, [copy.restModal.breakFinishedBody, copy.restModal.breakFinishedTitle, restElapsed, settings, task?.isResting, task?.restSeconds, taskId])

  useEffect(() => () => {
    stopAlertLoop()
  }, [])

  useEffect(() => {
    if (!task?.isPlanningNextTask || !task.nextTaskDraft) return
    setDraftTitle(task.nextTaskDraft.title)
    setDraftBody(task.nextTaskDraft.body)
    setDraftRestMinutes(String(task.nextTaskDraft.restMinutes))
  }, [task?.isPlanningNextTask, task?.nextTaskDraft])

  const parsedRestMinutes = useMemo(() => {
    const parsed = Number.parseInt(draftRestMinutes, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }, [draftRestMinutes])

  if (!task || (!task.isPlanningNextTask && !task.isResting)) return null

  const mode = task.nextStepMode
  const minimumRestMinutes = task.nextTaskDraft?.minimumRestMinutes ?? 0
  const effectiveRestMinutes = Math.max(parsedRestMinutes, minimumRestMinutes)
  const requiresCustomTitle = mode === 'retitle' || mode === 'new-task'
  const canConfirmNextStep = Boolean(
    mode
    && draftBody.trim() !== ''
    && effectiveRestMinutes > 0
    && (!requiresCustomTitle || draftTitle.trim() !== ''),
  )

  const chooseNextStepMode = (nextMode: NextStepMode) => {
    if (nextMode === 'finish-task') {
      void finishTask()
      return
    }

    updateTask(taskId, {
      nextStepMode: nextMode,
      nextTaskDraft: createNextTaskDraft(task, nextMode),
    })
  }

  const resetNextStepMode = () => {
    updateTask(taskId, {
      nextStepMode: null,
      nextTaskDraft: null,
    })
  }

  const confirmNextStep = () => {
    if (!mode || !canConfirmNextStep) return

    const nextTitle = mode === 'continue' ? (task.title || draftTitle).trim() : draftTitle.trim()

    updateTask(taskId, {
      isPlanningNextTask: false,
      isResting: true,
      isCompleted: false,
      completedAt: null,
      restSeconds: effectiveRestMinutes * 60,
      nextStepMode: mode,
      nextTaskDraft: {
        title: nextTitle,
        body: draftBody.trim(),
        restMinutes: effectiveRestMinutes,
        minimumRestMinutes,
      },
    })
    setRestElapsed(0)
    stopAlertLoop()
  }

  const finishTask = async () => {
    const finishedAt = getTaskEnd(task)?.toISOString() ?? task.endTime ?? new Date().toISOString()

    updateTask(taskId, {
      isRunning: false,
      isCompleted: true,
      isPlanningNextTask: false,
      isResting: false,
      nextTaskDraft: null,
      nextStepMode: null,
      completedAt: finishedAt,
      endTime: task.endTime ?? finishedAt,
    })
    await useTaskStore.getState().save()
    stopAlertLoop()
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) return
    await currentWindow.close()
  }

  const startAfterBreak = async () => {
    if (!task.nextTaskDraft || !task.nextStepMode) return

    try {
      if (task.nextStepMode === 'new-task') {
        const [{ v4: uuidv4 }, { useTaskStore }, { openTaskWindow }] = await Promise.all([
          import('uuid'),
          import('../../stores/taskStore'),
          import('../../lib/taskWindows'),
        ])

        const nextTaskId = uuidv4()
        const store = useTaskStore.getState()
        await store.createTask(nextTaskId)
        store.updateTask(nextTaskId, {
          title: task.nextTaskDraft.title,
          body: task.nextTaskDraft.body,
        })
        await store.save()

        stopAlertLoop()
        const currentWindow = await resolveCurrentWindow()
        const position = await currentWindow?.outerPosition()
        updateTask(taskId, {
          isPlanningNextTask: false,
          isResting: false,
          isCompleted: false,
          nextTaskDraft: null,
          nextStepMode: null,
          completedAt: null,
        })
        await useTaskStore.getState().save()

        await openTaskWindow(nextTaskId, position ? { x: position.x, y: position.y } : {})
        if (currentWindow) {
          await currentWindow.close()
        }
        return
      }

      const startedAt = new Date().toISOString()
      const nextTitle = task.nextStepMode === 'continue'
        ? task.title
        : task.nextTaskDraft.title

      updateTask(taskId, {
        ...startTaskFocus(task, startedAt, task.timerMinutes),
        title: nextTitle,
        body: appendTaskBody(task.body, task.nextTaskDraft.body),
        elapsedSeconds: 0,
        isRunning: true,
        isCompleted: false,
        isPlanningNextTask: false,
        isResting: false,
        nextTaskDraft: null,
        nextStepMode: null,
        completedAt: null,
      })
      stopAlertLoop()
    } catch (err) {
      console.error('Failed to continue after break:', err)
    }
  }

  const restTotal = task.restSeconds
  const remaining = Math.max(0, restTotal - restElapsed)
  const canDismiss = remaining <= 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  if (task.isPlanningNextTask) {
    if (!mode) {
      return (
        <RestOverlay>
          <div style={scrollFrameStyle}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 17, lineHeight: 1.2 }}>{copy.restModal.finishedTitle}</h2>
              <p style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
                {copy.restModal.finishedDescription}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nextStepOptions.map(option => (
                  <button
                    key={option.mode}
                    onClick={() => chooseNextStepMode(option.mode)}
                    style={choiceButtonStyle}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{option.title}</span>
                    <span style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.4 }}>
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </RestOverlay>
      )
    }

    return (
      <RestOverlay>
        <div style={scrollFrameStyle}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 17, lineHeight: 1.1 }}>{copy.restModal.nextStepTitle}</h2>
            <p style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.35 }}>
              {copy.restModal.nextStepDescription}
            </p>

            {mode === 'continue' ? (
            <div style={readonlyFieldStyle}>
              <span style={{ fontSize: 10, opacity: 0.68, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {copy.restModal.continueWith}
              </span>
              <strong style={{ fontSize: 14 }}>{task.title || copy.common.untitledTask}</strong>
            </div>
          ) : (
            <input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder={copy.restModal.nextTaskTitlePlaceholder}
              style={inputStyle}
            />
          )}

          <textarea
            value={draftBody}
            onChange={e => setDraftBody(e.target.value)}
            placeholder={copy.restModal.nextTaskBodyPlaceholder}
            style={{ ...inputStyle, minHeight: 72, maxHeight: 96, resize: 'vertical' }}
          />
          {mode !== 'new-task' && (
            <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.4 }}>
                {copy.restModal.nextBodyAppendHint}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>
              {copy.restModal.plannedRestMinutes}
            </label>
            <input
              type="number"
                min={Math.max(1, minimumRestMinutes)}
                value={draftRestMinutes}
                onChange={e => setDraftRestMinutes(e.target.value)}
                style={inputStyle}
            />
            {minimumRestMinutes > 0 && (
              <span style={{ fontSize: 11, color: '#ffd166', lineHeight: 1.35 }}>
                  {replaceTemplate(copy.restModal.minimumRestHint, { minutes: minimumRestMinutes })}
              </span>
            )}
          </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={resetNextStepMode}
                style={{ ...actionButtonStyle, background: 'rgba(255,255,255,0.14)' }}
              >
                {copy.common.back}
              </button>
              <button
                onClick={confirmNextStep}
                disabled={!canConfirmNextStep}
                style={{
                  ...actionButtonStyle,
                  flex: 1,
                  background: canConfirmNextStep ? '#6bcb77' : '#444',
                  cursor: canConfirmNextStep ? 'pointer' : 'not-allowed',
                }}
              >
                {copy.restModal.confirmAndBreak}
              </button>
            </div>
          </div>
        </div>
      </RestOverlay>
    )
  }

  return (
    <RestOverlay>
      <div style={centerFrameStyle}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>{copy.restModal.breakTitle}</h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
          {copy.restModal.breakDescription}
        </p>
        {!canDismiss && (
          <p style={{ fontFamily: 'Consolas, monospace', fontSize: 32, fontWeight: 700 }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        )}
        <button
          onClick={startAfterBreak}
          disabled={!canDismiss}
          style={{
            marginTop: 16, padding: '8px 24px', borderRadius: 8, border: 'none',
            background: canDismiss ? '#6bcb77' : '#444',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: canDismiss ? 'pointer' : 'not-allowed',
          }}
        >
          {canDismiss
            ? task.nextStepMode === 'new-task'
              ? copy.restModal.startNextTask
              : copy.restModal.continueCurrentTask
            : copy.restModal.pleaseWait}
        </button>
      </div>
    </RestOverlay>
  )
}

function RestOverlay({ children }: { children: React.ReactNode }) {
  // A filtered/scrolling TaskBox establishes a containing block for fixed
  // descendants. Keep the dialog at the document level so it cannot scroll
  // out of view with the task notes or inherit their clipped dimensions.
  return createPortal(
    <div role="dialog" aria-modal="true" data-testid="rest-scroll-area" style={overlayStyle}>
      {children}
    </div>,
    document.body,
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.88)',
  zIndex: 999,
  color: '#fff',
  borderRadius: 10,
  padding: 12,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 332,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  padding: 12,
}

const scrollFrameStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 24px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
}

const centerFrameStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 24px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#fff',
  fontSize: 12,
  outline: 'none',
}

const actionButtonStyle: React.CSSProperties = {
  marginTop: 2,
  padding: '9px 14px',
  borderRadius: 8,
  border: 'none',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
}

const choiceButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  width: '100%',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  padding: '10px 12px',
  textAlign: 'left',
  cursor: 'pointer',
}

const readonlyFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
}
