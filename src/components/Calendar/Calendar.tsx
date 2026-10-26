import { useEffect, useRef, useState } from 'react'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { TaskDetailModal } from './TaskDetailModal'
import { useTaskStore } from '../../stores/taskStore'
import { addMonths, subMonths } from '../../lib/dateUtils'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'
import { formatMonthHeading, getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { countDayJournalTasks, exportDayJournal } from '../../lib/export'
import { monitorError, monitorEvent } from '../../monitoring/runtimeMonitor'
import { getRuntimeBridge, getRuntimeKind } from '../../platform/runtime'
import { buildCalendarThemeVars } from '../../lib/calendarThemes'

type CalView = 'month' | 'week'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calView, setCalView] = useState<CalView>('month')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showJournalPanel, setShowJournalPanel] = useState(false)
  const [journalDate, setJournalDate] = useState(toDateInputValue(new Date()))
  const [journalStatus, setJournalStatus] = useState<{ kind: 'idle' | 'pending' | 'success' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  })
  const journalPanelRef = useRef<HTMLDivElement | null>(null)

  const tasks = useTaskStore(s => s.tasks)
  const createTask = useTaskStore(s => s.createTask)
  const updateTask = useTaskStore(s => s.updateTask)
  const settings = useSettingsStore(s => s.settings)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(settings.language)
  const runtimeKind = getRuntimeKind()
  const runtimeBridge = getRuntimeBridge()
  const themeVars = buildCalendarThemeVars(settings.calendarTheme)

  const handleCreateTask = async (date: Date) => {
    const id = Date.now().toString()
    await createTask(id)
    const endDate = new Date(date.getTime() + 25 * 60 * 1000)
    updateTask(id, {
      createdAt: date.toISOString(),
      startTime: date.toISOString(),
      endTime: endDate.toISOString(),
    })
    setSelectedTaskId(id)
  }

  const taskList = Object.values(tasks)
  const effectiveJournalDate = journalDate || toDateInputValue(currentDate)
  const journalTaskCount = countDayJournalTasks(taskList, effectiveJournalDate)

  useEffect(() => {
    if (!showJournalPanel) return

    const closePanel = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return
      if (journalPanelRef.current?.contains(event.target)) return
      setShowJournalPanel(false)
    }

    window.addEventListener('mousedown', closePanel)
    return () => window.removeEventListener('mousedown', closePanel)
  }, [showJournalPanel])

  const handleToggleJournalPanel = (event: React.MouseEvent) => {
    event.stopPropagation()
    setJournalDate(toDateInputValue(currentDate))
    setJournalStatus({ kind: 'idle', message: '' })
    setShowJournalPanel(open => !open)
  }

  const handleExportJournal = async () => {
    monitorEvent('calendar', 'export-journal:start', {
      date: effectiveJournalDate,
      folder: settings.dailyJournalFolder,
      matchedTaskCount: journalTaskCount,
    })

    if (!settings.dailyJournalFolder.trim()) {
      setJournalStatus({
        kind: 'error',
        message: copy.calendar.journalMissingFolderInline,
      })
      monitorEvent('calendar', 'export-journal:missing-folder', {
        date: effectiveJournalDate,
      }, 'warn')
      return
    }

    if (runtimeKind === 'browser') {
      setJournalStatus({
        kind: 'error',
        message: copy.feedback.folderPickerUnavailableInBrowser,
      })
      monitorEvent('calendar', 'export-journal:unavailable-in-browser', {
        date: effectiveJournalDate,
        href: window.location.href,
      }, 'warn')
      return
    }

    const journal = exportDayJournal(taskList, effectiveJournalDate, settings.language)
    setJournalStatus({
      kind: 'pending',
      message: copy.calendar.journalExporting,
    })

    console.info('[daily-journal-export:start]', {
      date: effectiveJournalDate,
      folder: settings.dailyJournalFolder,
      matchedTaskCount: journalTaskCount,
      fileName: journal.fileName,
      contentLength: journal.content.length,
    })

    try {
      const invokeResult = await runtimeBridge.backend.invoke<string>('write_daily_journal_file', {
        folderPath: settings.dailyJournalFolder,
        fileName: journal.fileName,
        content: journal.content,
      })

      if (!invokeResult.ok) {
        throw new Error(invokeResult.message)
      }

      const exportedPath = invokeResult.value

      console.info('[daily-journal-export:success]', {
        exportedPath,
        matchedTaskCount: journalTaskCount,
      })
      monitorEvent('calendar', 'export-journal:success', {
        exportedPath,
        matchedTaskCount: journalTaskCount,
      })
      setJournalStatus({
        kind: 'success',
        message: replaceTemplate(copy.calendar.journalSuccess, { path: exportedPath }),
      })
      pushFeedback({
        kind: 'success',
        message: replaceTemplate(copy.calendar.journalSuccess, { path: exportedPath }),
      })
      setShowJournalPanel(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      monitorError('calendar', error, {
        action: 'export-journal',
        date: effectiveJournalDate,
        folder: settings.dailyJournalFolder,
        matchedTaskCount: journalTaskCount,
      })
      console.error('[daily-journal-export:failed]', {
        date: effectiveJournalDate,
        folder: settings.dailyJournalFolder,
        matchedTaskCount: journalTaskCount,
        message,
      })
      setJournalStatus({
        kind: 'error',
        message: replaceTemplate(copy.calendar.journalFailed, { message }),
      })
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.calendar.journalFailed, { message }),
      })
    }
  }

  return (
    <div style={{
      ...themeVars,
      background: 'var(--calendar-bg)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: 'var(--calendar-text)',
    }}
      data-testid="calendar-root"
      data-calendar-theme={settings.calendarTheme}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--calendar-border)',
        background: 'var(--calendar-header-bg)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 40,
        overflow: 'visible',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))}
            style={navBtnStyle}>&lt;</button>
          <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
            {formatMonthHeading(currentDate, settings.language)}
          </h2>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
            style={navBtnStyle}>&gt;</button>
          <button onClick={() => setCurrentDate(new Date())}
            style={{ ...navBtnStyle, fontSize: 12, padding: '4px 12px' }}>{copy.calendar.today}</button>
          <div ref={journalPanelRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleToggleJournalPanel}
              style={{ ...navBtnStyle, fontSize: 12, padding: '4px 12px' }}
            >
              {copy.calendar.journal}
            </button>

            {showJournalPanel && (
              <div
                onClick={event => event.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  zIndex: 80,
                  minWidth: 248,
                  padding: 12,
                  borderRadius: 14,
                  background: 'var(--calendar-popover-bg)',
                  border: '1px solid var(--calendar-border)',
                  boxShadow: '0 18px 36px rgba(84, 58, 28, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#7a6d5d' }}>
                  <span>{copy.calendar.journalDate}</span>
                  <input
                    type="date"
                    value={journalDate}
                    onChange={event => setJournalDate(event.target.value)}
                    style={{
                      background: 'var(--calendar-surface)',
                      border: '1px solid var(--calendar-border)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      color: 'var(--calendar-text)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </label>
                <button
                  onClick={() => void handleExportJournal()}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    background: 'var(--calendar-button-active-bg)',
                    color: 'var(--calendar-button-active-text)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 12px 24px rgba(231,128,108,0.2)',
                  }}
                >
                  {copy.calendar.exportJournal}
                </button>
                {journalStatus.message && (
                  <div style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    borderRadius: 10,
                    padding: '8px 10px',
                    background: journalStatus.kind === 'error'
                      ? 'rgba(231, 128, 108, 0.12)'
                      : journalStatus.kind === 'success'
                        ? 'rgba(107, 203, 119, 0.14)'
                        : 'var(--calendar-accent-soft)',
                    color: journalStatus.kind === 'error'
                      ? '#a34835'
                      : journalStatus.kind === 'success'
                        ? '#3c7b45'
                        : 'var(--calendar-secondary-text)',
                  }}>
                    {journalStatus.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {([
            ['month', copy.calendar.month],
            ['week', copy.calendar.week],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setCalView(value)}
              style={{
                padding: '4px 14px', borderRadius: 6, border: 'none',
                background: calView === value ? 'var(--calendar-button-active-bg)' : 'var(--calendar-button-bg)',
                color: calView === value ? 'var(--calendar-button-active-text)' : 'var(--calendar-button-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: calView === value ? '0 10px 20px rgba(231,128,108,0.24)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
        {calView === 'month' ? (
          <MonthView
            date={currentDate}
            tasks={taskList}
            language={settings.language}
            weekStartsOn={settings.calendarStartDay}
            onSelectTask={setSelectedTaskId}
            onCreateTask={handleCreateTask}
          />
        ) : (
          <WeekView
            date={currentDate}
            tasks={taskList}
            language={settings.language}
            weekStartsOn={settings.calendarStartDay}
            onSelectTask={setSelectedTaskId}
            onCreateTask={handleCreateTask}
          />
        )}
      </div>

      {/* Modal overlay — must be outside overflow:hidden containers */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'var(--calendar-button-bg)',
  border: 'none',
  color: 'var(--calendar-button-text)',
  fontSize: 16,
  padding: '4px 10px',
  borderRadius: 6,
  cursor: 'pointer',
}
