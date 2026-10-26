import { useState, useEffect } from 'react'
import { getMonthGrid, getWeekDays, isSameMonth, isSameDay, format, startOfDay } from '../../lib/dateUtils'
import { getTaskStart } from '../../lib/taskMeta'
import { Task, type AppLanguage } from '../../types'
import { TaskBlock } from './TaskBlock'
import { ContextMenuLayer } from '../ContextMenuLayer'
import { getLocaleCopy } from '../../lib/i18n'

interface Props {
  date: Date
  tasks: Task[]
  language: AppLanguage
  weekStartsOn: 0 | 1
  onSelectTask: (id: string) => void
  onCreateTask: (date: Date) => void
}

export function MonthView({ date, tasks, language, weekStartsOn, onSelectTask, onCreateTask }: Props) {
  const copy = getLocaleCopy(language)
  const days = getMonthGrid(date, weekStartsOn)
  const weekDays = getWeekDays(weekStartsOn, language)
  const today = startOfDay(new Date())
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, date: Date } | null>(null)
  const rowCount = Math.ceil(days.length / 7)
  const weeks = Array.from({ length: rowCount }, (_, index) => days.slice(index * 7, index * 7 + 7))

  useEffect(() => {
    const hideMenu = () => setContextMenu(null)
    window.addEventListener('click', hideMenu)
    return () => window.removeEventListener('click', hideMenu)
  }, [])

  function tasksForDay(day: Date): Task[] {
    return tasks.filter(t => {
      const scheduledDay = startOfDay(getTaskStart(t))
      return isSameDay(scheduledDay, day)
    })
  }

  const handleContextMenu = (e: React.MouseEvent, day: Date) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, date: day })
  }

  return (
    <div style={{
      padding: 12,
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}>
      {/* Week day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {weekDays.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 600,
            color: 'var(--calendar-muted-text)', padding: '6px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
      }}>
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            data-week-row
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, date)
              const isToday = isSameDay(day, today)
              const dayTasks = tasksForDay(day)

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  data-day-cell
                  onDoubleClick={() => onCreateTask(day)}
                  onContextMenu={(e) => handleContextMenu(e, day)}
                  style={{
                    minHeight: 92,
                    padding: 4,
                    borderRadius: 0,
                    cursor: 'pointer',
                    background: isToday
                      ? 'var(--calendar-today-bg)'
                      : isCurrentMonth
                        ? 'var(--calendar-surface)'
                        : 'var(--calendar-surface-muted)',
                    border: isToday ? '1px solid var(--calendar-today-border)' : '1px solid var(--calendar-border)',
                    transition: 'background 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: 'stretch',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (!isToday) e.currentTarget.style.background = 'var(--calendar-surface-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isToday) e.currentTarget.style.background = isCurrentMonth ? 'var(--calendar-surface)' : 'var(--calendar-surface-muted)'
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 400,
                    color: isCurrentMonth ? 'var(--calendar-secondary-text)' : 'var(--calendar-muted-text)',
                    marginBottom: 3,
                    textAlign: 'right',
                    padding: '0 2px',
                    flexShrink: 0,
                  }}>
                    {format(day, 'd')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    {dayTasks.map(t => (
                      <div key={t.id} onClick={(e) => {
                        e.stopPropagation()
                        onSelectTask(t.id)
                      }}>
                        <TaskBlock task={t} onClick={() => {}} untitledLabel={copy.common.untitledTask} compact />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenuLayer
          x={contextMenu.x}
          y={contextMenu.y}
          style={{
            background: 'var(--calendar-popover-bg)',
            border: '1px solid var(--calendar-border)',
            borderRadius: 12,
            boxShadow: '0 16px 32px rgba(74,57,38,0.14)',
            padding: 4,
            minWidth: 120,
          }}
        >
          <div 
            onClick={() => onCreateTask(contextMenu.date)}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--calendar-text)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--calendar-surface-muted)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {copy.calendar.newTask}
          </div>
        </ContextMenuLayer>
      )}
    </div>
  )
}
