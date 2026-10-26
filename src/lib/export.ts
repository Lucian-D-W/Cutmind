import { format } from 'date-fns'
import { Task, type AppLanguage } from '../types'
import { formatDateTimeLabel, getDateLocale, getLocaleCopy, replaceTemplate } from './i18n'
import { getTaskDurationMinutes, getTaskEnd, getTaskFocusMinutes, getTaskStart, getTaskStatusKey } from './taskMeta'

function serializeTaskForExport(task: Task) {
  const scheduledStart = getTaskStart(task)
  const scheduledEnd = getTaskEnd(task)
  const durationMinutes = getTaskDurationMinutes(task)
  const status = getTaskStatusKey(task)

  return {
    id: task.id,
    title: task.title || 'Untitled',
    body: task.body,
    tags: task.tags,
    status,
    timerMinutes: task.timerMinutes,
    durationMinutes,
    focusMinutes: getTaskFocusMinutes(task),
    elapsedSeconds: task.elapsedSeconds,
    isRunning: task.isRunning,
    isCompleted: task.isCompleted,
    isResting: task.isResting,
    isPlanningNextTask: task.isPlanningNextTask,
    nextStepMode: task.nextStepMode,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    scheduledDate: scheduledStart.toISOString().slice(0, 10),
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd?.toISOString() ?? null,
    startTime: task.startTime,
    endTime: task.endTime,
    focusRecords: task.focusRecords,
    color: task.color,
    opacity: task.opacity,
    titleFontSize: task.titleFontSize,
    titleFontFamily: task.titleFontFamily,
    titleFontColor: task.titleFontColor,
    bodyFontSize: task.bodyFontSize,
    bodyFontFamily: task.bodyFontFamily,
    bodyFontColor: task.bodyFontColor,
  }
}

export function exportToJSONL(tasks: Task[]): string {
  return tasks.map(t => JSON.stringify(serializeTaskForExport(t))).join('\n')
}

export function exportToJSON(tasks: Task[]): string {
  return JSON.stringify(tasks.map(serializeTaskForExport), null, 2)
}

export function exportToMarkdown(tasks: Task[]): string {
  return tasks.map(t => {
    const data = serializeTaskForExport(t)
    const time = data.durationMinutes > 0 ? ` (${data.durationMinutes}min)` : ''
    const tags = data.tags.length ? `\n- Tags: ${data.tags.join(', ')}` : ''
    const endTime = data.scheduledEnd ? `\n- End: ${data.scheduledEnd}` : ''
    return `## [${data.status}] ${data.title}${time}\n\n- Date: ${data.scheduledDate}\n- Start: ${data.scheduledStart}${endTime}${tags}\n\n${data.body}\n\n---`
  }).join('\n\n')
}

export interface DailyJournalExport {
  fileName: string
  content: string
}

function getJournalDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function compareTasksByJournalOrder(a: Task, b: Task): number {
  const startDiff = getTaskStart(a).getTime() - getTaskStart(b).getTime()
  if (startDiff !== 0) return startDiff
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

function getJournalTasksForDate(tasks: Task[], dateKey: string): Task[] {
  return tasks
    .filter(task => getJournalDateKey(getTaskStart(task)) === dateKey)
    .sort(compareTasksByJournalOrder)
}

function demoteMarkdownHeadings(markdown: string): string {
  let inFence = false

  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => {
      const trimmed = line.trimStart()
      if (/^(```|~~~)/.test(trimmed)) {
        inFence = !inFence
        return line
      }

      if (inFence) return line

      const headingMatch = line.match(/^(\s{0,3})(#{1,6})(\s+.*)$/)
      if (!headingMatch) return line

      const [, indent, hashes, rest] = headingMatch
      return `${indent}${'#'.repeat(Math.min(6, hashes.length + 1))}${rest}`
    })
    .join('\n')
}

function getTaskStatusLabel(task: Task, language: AppLanguage): string {
  const copy = getLocaleCopy(language)
  return copy.taskDetail.status[getTaskStatusKey(task)]
}

function buildJournalTaskSection(task: Task, language: AppLanguage): string {
  const copy = getLocaleCopy(language)
  const start = getTaskStart(task)
  const end = getTaskEnd(task)
  const durationMinutes = getTaskDurationMinutes(task)
  const focusMinutes = getTaskFocusMinutes(task)
  const timeLabel = end
    ? `${format(start, 'HH:mm', { locale: getDateLocale(language) })} - ${format(end, 'HH:mm', { locale: getDateLocale(language) })}`
    : format(start, 'HH:mm', { locale: getDateLocale(language) })
  const body = demoteMarkdownHeadings(task.body.trim())
  const metadataLines = [
    `- ${copy.journal.time}: ${timeLabel}`,
    `- ${copy.journal.duration}: ${replaceTemplate(copy.common.minutesShort, { minutes: durationMinutes })}`,
    `- ${copy.journal.focus}: ${replaceTemplate(copy.common.minutesShort, { minutes: focusMinutes })}`,
    `- ${copy.journal.status}: ${getTaskStatusLabel(task, language)}`,
    `- ${copy.journal.createdAt}: ${formatDateTimeLabel(new Date(task.createdAt), language)}`,
  ]

  if (task.tags.length > 0) {
    metadataLines.push(`- ${copy.journal.tags}: ${task.tags.join(', ')}`)
  }

  return [
    `# ${task.title || copy.common.untitledTask}`,
    ...metadataLines,
    ...(body ? ['', body] : []),
  ].join('\n')
}

export function exportDayJournal(tasks: Task[], dateKey: string, language: AppLanguage): DailyJournalExport {
  const dailyTasks = getJournalTasksForDate(tasks, dateKey)

  return {
    fileName: `${dateKey}.md`,
    content: dailyTasks.map(task => buildJournalTaskSection(task, language)).join('\n\n---\n\n'),
  }
}

export function countDayJournalTasks(tasks: Task[], dateKey: string): number {
  return getJournalTasksForDate(tasks, dateKey).length
}
