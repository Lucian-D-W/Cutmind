import { format } from 'date-fns'
import { monitorError, monitorEvent } from '../monitoring/runtimeMonitor'
import { getRuntimeBridge } from '../platform/runtime'
import type { AppLanguage, Task } from '../types'
import { exportDayJournal } from './export'
import { getTaskStart } from './taskMeta'

const DAILY_JOURNAL_SYNC_DEBOUNCE_MS = 650

let syncTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncedDateKeys = new Set<string>()

export interface DailyJournalSyncRequest {
  tasks: Task[]
  folderPath: string
  language: AppLanguage
}

export type DailyJournalSyncResult =
  | { skipped: true; reason: 'missing_folder' | 'browser_runtime' }
  | { skipped: false; writtenPaths: string[] }

function getTaskDateKey(task: Pick<Task, 'focusRecords' | 'startTime' | 'createdAt'>) {
  return format(getTaskStart(task), 'yyyy-MM-dd')
}

export function getDailyJournalSyncDateKeys(tasks: Task[]) {
  return new Set(tasks.map(getTaskDateKey))
}

export async function syncDailyJournalFilesNow(
  request: DailyJournalSyncRequest,
): Promise<DailyJournalSyncResult> {
  const folderPath = request.folderPath.trim()
  if (!folderPath) {
    lastSyncedDateKeys = new Set()
    return { skipped: true, reason: 'missing_folder' }
  }

  const runtimeBridge = getRuntimeBridge()
  if (runtimeBridge.kind === 'browser') {
    return { skipped: true, reason: 'browser_runtime' }
  }

  const currentDateKeys = getDailyJournalSyncDateKeys(request.tasks)
  const dateKeys = Array.from(new Set([...lastSyncedDateKeys, ...currentDateKeys])).sort()
  const writtenPaths: string[] = []

  for (const dateKey of dateKeys) {
    const journal = exportDayJournal(request.tasks, dateKey, request.language)
    const result = await runtimeBridge.backend.invoke<string>('write_daily_journal_file', {
      folderPath,
      fileName: journal.fileName,
      content: journal.content,
    })

    if (!result.ok) {
      throw new Error(result.message)
    }

    writtenPaths.push(result.value)
  }

  lastSyncedDateKeys = currentDateKeys
  return { skipped: false, writtenPaths }
}

export function scheduleDailyJournalSync(request: DailyJournalSyncRequest) {
  if (syncTimer) {
    clearTimeout(syncTimer)
  }

  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncDailyJournalFilesNow(request)
      .then(result => {
        if (result.skipped) return
        monitorEvent('daily-journal-sync', 'written', {
          count: result.writtenPaths.length,
        })
      })
      .catch(error => {
        monitorError('daily-journal-sync', error, {
          folderPath: request.folderPath,
          taskCount: request.tasks.length,
        })
      })
  }, DAILY_JOURNAL_SYNC_DEBOUNCE_MS)
}

export function resetDailyJournalSyncForTests() {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  lastSyncedDateKeys = new Set()
}
