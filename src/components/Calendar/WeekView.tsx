import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getWeekRange, isSameDay, format, startOfDay } from '../../lib/dateUtils'
import { getTaskDurationMinutes, getTaskEnd, getTaskStart } from '../../lib/taskMeta'
import { Task, type AppLanguage } from '../../types'
import { useTaskStore } from '../../stores/taskStore'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'
import { ContextMenuLayer } from '../ContextMenuLayer'
import { openTaskWindow } from '../../lib/taskWindows'
import { getDateLocale, getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { buildWeekTaskLaneLayout } from './weekTaskLayout'

interface Props {
  date: Date
  tasks: Task[]
  language: AppLanguage
  weekStartsOn: 0 | 1
  onSelectTask: (id: string) => void
  onCreateTask: (date: Date) => void
}

const HOUR_HEIGHT = 60
const TIME_COLUMN_WIDTH = 60
const RESIZE_HANDLE = 8

type DragMode = 'move' | 'resize-top' | 'resize-bottom'

interface DragState {
  taskId: string
  mode: DragMode
  startX: number
  startY: number
  origTop: number
  origHeight: number
  origDayIndex: number
}

type CtxTarget =
  | { kind: 'blank'; date: Date; x: number; y: number }
  | { kind: 'task'; taskId: string; x: number; y: number }

export function WeekView({ date, tasks, language, weekStartsOn, onSelectTask, onCreateTask }: Props) {
  const days = getWeekRange(date, weekStartsOn)
  const today = startOfDay(new Date())
  const copy = getLocaleCopy(language)
  const dateLocale = getDateLocale(language)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const updateTask = useTaskStore(s => s.updateTask)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)

  const [contextMenu, setContextMenu] = useState<CtxTarget | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragTop, setDragTop] = useState(0)
  const [dragHeight, setDragHeight] = useState(0)
  const [dragDayOffset, setDragDayOffset] = useState(0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT
    }
  }, [])

  function getTaskTime(task: Task): Date {
    return getTaskStart(task)
  }

  function tasksForDay(day: Date): Task[] {
    return tasks.filter(t => {
      const time = startOfDay(getTaskTime(t))
      return isSameDay(time, day)
    })
  }

  function taskTop(task: Task): number {
    const time = getTaskTime(task)
    return (time.getHours() + time.getMinutes() / 60) * HOUR_HEIGHT
  }

  function taskHeight(task: Task): number {
    const start = getTaskStart(task)
    const end = getTaskEnd(task)
    if (end) {
      const s = start
      const e = end
      const diffH = (e.getTime() - s.getTime()) / 3600000
      return Math.max(diffH * HOUR_HEIGHT, 24)
    }
    return Math.max((task.timerMinutes / 60) * HOUR_HEIGHT, 24)
  }

  function getDayIndex(day: Date): number {
    return days.findIndex(d => isSameDay(d, day))
  }

  // Right-click on blank space
  const handleBlankContextMenu = (day: Date, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMin = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15
    const hour = Math.floor(totalMin / 60)
    const minute = totalMin % 60
    const newDate = new Date(day)
    newDate.setHours(hour, minute, 0, 0)
    setContextMenu({ kind: 'blank', date: newDate, x: e.clientX, y: e.clientY })
  }

  // Right-click on task
  const handleTaskContextMenu = (taskId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ kind: 'task', taskId, x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => setContextMenu(null)

  useEffect(() => {
    const handleClick = () => closeContextMenu()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Determine drag mode from mouse Y relative to task element
  const getDragMode = (e: React.MouseEvent, _top: number, _height: number): DragMode => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relY = e.clientY - rect.top
    if (relY <= RESIZE_HANDLE) return 'resize-top'
    if (relY >= rect.height - RESIZE_HANDLE) return 'resize-bottom'
    return 'move'
  }

  const handleDragStart = useCallback((
    taskId: string, day: Date, top: number, height: number, mode: DragMode, e: React.MouseEvent
  ) => {
    e.stopPropagation()
    e.preventDefault()
    const dayIdx = getDayIndex(day)
    setDragState({
      taskId, mode,
      startX: e.clientX, startY: e.clientY,
      origTop: top, origHeight: height,
      origDayIndex: dayIdx,
    })
    setDragTop(top)
    setDragHeight(height)
    setDragDayOffset(0)
  }, [days])

  // Column width for cross-day dragging
  function getColumnWidth(): number {
    if (!gridRef.current) return 100
    return gridRef.current.clientWidth / days.length
  }

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - dragState.startY
      const dx = e.clientX - dragState.startX

      if (dragState.mode === 'move') {
        const newTop = Math.max(0, Math.min(dragState.origTop + dy, 24 * HOUR_HEIGHT - 24))
        setDragTop(newTop)
        // Cross-day offset
        const colW = getColumnWidth()
        const dayOff = Math.round(dx / colW)
        setDragDayOffset(dayOff)
      } else if (dragState.mode === 'resize-top') {
        const newTop = Math.max(0, dragState.origTop + dy)
        const newHeight = Math.max(24, dragState.origHeight - dy)
        setDragTop(newTop)
        setDragHeight(newHeight)
      } else if (dragState.mode === 'resize-bottom') {
        const newHeight = Math.max(24, dragState.origHeight + dy)
        setDragHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      const task = tasks.find(t => t.id === dragState.taskId)
      if (!task) { setDragState(null); return }

      const snap = (px: number) => {
        const totalMin = Math.round((px / HOUR_HEIGHT) * 60 / 15) * 15
        return totalMin
      }

      if (dragState.mode === 'move') {
        const startMin = snap(dragTop)
        const h = Math.floor(startMin / 60)
        const m = startMin % 60
        const newDayIdx = Math.max(0, Math.min(dragState.origDayIndex + dragDayOffset, days.length - 1))
        const newStart = new Date(days[newDayIdx])
        newStart.setHours(h, m, 0, 0)

        const patch: Partial<Task> = { startTime: newStart.toISOString() }
        const durationMinutes = getTaskDurationMinutes(task)
        patch.timerMinutes = durationMinutes
        if (task.startTime || task.endTime) {
          patch.endTime = new Date(newStart.getTime() + durationMinutes * 60 * 1000).toISOString()
        }
        updateTask(dragState.taskId, patch)
      } else if (dragState.mode === 'resize-top') {
        const startMin = snap(dragTop)
        const h = Math.floor(startMin / 60)
        const m = startMin % 60
        const newStart = new Date(task.startTime ? new Date(task.startTime) : new Date(task.createdAt))
        newStart.setHours(h, m, 0, 0)
        const endBase = task.endTime ? new Date(task.endTime) : new Date(newStart.getTime() + task.timerMinutes * 60 * 1000)
        const nextMinutes = Math.max(1, Math.round((endBase.getTime() - newStart.getTime()) / 60000))
        updateTask(dragState.taskId, {
          startTime: newStart.toISOString(),
          endTime: new Date(newStart.getTime() + nextMinutes * 60 * 1000).toISOString(),
          timerMinutes: nextMinutes,
        })
      } else if (dragState.mode === 'resize-bottom') {
        const endMin = snap(dragTop + dragHeight)
        const h = Math.floor(endMin / 60)
        const m = endMin % 60
        const base = task.startTime ? new Date(task.startTime) : new Date(task.createdAt)
        const newEnd = new Date(base)
        newEnd.setHours(h, m, 0, 0)
        if (newEnd.getTime() <= base.getTime()) {
          newEnd.setTime(base.getTime() + 15 * 60 * 1000)
        }
        updateTask(dragState.taskId, {
          endTime: newEnd.toISOString(),
          timerMinutes: Math.max(1, Math.round((newEnd.getTime() - base.getTime()) / 60000)),
        })
      }

      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dragTop, dragHeight, dragDayOffset, tasks, updateTask, days])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--calendar-bg)',
      color: 'var(--calendar-text)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <div style={{
        display: 'flex',
        marginLeft: TIME_COLUMN_WIDTH,
        borderBottom: '1px solid var(--calendar-border)',
        background: 'var(--calendar-header-bg)',
        zIndex: 10
      }}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} style={{
              flex: 1,
              padding: '12px 0',
              textAlign: 'center',
              borderLeft: i === 0 ? 'none' : '1px solid var(--calendar-border)',
              background: isToday ? 'var(--calendar-today-bg)' : 'transparent'
            }}>
              <div style={{ fontSize: 12, color: 'var(--calendar-muted-text)', marginBottom: 4 }}>
                {format(day, 'EEE', { locale: dateLocale })}
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: isToday ? 'var(--calendar-accent)' : 'var(--calendar-text)'
              }}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable Area */}
      <div
        ref={scrollRef}
        data-testid="week-scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
          position: 'relative',
          display: 'flex'
        }}
      >
        {/* Time Axis */}
        <div style={{
          width: TIME_COLUMN_WIDTH,
          flexShrink: 0,
          background: 'var(--calendar-time-axis-bg)',
          borderRight: '1px solid var(--calendar-border)'
        }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} style={{
              height: HOUR_HEIGHT,
              position: 'relative',
              fontSize: 11,
              color: 'var(--calendar-muted-text)',
              textAlign: 'right',
              paddingRight: 8
            }}>
              <span style={{ position: 'absolute', top: -6, right: 8 }}>
                {h === 0 ? '0:00' : `${h}:00`}
              </span>
            </div>
          ))}
        </div>

        {/* Grid Columns */}
        <div ref={gridRef} style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {/* Horizontal lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} style={{
                height: HOUR_HEIGHT,
                borderBottom: '1px solid var(--calendar-border)'
              }} />
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const isToday = isSameDay(day, today)
            const dayTasks = tasksForDay(day)
            const dayTaskLaneLayout = buildWeekTaskLaneLayout(dayTasks)

            return (
              <div
                key={dayIndex}
                onContextMenu={(e) => {
                  if (e.target === e.currentTarget) {
                    handleBlankContextMenu(day, e)
                  }
                }}
                style={{
                  flex: 1,
                  position: 'relative',
                  borderLeft: dayIndex === 0 ? 'none' : '1px solid var(--calendar-border)',
                  background: isToday ? 'var(--calendar-accent-soft)' : 'var(--calendar-surface)',
                  height: 24 * HOUR_HEIGHT,
                  minWidth: 0,
                }}
              >
                {dayTasks.map(task => {
                  const isDragging = dragState?.taskId === task.id
                  const tTop = isDragging ? dragTop : taskTop(task)
                  const tHeight = isDragging ? dragHeight : taskHeight(task)
                  const laneLayout = dayTaskLaneLayout.get(task.id) ?? { laneIndex: 0, laneCount: 1 }
                  const laneWidthPercent = 100 / Math.max(1, laneLayout.laneCount)
                  const durationMinutes = getTaskDurationMinutes(task)
                  const durationLabel = replaceTemplate(copy.common.minutesShort, { minutes: durationMinutes })
                  const bodyPreview = task.body
                    .replace(/[#>*`_-]/g, ' ')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                    .replace(/\s+/g, ' ')
                    .trim()

                  const taskStart = getTaskStart(task)
                  const taskEnd = getTaskEnd(task)
                  const timeLabel = `${format(taskStart, 'HH:mm')}${taskEnd ? ' - ' + format(taskEnd, 'HH:mm') : ''}`

                  // Offset position for cross-day drag
                  const xOffset = isDragging && dragState.mode === 'move'
                    ? dragDayOffset * getColumnWidth()
                    : 0

                  return (
                    <div
                      key={task.id}
                      onMouseDown={(e) => {
                        const mode = getDragMode(e, tTop, tHeight)
                        handleDragStart(task.id, day, taskTop(task), taskHeight(task), mode, e)
                      }}
                      onContextMenu={(e) => handleTaskContextMenu(task.id, e)}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isDragging) onSelectTask(task.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: tTop,
                        left: isDragging ? 4 : `calc(${laneLayout.laneIndex * laneWidthPercent}% + 4px)`,
                        width: isDragging
                          ? 'calc(100% - 8px)'
                          : `calc(${laneWidthPercent}% - 8px)`,
                        maxWidth: 'calc(100% - 8px)',
                        height: tHeight,
                        transform: xOffset ? `translateX(${xOffset}px)` : undefined,
                        background: isDragging ? 'var(--calendar-task-card-dragging-bg)' : 'var(--calendar-task-card-bg)',
                        borderLeft: `4px solid ${task.color}`,
                        borderRadius: 12,
                        padding: '8px 10px',
                        fontSize: 12,
                        zIndex: isDragging ? 100 : 2,
                        boxShadow: isDragging
                          ? '0 14px 28px rgba(84,58,28,0.24)'
                          : '0 10px 18px rgba(84,58,28,0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        opacity: task.isCompleted ? 0.7 : 1,
                        userSelect: 'none',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Top resize handle */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: RESIZE_HANDLE,
                        cursor: 'ns-resize', zIndex: 3,
                      }} />

                      <div style={{ fontWeight: 700, color: isDragging ? 'var(--calendar-accent-text)' : 'var(--calendar-task-card-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title || copy.common.untitledTask}
                      </div>
                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {task.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10,
                              background: isDragging ? 'rgba(255,255,255,0.2)' : 'var(--calendar-surface-muted)',
                              color: isDragging ? 'var(--calendar-accent-text)' : 'var(--calendar-task-meta-text)',
                              padding: '2px 7px',
                              borderRadius: 999,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        color: isDragging ? 'rgba(255,255,255,0.9)' : 'var(--calendar-task-meta-text)',
                        fontSize: 10,
                        lineHeight: 1.35,
                      }}>
                        <div style={{ fontWeight: 700 }}>{durationLabel}</div>
                        {timeLabel && <div>{timeLabel}</div>}
                      </div>
                      {bodyPreview && (
                        <div style={{
                          color: isDragging ? 'rgba(255,255,255,0.92)' : 'var(--calendar-secondary-text)',
                          fontSize: 11,
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: Math.max(1, Math.floor((tHeight - 72) / 18)),
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word',
                        }}>
                          {bodyPreview}
                        </div>
                      )}

                      {/* Bottom resize handle */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: RESIZE_HANDLE,
                        cursor: 'ns-resize', zIndex: 3,
                      }} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
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
            padding: '4px 0',
            boxShadow: '0 16px 32px rgba(74,57,38,0.14)',
            minWidth: 140
          }}
        >
          {contextMenu.kind === 'blank' && (
            <div
              style={menuItemStyle}
              onClick={() => {
                onCreateTask(contextMenu.date)
                closeContextMenu()
              }}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {copy.calendar.newTask}
            </div>
          )}
          {contextMenu.kind === 'task' && (
            <>
              <div
                style={menuItemStyle}
                onClick={() => {
                  onSelectTask(contextMenu.taskId)
                  closeContextMenu()
                }}
                onMouseEnter={hoverIn}
                onMouseLeave={hoverOut}
              >
                {copy.calendar.openDetails}
              </div>
              <div
                style={menuItemStyle}
                onClick={async () => {
                  try {
                    await useTaskStore.getState().save()
                    await openTaskWindow(contextMenu.taskId)
                    pushFeedback({ kind: 'success', message: copy.feedback.taskWindowReady })
                  } catch (error) {
                    pushFeedback({
                      kind: 'error',
                      message: replaceTemplate(copy.feedback.taskWindowFailed, {
                        message: error instanceof Error ? error.message : String(error),
                      }),
                    })
                  }
                  closeContextMenu()
                }}
                onMouseEnter={hoverIn}
                onMouseLeave={hoverOut}
              >
                {copy.calendar.openTaskBox}
              </div>
              <div
                style={{ ...menuItemStyle, color: 'var(--calendar-accent)' }}
                onClick={() => {
                  deleteTask(contextMenu.taskId)
                  closeContextMenu()
                }}
                onMouseEnter={hoverIn}
                onMouseLeave={hoverOut}
              >
                {copy.calendar.deleteTask}
              </div>
            </>
          )}
        </ContextMenuLayer>
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--calendar-text)',
}

const hoverIn = (e: React.MouseEvent) => {
  (e.currentTarget as HTMLElement).style.background = 'var(--calendar-surface-muted)'
}

const hoverOut = (e: React.MouseEvent) => {
  (e.currentTarget as HTMLElement).style.background = 'transparent'
}
