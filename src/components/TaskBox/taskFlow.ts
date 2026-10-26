import type { NextStepMode, NextTaskDraft, Task, TaskFocusRecord } from '../../types'

export function getMinimumRestMinutes(taskMinutes: number): number {
  if (taskMinutes < 20) return 0
  if (taskMinutes < 50) return 5
  return 10
}

export function getPlannedRestMinutes(taskMinutes: number, defaultRestMinutes: number): number {
  return Math.max(defaultRestMinutes, getMinimumRestMinutes(taskMinutes))
}

export function createNextTaskDraft(task: Task, mode: NextStepMode): NextTaskDraft {
  const taskMinutes = Math.max(task.timerMinutes, Math.ceil(task.elapsedSeconds / 60))
  const defaultRestMinutes = Math.max(1, Math.round(task.restSeconds / 60))
  const minimumRestMinutes = getMinimumRestMinutes(taskMinutes)

  return {
    title: mode === 'continue' ? task.title : '',
    body: '',
    restMinutes: getPlannedRestMinutes(taskMinutes, defaultRestMinutes),
    minimumRestMinutes,
  }
}

export function appendTaskBody(existingBody: string, nextBody: string): string {
  const previous = existingBody.trimEnd()
  const addition = nextBody.trim()

  if (!previous) {
    return addition
  }

  if (!addition) {
    return previous
  }

  return `${previous}\n\n${addition}`
}

function getPlannedFocusEnd(startedAt: string, timerMinutes: number): string {
  return new Date(new Date(startedAt).getTime() + timerMinutes * 60 * 1000).toISOString()
}

function closeLatestOpenRecord(records: TaskFocusRecord[], endedAt: string): TaskFocusRecord[] {
  if (records.length === 0) {
    return []
  }

  const lastIndex = records.length - 1
  const lastRecord = records[lastIndex]
  if (lastRecord.endedAt) {
    return records
  }

  return records.map((record, index) => (
    index === lastIndex
      ? { ...record, endedAt }
      : record
  ))
}

export function startTaskFocus(
  task: Pick<Task, 'focusRecords' | 'startTime' | 'timerMinutes'>,
  startedAt: string,
  plannedMinutes = task.timerMinutes,
): Pick<Task, 'focusRecords' | 'startTime' | 'endTime'> {
  const lastRecord = task.focusRecords[task.focusRecords.length - 1]
  const focusRecords = lastRecord && !lastRecord.endedAt
    ? task.focusRecords
    : [...task.focusRecords, { startedAt, endedAt: null }]

  return {
    focusRecords,
    startTime: task.startTime ?? focusRecords[0]?.startedAt ?? startedAt,
    endTime: getPlannedFocusEnd(startedAt, plannedMinutes),
  }
}

export function finishTaskFocus(
  task: Pick<Task, 'focusRecords' | 'startTime'>,
  endedAt: string,
): Pick<Task, 'focusRecords' | 'startTime' | 'endTime'> {
  const focusRecords = task.focusRecords.some(record => !record.endedAt)
    ? closeLatestOpenRecord(task.focusRecords, endedAt)
    : task.focusRecords.length === 0
      ? [{ startedAt: task.startTime ?? endedAt, endedAt }]
      : task.focusRecords

  return {
    focusRecords,
    startTime: task.startTime ?? focusRecords[0]?.startedAt ?? null,
    endTime: endedAt,
  }
}
