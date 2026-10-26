import { describe, expect, it } from 'vitest'
import type { Task } from '../../types'
import { buildWeekTaskLaneLayout } from './weekTaskLayout'

function makeTask(id: string, startIso: string, durationMinutes: number): Task {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  return {
    id,
    title: id,
    body: '',
    color: '#e94560',
    opacity: 0.95,
    isPinned: false,
    showResetButton: false,
    tags: [],
    timerMinutes: durationMinutes,
    elapsedSeconds: 0,
    isRunning: false,
    isCompleted: false,
    isPlanningNextTask: false,
    isResting: false,
    restSeconds: 300,
    nextTaskDraft: null,
    nextStepMode: null,
    focusRecords: [],
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    titleFontSize: 15,
    titleFontFamily: 'default',
    titleFontColor: '#ffffff',
    bodyFontSize: 14,
    bodyFontFamily: 'default',
    bodyFontColor: '#ffffff',
    fontColor: '#ffffff',
    createdAt: start.toISOString(),
    completedAt: null,
    windowState: null,
  }
}

describe('buildWeekTaskLaneLayout', () => {
  it('keeps non-overlapping tasks full width', () => {
    const layouts = buildWeekTaskLaneLayout([
      makeTask('task-1', '2026-04-14T09:00:00.000Z', 30),
      makeTask('task-2', '2026-04-14T10:00:00.000Z', 30),
    ])

    expect(layouts.get('task-1')).toEqual({ laneIndex: 0, laneCount: 1 })
    expect(layouts.get('task-2')).toEqual({ laneIndex: 0, laneCount: 1 })
  })

  it('splits overlapping tasks into stable lanes inside the same day column', () => {
    const layouts = buildWeekTaskLaneLayout([
      makeTask('task-1', '2026-04-14T09:00:00.000Z', 60),
      makeTask('task-2', '2026-04-14T09:15:00.000Z', 45),
      makeTask('task-3', '2026-04-14T09:30:00.000Z', 30),
    ])

    expect(layouts.get('task-1')).toEqual({ laneIndex: 0, laneCount: 3 })
    expect(layouts.get('task-2')).toEqual({ laneIndex: 1, laneCount: 3 })
    expect(layouts.get('task-3')).toEqual({ laneIndex: 2, laneCount: 3 })
  })

  it('restores full-width cards once the previous overlap cluster has ended', () => {
    const layouts = buildWeekTaskLaneLayout([
      makeTask('task-1', '2026-04-14T09:00:00.000Z', 30),
      makeTask('task-2', '2026-04-14T09:10:00.000Z', 10),
      makeTask('task-3', '2026-04-14T09:30:00.000Z', 20),
    ])

    expect(layouts.get('task-1')).toEqual({ laneIndex: 0, laneCount: 2 })
    expect(layouts.get('task-2')).toEqual({ laneIndex: 1, laneCount: 2 })
    expect(layouts.get('task-3')).toEqual({ laneIndex: 0, laneCount: 1 })
  })
})
