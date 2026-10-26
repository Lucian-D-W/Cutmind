import { useEffect, useRef } from 'react'
import { useTaskStore } from '../../stores/taskStore'
import { finishTaskFocus, startTaskFocus } from './taskFlow'
import { useSettingsStore } from '../../stores/settingsStore'
import { sendAlertNotification, startAlertLoop, stopAlertLoop } from '../../lib/restAlerts'
import { getLocaleCopy } from '../../lib/i18n'

interface Props {
  taskId: string
}

export function TimerDisplay({ taskId }: Props) {
  const task = useTaskStore(s => s.tasks[taskId])
  const updateTask = useTaskStore(s => s.updateTask)
  const settings = useSettingsStore(s => s.settings)
  const copy = getLocaleCopy(settings.language)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (task?.isRunning && !task.isResting) {
      intervalRef.current = window.setInterval(() => {
        const current = useTaskStore.getState().tasks[taskId]
        if (!current) return
        const next = current.elapsedSeconds + 1
        const totalSeconds = current.timerMinutes * 60

        if (totalSeconds > 0 && next >= totalSeconds) {
          const finishedAt = new Date().toISOString()
          updateTask(taskId, {
            elapsedSeconds: next,
            isRunning: false,
            isCompleted: false,
            isPlanningNextTask: true,
            isResting: false,
            nextTaskDraft: null,
            nextStepMode: null,
            completedAt: null,
            ...finishTaskFocus(current, finishedAt),
          })
          startAlertLoop(`task-finished:${taskId}`, settings)
          void sendAlertNotification(copy.restModal.focusFinishedTitle, copy.restModal.focusFinishedBody)
        } else {
          updateTask(taskId, { elapsedSeconds: next })
        }
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [copy.restModal.focusFinishedBody, copy.restModal.focusFinishedTitle, settings, task?.isRunning, task?.isResting, taskId])

  if (!task) return null

  const totalSeconds = task.timerMinutes * 60
  const remaining = Math.max(0, totalSeconds - task.elapsedSeconds)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = totalSeconds > 0
    ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(Math.floor(task.elapsedSeconds / 60)).padStart(2, '0')}:${String(task.elapsedSeconds % 60).padStart(2, '0')}`

  const toggleTimer = () => {
    if (task.isRunning) {
      const pausedAt = new Date().toISOString()
      updateTask(taskId, {
        isRunning: false,
        ...finishTaskFocus(task, pausedAt),
      })
      return
    }

    const shouldRestart = totalSeconds > 0 && (task.isResting || task.elapsedSeconds >= totalSeconds)
    const nextStartTime = new Date().toISOString()
    const remainingMinutes = totalSeconds > 0
      ? shouldRestart
        ? task.timerMinutes
        : Math.max(1, Math.ceil((totalSeconds - task.elapsedSeconds) / 60))
      : task.timerMinutes
    updateTask(taskId, {
      ...startTaskFocus(task, nextStartTime, remainingMinutes),
      isRunning: true,
      isCompleted: false,
      isPlanningNextTask: false,
      isResting: false,
      nextTaskDraft: null,
      nextStepMode: null,
      elapsedSeconds: shouldRestart ? 0 : task.elapsedSeconds,
      completedAt: null,
    })
    stopAlertLoop()
  }

  const resetTimer = () => {
    updateTask(taskId, {
      elapsedSeconds: 0,
      isRunning: false,
      isCompleted: false,
      isPlanningNextTask: false,
      isResting: false,
      nextTaskDraft: null,
      nextStepMode: null,
      focusRecords: [],
      completedAt: null,
      startTime: null,
      endTime: null,
    })
    stopAlertLoop()
  }

  return (
    <div data-no-drag style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      padding: '12px',
      fontSize: 12,
    }}>
      <span style={{
        fontFamily: 'Consolas, monospace',
        fontSize: 48,
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        textShadow: '0 4px 18px rgba(0,0,0,0.12)',
      }}>
        {display}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={toggleTimer} style={actionButtonStyle}>
          {task.isRunning ? copy.timer.pause : copy.timer.start}
        </button>
        {task.showResetButton && (
          <button onClick={resetTimer} style={actionButtonStyle}>
            {copy.timer.reset}
          </button>
        )}
      </div>
    </div>
  )
}

const actionButtonStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.15)',
  border: 'none',
  color: 'inherit',
  borderRadius: 6,
  padding: '5px 12px',
  minWidth: 62,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}
