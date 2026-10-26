import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../types'
import {
  resetDailyJournalSyncForTests,
  syncDailyJournalFilesNow,
} from './dailyJournalSync'

const runtimeMock = vi.hoisted(() => ({
  bridge: {
    kind: 'tauri',
    backend: {
      invoke: vi.fn(),
    },
  },
}))

vi.mock('../platform/runtime', () => ({
  getRuntimeBridge: () => runtimeMock.bridge,
}))

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write notes',
    body: 'Body text',
    color: '#ff9900',
    opacity: 0.9,
    isPinned: false,
    showResetButton: false,
    tags: [],
    timerMinutes: 25,
    elapsedSeconds: 0,
    isRunning: false,
    isCompleted: false,
    isPlanningNextTask: false,
    isResting: false,
    restSeconds: 300,
    nextTaskDraft: null,
    nextStepMode: null,
    focusRecords: [],
    startTime: '2026-04-25T02:00:00.000Z',
    endTime: null,
    titleFontSize: 15,
    titleFontFamily: 'default',
    titleFontColor: '#fff',
    bodyFontSize: 14,
    bodyFontFamily: 'default',
    bodyFontColor: '#fff',
    fontColor: '#fff',
    createdAt: '2026-04-25T01:30:00.000Z',
    completedAt: null,
    windowState: null,
    ...overrides,
  }
}

describe('dailyJournalSync', () => {
  beforeEach(() => {
    resetDailyJournalSyncForTests()
    runtimeMock.bridge.kind = 'tauri'
    runtimeMock.bridge.backend.invoke.mockReset()
    runtimeMock.bridge.backend.invoke.mockResolvedValue({
      ok: true,
      value: 'C:\\journals\\2026-04-25.md',
    })
  })

  it('skips when no journal folder is configured', async () => {
    const result = await syncDailyJournalFilesNow({
      tasks: [createTask()],
      folderPath: '   ',
      language: 'zh-CN',
    })

    expect(result).toEqual({ skipped: true, reason: 'missing_folder' })
    expect(runtimeMock.bridge.backend.invoke).not.toHaveBeenCalled()
  })

  it('writes the current task notes to the date-named markdown file', async () => {
    const result = await syncDailyJournalFilesNow({
      tasks: [createTask()],
      folderPath: 'C:\\journals',
      language: 'zh-CN',
    })

    expect(result).toEqual({
      skipped: false,
      writtenPaths: ['C:\\journals\\2026-04-25.md'],
    })
    expect(runtimeMock.bridge.backend.invoke).toHaveBeenCalledWith('write_daily_journal_file', {
      folderPath: 'C:\\journals',
      fileName: '2026-04-25.md',
      content: expect.stringContaining('Body text'),
    })
  })

  it('rewrites a previously synced date to empty content when its last task disappears', async () => {
    await syncDailyJournalFilesNow({
      tasks: [createTask()],
      folderPath: 'C:\\journals',
      language: 'zh-CN',
    })
    runtimeMock.bridge.backend.invoke.mockClear()

    await syncDailyJournalFilesNow({
      tasks: [],
      folderPath: 'C:\\journals',
      language: 'zh-CN',
    })

    expect(runtimeMock.bridge.backend.invoke).toHaveBeenCalledWith('write_daily_journal_file', {
      folderPath: 'C:\\journals',
      fileName: '2026-04-25.md',
      content: '',
    })
  })
})
