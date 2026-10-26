import { describe, expect, it } from 'vitest'
import { buildTimerPatch, getTaskDurationMinutes, getTaskEnd, getTaskFocusHistory, getTaskFocusMinutes, getTaskStart, getTaskStatusKey, normalizeTags, parseTagInput } from './taskMeta'

describe('taskMeta', () => {
  it('prefers startTime over createdAt for task start', () => {
    const start = getTaskStart({
      focusRecords: [{ startedAt: '2026-04-08T02:00:00.000Z', endedAt: '2026-04-08T02:25:00.000Z' }],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: '2026-04-08T01:30:00.000Z',
    })

    expect(start.toISOString()).toBe('2026-04-08T01:30:00.000Z')
  })

  it('falls back to createdAt when startTime is missing', () => {
    const start = getTaskStart({
      focusRecords: [],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: null,
    })

    expect(start.toISOString()).toBe('2026-04-07T00:00:00.000Z')
  })

  it('uses explicit endTime when present', () => {
    const end = getTaskEnd({
      focusRecords: [{ startedAt: '2026-04-08T01:30:00.000Z', endedAt: '2026-04-08T02:10:00.000Z' }],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: '2026-04-08T01:30:00.000Z',
      endTime: '2026-04-08T02:15:00.000Z',
      timerMinutes: 25,
    })

    expect(end?.toISOString()).toBe('2026-04-08T02:15:00.000Z')
  })

  it('derives endTime from startTime and timerMinutes when needed', () => {
    const end = getTaskEnd({
      focusRecords: [],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: '2026-04-08T01:30:00.000Z',
      endTime: null,
      timerMinutes: 25,
    })

    expect(end?.toISOString()).toBe('2026-04-08T01:55:00.000Z')
  })

  it('derives duration from explicit schedule when available', () => {
    expect(getTaskDurationMinutes({
      createdAt: '2026-04-07T00:00:00.000Z',
      focusRecords: [],
      startTime: '2026-04-08T01:30:00.000Z',
      endTime: '2026-04-08T02:15:00.000Z',
      timerMinutes: 25,
    })).toBe(45)
  })

  it('falls back to focus records when display times are missing', () => {
    const start = getTaskStart({
      focusRecords: [{ startedAt: '2026-04-08T03:00:00.000Z', endedAt: '2026-04-08T03:20:00.000Z' }],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: null,
    })

    const end = getTaskEnd({
      focusRecords: [{ startedAt: '2026-04-08T03:00:00.000Z', endedAt: '2026-04-08T03:20:00.000Z' }],
      createdAt: '2026-04-07T00:00:00.000Z',
      startTime: null,
      endTime: null,
      timerMinutes: 25,
    })

    expect(start.toISOString()).toBe('2026-04-08T03:00:00.000Z')
    expect(end?.toISOString()).toBe('2026-04-08T03:20:00.000Z')
  })

  it('sums concrete focus records into total focus minutes', () => {
    expect(getTaskFocusMinutes({
      focusRecords: [
        { startedAt: '2026-04-08T01:30:00.000Z', endedAt: '2026-04-08T01:55:00.000Z' },
        { startedAt: '2026-04-08T02:05:00.000Z', endedAt: '2026-04-08T02:20:00.000Z' },
      ],
      elapsedSeconds: 0,
    })).toBe(40)
  })

  it('builds display rows for detailed focus history', () => {
    expect(getTaskFocusHistory({
      focusRecords: [
        { startedAt: '2026-04-08T01:30:00.000Z', endedAt: '2026-04-08T01:55:00.000Z' },
        { startedAt: '2026-04-08T02:05:00.000Z', endedAt: null },
      ],
      elapsedSeconds: 10 * 60,
    })).toEqual([
      {
        startedAt: new Date('2026-04-08T01:30:00.000Z'),
        endedAt: new Date('2026-04-08T01:55:00.000Z'),
        durationMinutes: 25,
      },
      {
        startedAt: new Date('2026-04-08T02:05:00.000Z'),
        endedAt: null,
        durationMinutes: 10,
      },
    ])
  })

  it('keeps timer and end time in sync when startTime exists', () => {
    expect(buildTimerPatch({
      focusRecords: [],
      startTime: '2026-04-08T01:30:00.000Z',
      endTime: '2026-04-08T01:55:00.000Z',
      timerMinutes: 25,
    }, 40)).toEqual({
      timerMinutes: 40,
      endTime: '2026-04-08T02:10:00.000Z',
    })
  })

  it('normalizes and deduplicates tags', () => {
    expect(normalizeTags([' work ', 'health', 'Work', '', 'deep  focus '])).toEqual([
      'work',
      'health',
      'deep focus',
    ])
  })

  it('parses comma input into normalized tags', () => {
    expect(parseTagInput('work, health, Work, , deep  focus')).toEqual([
      'work',
      'health',
      'deep focus',
    ])
  })

  it('treats a task with recorded work but no completion as paused', () => {
    expect(getTaskStatusKey({
      focusRecords: [{ startedAt: '2026-04-08T01:30:00.000Z', endedAt: '2026-04-08T01:55:00.000Z' }],
      elapsedSeconds: 0,
      startTime: '2026-04-08T01:30:00.000Z',
      endTime: '2026-04-08T01:55:00.000Z',
      isCompleted: false,
      isRunning: false,
      isResting: false,
      isPlanningNextTask: false,
    })).toBe('paused')
  })
})
