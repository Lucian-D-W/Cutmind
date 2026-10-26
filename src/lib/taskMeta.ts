import { Task } from '../types'

export type TaskStatusKey = 'unstarted' | 'running' | 'resting' | 'planning' | 'paused' | 'completed'

export function getTaskStart(task: Pick<Task, 'focusRecords' | 'startTime' | 'createdAt'>): Date {
  return new Date(task.startTime ?? task.focusRecords[0]?.startedAt ?? task.createdAt)
}

export function getTaskEnd(
  task: Pick<Task, 'focusRecords' | 'startTime' | 'endTime' | 'createdAt' | 'timerMinutes'>,
): Date | null {
  if (task.endTime) {
    return new Date(task.endTime)
  }

  const latestRecord = task.focusRecords[task.focusRecords.length - 1]
  if (latestRecord?.endedAt) {
    return new Date(latestRecord.endedAt)
  }

  if (latestRecord?.startedAt) {
    return new Date(new Date(latestRecord.startedAt).getTime() + task.timerMinutes * 60 * 1000)
  }

  if (task.startTime) {
    return new Date(new Date(task.startTime).getTime() + task.timerMinutes * 60 * 1000)
  }

  return null
}

export function getTaskDurationMinutes(
  task: Pick<Task, 'focusRecords' | 'startTime' | 'endTime' | 'createdAt' | 'timerMinutes'>,
): number {
  const start = getTaskStart(task).getTime()
  const end = getTaskEnd(task)?.getTime()

  if (typeof end === 'number') {
    return Math.max(1, Math.round((end - start) / 60000))
  }

  return task.timerMinutes
}

export function getTaskFocusMinutes(
  task: Pick<Task, 'focusRecords' | 'elapsedSeconds'>,
): number {
  return task.focusRecords.reduce((total, record, index) => {
    if (record.endedAt) {
      return total + Math.max(1, Math.round((new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / 60000))
    }

    const isLatestRecord = index === task.focusRecords.length - 1
    if (isLatestRecord && task.elapsedSeconds > 0) {
      return total + Math.max(1, Math.round(task.elapsedSeconds / 60))
    }

    return total
  }, 0)
}

export function getTaskFocusHistory(
  task: Pick<Task, 'focusRecords' | 'elapsedSeconds'>,
): Array<{ startedAt: Date; endedAt: Date | null; durationMinutes: number | null }> {
  return task.focusRecords.map((record, index) => {
    const startedAt = new Date(record.startedAt)
    const endedAt = record.endedAt ? new Date(record.endedAt) : null
    const isLatestOpenRecord = !endedAt && index === task.focusRecords.length - 1
    const durationMinutes = endedAt
      ? Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
      : isLatestOpenRecord && task.elapsedSeconds > 0
        ? Math.max(1, Math.round(task.elapsedSeconds / 60))
        : null

    return { startedAt, endedAt, durationMinutes }
  })
}

export function hasTaskProgress(
  task: Pick<Task, 'focusRecords' | 'elapsedSeconds' | 'startTime' | 'endTime'>,
): boolean {
  return task.focusRecords.length > 0
    || task.elapsedSeconds > 0
    || Boolean(task.startTime)
    || Boolean(task.endTime)
}

export function getTaskStatusKey(
  task: Pick<Task, 'focusRecords' | 'elapsedSeconds' | 'startTime' | 'endTime' | 'isCompleted' | 'isRunning' | 'isResting' | 'isPlanningNextTask'>,
): TaskStatusKey {
  if (task.isCompleted) return 'completed'
  if (task.isPlanningNextTask) return 'planning'
  if (task.isResting) return 'resting'
  if (task.isRunning) return 'running'
  if (hasTaskProgress(task)) return 'paused'
  return 'unstarted'
}

export function buildTimerPatch(
  task: Pick<Task, 'focusRecords' | 'startTime' | 'endTime' | 'timerMinutes'>,
  nextTimerMinutes: number,
): Pick<Task, 'timerMinutes' | 'endTime'> {
  const latestRecord = task.focusRecords[task.focusRecords.length - 1]
  if (latestRecord?.startedAt && !latestRecord.endedAt) {
    return {
      timerMinutes: nextTimerMinutes,
      endTime: new Date(new Date(latestRecord.startedAt).getTime() + nextTimerMinutes * 60 * 1000).toISOString(),
    }
  }

  if (task.focusRecords.length > 0) {
    return {
      timerMinutes: nextTimerMinutes,
      endTime: task.endTime,
    }
  }

  if (!task.startTime) {
    return {
      timerMinutes: nextTimerMinutes,
      endTime: task.endTime,
    }
  }

  return {
    timerMinutes: nextTimerMinutes,
    endTime: new Date(new Date(task.startTime).getTime() + nextTimerMinutes * 60 * 1000).toISOString(),
  }
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const tag of tags) {
    const cleaned = tag.trim().replace(/\s+/g, ' ')
    if (!cleaned) continue

    const dedupeKey = cleaned.toLocaleLowerCase()
    if (seen.has(dedupeKey)) continue

    seen.add(dedupeKey)
    normalized.push(cleaned)
  }

  return normalized
}

export function parseTagInput(value: string): string[] {
  return normalizeTags(
    value
      .split(',')
      .map(tag => tag.trim()),
  )
}
