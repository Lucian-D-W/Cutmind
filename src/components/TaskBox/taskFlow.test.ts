import { describe, expect, it } from 'vitest'
import { appendTaskBody, createNextTaskDraft, finishTaskFocus, getMinimumRestMinutes, getPlannedRestMinutes, startTaskFocus } from './taskFlow'
import type { Task } from '../../types'

describe('taskFlow', () => {
  it('does not require forced rest for tasks shorter than 20 minutes', () => {
    expect(getMinimumRestMinutes(19)).toBe(0)
  })

  it('requires at least 5 minutes of rest for 20-49 minute tasks', () => {
    expect(getMinimumRestMinutes(20)).toBe(5)
    expect(getMinimumRestMinutes(49)).toBe(5)
  })

  it('requires at least 10 minutes of rest for tasks of 50 minutes or more', () => {
    expect(getMinimumRestMinutes(50)).toBe(10)
    expect(getMinimumRestMinutes(120)).toBe(10)
  })

  it('uses the greater of the default rest and forced minimum', () => {
    expect(getPlannedRestMinutes(20, 5)).toBe(5)
    expect(getPlannedRestMinutes(50, 5)).toBe(10)
    expect(getPlannedRestMinutes(80, 15)).toBe(15)
  })

  it('prefills the current title when continuing the same task', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Current',
      body: 'Current body',
      color: '#000000',
      opacity: 1,
      isPinned: true,
      showResetButton: false,
      tags: [],
      timerMinutes: 50,
      elapsedSeconds: 50 * 60,
      isRunning: false,
      isCompleted: true,
      isPlanningNextTask: true,
      isResting: false,
      restSeconds: 5 * 60,
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
      createdAt: '2026-04-06T00:00:00.000Z',
      completedAt: '2026-04-06T01:00:00.000Z',
      windowState: null,
    }

    expect(createNextTaskDraft(task, 'continue')).toEqual({
      title: 'Current',
      body: '',
      restMinutes: 10,
      minimumRestMinutes: 10,
    })
  })

  it('keeps the title empty when the user plans to retitle or open a new task', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Current',
      body: 'Current body',
      color: '#000000',
      opacity: 1,
      isPinned: true,
      showResetButton: false,
      tags: [],
      timerMinutes: 50,
      elapsedSeconds: 50 * 60,
      isRunning: false,
      isCompleted: false,
      isPlanningNextTask: true,
      isResting: false,
      restSeconds: 5 * 60,
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
      createdAt: '2026-04-06T00:00:00.000Z',
      completedAt: null,
      windowState: null,
    }

    expect(createNextTaskDraft(task, 'retitle')).toEqual({
      title: '',
      body: '',
      restMinutes: 10,
      minimumRestMinutes: 10,
    })

    expect(createNextTaskDraft(task, 'new-task')).toEqual({
      title: '',
      body: '',
      restMinutes: 10,
      minimumRestMinutes: 10,
    })
  })

  it('starts a new focus record and syncs the overall start and planned end', () => {
    const patch = startTaskFocus({
      focusRecords: [],
      startTime: null,
      timerMinutes: 25,
    }, '2026-04-13T01:00:00.000Z')

    expect(patch).toEqual({
      focusRecords: [
        { startedAt: '2026-04-13T01:00:00.000Z', endedAt: null },
      ],
      startTime: '2026-04-13T01:00:00.000Z',
      endTime: '2026-04-13T01:25:00.000Z',
    })
  })

  it('closes the active focus record and pins the overall end to the actual stop time', () => {
    const patch = finishTaskFocus({
      focusRecords: [
        { startedAt: '2026-04-13T01:00:00.000Z', endedAt: null },
      ],
      startTime: '2026-04-13T01:00:00.000Z',
    }, '2026-04-13T01:23:00.000Z')

    expect(patch).toEqual({
      focusRecords: [
        { startedAt: '2026-04-13T01:00:00.000Z', endedAt: '2026-04-13T01:23:00.000Z' },
      ],
      startTime: '2026-04-13T01:00:00.000Z',
      endTime: '2026-04-13T01:23:00.000Z',
    })
  })

  it('appends new body text under the existing notes for continued tasks', () => {
    expect(appendTaskBody('Old note', 'New follow-up')).toBe('Old note\n\nNew follow-up')
  })

  it('uses the new body as-is when the task had no previous notes', () => {
    expect(appendTaskBody('', 'Fresh note')).toBe('Fresh note')
  })
})
