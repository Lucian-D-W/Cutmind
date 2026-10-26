import { describe, expect, it } from 'vitest'
import { countDayJournalTasks, exportDayJournal, exportToJSON, exportToJSONL, exportToMarkdown } from './export'
import type { Task } from '../types'

const sampleTask: Task = {
  id: 'task-1',
  title: 'Write notes',
  body: 'Body text',
  color: '#ff9900',
  opacity: 0.9,
  isPinned: true,
  showResetButton: false,
  tags: ['writing', 'calendar'],
  timerMinutes: 25,
  elapsedSeconds: 0,
  isRunning: false,
  isCompleted: false,
  isPlanningNextTask: false,
  isResting: false,
  restSeconds: 300,
  nextTaskDraft: null,
  nextStepMode: null,
  focusRecords: [
    { startedAt: '2026-04-07T01:00:00.000Z', endedAt: '2026-04-07T01:25:00.000Z' },
  ],
  startTime: '2026-04-07T01:00:00.000Z',
  endTime: '2026-04-07T01:25:00.000Z',
  titleFontSize: 15,
  titleFontFamily: 'default',
  titleFontColor: '#fff',
  bodyFontSize: 14,
  bodyFontFamily: 'default',
  bodyFontColor: '#fff',
  fontColor: '#fff',
  createdAt: '2026-04-07T00:30:00.000Z',
  completedAt: null,
  windowState: null,
}

describe('export', () => {
  it('serializes calendar-linked schedule data into JSON exports', () => {
    const exported = JSON.parse(exportToJSON([sampleTask]))
    expect(exported[0]).toMatchObject({
      id: 'task-1',
      scheduledDate: '2026-04-07',
      scheduledStart: '2026-04-07T01:00:00.000Z',
      scheduledEnd: '2026-04-07T01:25:00.000Z',
      durationMinutes: 25,
      focusRecords: [
        { startedAt: '2026-04-07T01:00:00.000Z', endedAt: '2026-04-07T01:25:00.000Z' },
      ],
      status: 'paused',
    })
  })

  it('serializes one enriched record per line for JSONL', () => {
    const [line] = exportToJSONL([sampleTask]).split('\n')
    expect(JSON.parse(line)).toMatchObject({
      title: 'Write notes',
      tags: ['writing', 'calendar'],
      scheduledStart: '2026-04-07T01:00:00.000Z',
    })
  })

  it('includes schedule metadata in markdown exports', () => {
    const exported = exportToMarkdown([sampleTask])
    expect(exported).toContain('- Date: 2026-04-07')
    expect(exported).toContain('- Start: 2026-04-07T01:00:00.000Z')
    expect(exported).toContain('- End: 2026-04-07T01:25:00.000Z')
    expect(exported).toContain('- Tags: writing, calendar')
  })

  it('builds a daily journal file for the selected start date only', () => {
    const exported = exportDayJournal([
      sampleTask,
      {
        ...sampleTask,
        id: 'task-2',
        title: 'Another task',
        createdAt: '2026-04-08T00:10:00.000Z',
        startTime: '2026-04-08T01:00:00.000Z',
        endTime: '2026-04-08T01:45:00.000Z',
        focusRecords: [{ startedAt: '2026-04-08T01:00:00.000Z', endedAt: '2026-04-08T01:45:00.000Z' }],
      },
    ], '2026-04-07', 'zh-CN')

    expect(exported).toMatchObject({
      fileName: '2026-04-07.md',
    })
    expect(exported?.content).toContain('# Write notes')
    expect(exported?.content).not.toContain('# Another task')
  })

  it('orders daily journal sections from early to late', () => {
    const exported = exportDayJournal([
      {
        ...sampleTask,
        id: 'task-late',
        title: 'Late task',
        createdAt: '2026-04-07T02:00:00.000Z',
        startTime: '2026-04-07T03:00:00.000Z',
        endTime: '2026-04-07T03:25:00.000Z',
        focusRecords: [{ startedAt: '2026-04-07T03:00:00.000Z', endedAt: '2026-04-07T03:25:00.000Z' }],
      },
      sampleTask,
    ], '2026-04-07', 'en')

    expect(exported?.content.indexOf('# Write notes')).toBeLessThan(exported?.content.indexOf('# Late task') ?? 0)
  })

  it('demotes markdown headings in task bodies by one level', () => {
    const exported = exportDayJournal([
      {
        ...sampleTask,
        body: '# Main heading\n## Sub heading\nRegular paragraph',
      },
    ], '2026-04-07', 'zh-CN')

    expect(exported?.content).toContain('## Main heading')
    expect(exported?.content).toContain('### Sub heading')
    expect(exported?.content).toContain('Regular paragraph')
  })

  it('still returns an empty journal file when the selected date has no tasks', () => {
    const exported = exportDayJournal([sampleTask], '2026-04-09', 'zh-CN')
    expect(exported).toMatchObject({
      fileName: '2026-04-09.md',
      content: '',
    })
  })

  it('counts the tasks matched to the selected journal date', () => {
    expect(countDayJournalTasks([sampleTask], '2026-04-07')).toBe(1)
    expect(countDayJournalTasks([sampleTask], '2026-04-09')).toBe(0)
  })
})
