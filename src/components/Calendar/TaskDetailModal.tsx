import { useTaskStore } from '../../stores/taskStore'
import { useEffect, useMemo, useState } from 'react'
import { COLOR_PALETTE, hexToRgba } from '../../lib/colors'
import { buildTimerPatch, getTaskEnd, getTaskFocusHistory, getTaskFocusMinutes, getTaskStart, getTaskStatusKey, type TaskStatusKey } from '../../lib/taskMeta'
import { TaskTagEditor } from '../TaskTagEditor'
import { renderMarkdownHtml } from '../RichText/markdown'
import { openTaskWindow } from '../../lib/taskWindows'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatDateTimeLabel, formatHistoryLabel, getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'

interface Props {
  taskId: string
  onClose: () => void
}

export function TaskDetailModal({ taskId, onClose }: Props) {
  const task = useTaskStore(s => s.tasks[taskId])
  const updateTask = useTaskStore(s => s.updateTask)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const language = useSettingsStore(s => s.settings.language)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(language)
  const [isRendered, setIsRendered] = useState(false)
  const [isEditingBody, setIsEditingBody] = useState(false)

  useEffect(() => {
    setIsRendered(true)
  }, [])

  const handleDelete = () => {
    deleteTask(taskId)
    onClose()
  }

  const handleOpenTaskBox = async () => {
    try {
      await useTaskStore.getState().save()
      await openTaskWindow(taskId)
      pushFeedback({ kind: 'success', message: copy.feedback.taskWindowReady })
    } catch (error) {
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.taskWindowFailed, {
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    }
  }

  const currentStatus: TaskStatusKey = task ? getTaskStatusKey(task) : 'unstarted'
  const statusMeta = {
    label: copy.taskDetail.status[currentStatus],
    tone:
      currentStatus === 'completed'
        ? '#d19bc8'
        : currentStatus === 'planning'
          ? '#5a9bd6'
        : currentStatus === 'resting'
          ? '#e0a458'
          : currentStatus === 'running'
            ? '#7dbb94'
            : currentStatus === 'paused'
              ? '#5b89a3'
            : '#8e8b85',
  }
  const taskStart = useMemo(() => (task ? getTaskStart(task) : null), [task])
  const taskEnd = useMemo(() => (task ? getTaskEnd(task) : null), [task])
  const focusHistory = useMemo(() => (task ? getTaskFocusHistory(task) : []), [task])
  const totalFocusMinutes = useMemo(() => (task ? getTaskFocusMinutes(task) : 0), [task])
  const taskDateLabel = useMemo(() => {
    if (!taskStart) return ''
    if (taskEnd) {
      return `${formatDateTimeLabel(taskStart, language)} -> ${formatDateTimeLabel(taskEnd, language)}`
    }
    return formatDateTimeLabel(taskStart, language)
  }, [language, taskEnd, taskStart])
  const createdAtLabel = useMemo(() => {
    if (!task) return ''
    return replaceTemplate(copy.taskDetail.createdAt, {
      value: formatDateTimeLabel(new Date(task.createdAt), language),
    })
  }, [copy.taskDetail.createdAt, language, task])
  const modalTheme = useMemo(() => ({
    hero: `linear-gradient(135deg, ${hexToRgba(task?.color ?? '#e94560', 0.14)}, rgba(255,255,255,0.96))`,
    card: hexToRgba(task?.color ?? '#e94560', 0.08),
    cardStrong: hexToRgba(task?.color ?? '#e94560', 0.12),
    border: hexToRgba(task?.color ?? '#e94560', 0.22),
    glow: hexToRgba(task?.color ?? '#e94560', 0.14),
  }), [task?.color])
  const markdownPreview = renderMarkdownHtml(task?.body ?? '')

  if (!task) return null

  return (
    <div
      style={overlayStyle(isRendered)}
      onClick={onClose}
    >
      <style>{`
        @keyframes detailPanelIn {
          0% { transform: translateY(18px) scale(0.98); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .task-detail-panel {
          width: min(1240px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          min-height: min(820px, calc(100vh - 32px));
        }
        .task-detail-property-row {
          grid-template-columns: 110px minmax(0, 1fr);
        }
        .task-detail-grid {
          display: grid;
          grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
          align-items: start;
          overflow: auto;
        }
        .task-detail-notes-content,
        .task-detail-notes-content * {
          max-width: 100%;
        }
        .task-detail-notes-content pre,
        .task-detail-notes-content code {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .task-detail-notes-content img,
        .task-detail-notes-content table {
          max-width: 100%;
        }
        @media (max-width: 1080px) {
          .task-detail-panel {
            width: calc(100vw - 24px);
            max-height: calc(100vh - 24px);
          }
          .task-detail-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 560px) {
          .task-detail-property-row {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <div
        className="task-detail-panel"
        style={panelStyle(modalTheme)}
        onClick={e => e.stopPropagation()}
      >
        <div style={heroStyle(modalTheme)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.82)',
                color: '#8b7f70',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusMeta.tone,
                  boxShadow: `0 0 0 4px ${statusMeta.tone}22`,
                }} />
                {copy.taskDetail.badgeTitle}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: `${task.color}26`,
                color: '#58493d',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {statusMeta.label}
              </div>
            </div>

            <input
              value={task.title}
              onChange={e => updateTask(taskId, { title: e.target.value })}
              placeholder={copy.taskDetail.titlePlaceholder}
              style={titleInputStyle}
            />

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              color: '#8b7f70',
              fontSize: 13,
            }}>
              <span>{taskDateLabel}</span>
              <span>{replaceTemplate(copy.taskDetail.timerMinutes, { minutes: task.timerMinutes })}</span>
              <span>{createdAtLabel}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={closeButtonStyle}
          >
            &#10005;
          </button>
        </div>

        <div className="task-detail-grid" style={contentGridStyle}>
          <div style={propertyCardStyle(modalTheme)}>
            <PropertyRow icon="◷" label={copy.taskDetail.durationLabel}>
              <input
                type="number"
                value={task.timerMinutes}
                onChange={e => updateTask(taskId, buildTimerPatch(task, Number(e.target.value)))}
                min={0}
                style={inputStyle}
              />
            </PropertyRow>

            <PropertyRow icon="◉" label={copy.taskDetail.colorLabel}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => updateTask(taskId, { color })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: color,
                      border: color === task.color ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: color === task.color ? '0 0 0 3px rgba(255,255,255,0.12)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </PropertyRow>

            <PropertyRow icon="#" label={copy.taskDetail.tagsLabel}>
              <TaskTagEditor
                tags={task.tags}
                onChange={tags => updateTask(taskId, { tags })}
                accentColor={task.color}
                placeholder={copy.taskBox.tagPlaceholder}
                inputPlaceholder={copy.taskBox.tagPlaceholder}
                textColor="#4b4035"
              />
            </PropertyRow>

            <PropertyRow icon="◌" label={copy.taskDetail.timeLabel}>
              <div style={propertyTextStyle}>
                {taskDateLabel}
              </div>
            </PropertyRow>

            <div style={historySectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3b332c' }}>{copy.taskDetail.focusHistory}</div>
                <div style={{ fontSize: 12, color: '#8b7f70' }}>
                  {replaceTemplate(copy.taskDetail.totalFocusMinutes, { minutes: totalFocusMinutes })}
                </div>
              </div>
              {focusHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {focusHistory.map((record, index) => (
                    <div key={`${record.startedAt.toISOString()}-${index}`} style={historyItemStyle}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#3b332c' }}>
                        {formatHistoryLabel(record.startedAt, language)}
                        {' -> '}
                        {record.endedAt ? formatHistoryLabel(record.endedAt, language) : copy.taskDetail.ongoing}
                      </div>
                      <div style={{ fontSize: 12, color: '#8b7f70' }}>
                        {record.durationMinutes
                          ? replaceTemplate(copy.common.minutesShort, { minutes: record.durationMinutes })
                          : copy.taskDetail.waitingForEnd}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#8b7f70', lineHeight: 1.5 }}>
                  {copy.taskDetail.noFocusHistory}
                </div>
              )}
            </div>
          </div>

          <div style={notesCardStyle(modalTheme)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: '#8b7f70', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {copy.taskDetail.notesEyebrow}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#302821' }}>
                {copy.taskDetail.notesTitle}
              </div>
            </div>

            {isEditingBody ? (
              <textarea
                className="task-detail-notes-content"
                value={task.body}
                onChange={e => updateTask(taskId, { body: e.target.value })}
                onBlur={() => setIsEditingBody(false)}
                placeholder={copy.taskDetail.notesPlaceholder}
                style={notesInputStyle(modalTheme)}
                autoFocus
              />
            ) : (
              <div
                className="task-detail-notes-content"
                onClick={() => setIsEditingBody(true)}
                style={notesPreviewStyle(modalTheme)}
                dangerouslySetInnerHTML={{
                  __html: markdownPreview || `<p style="opacity:0.5">${copy.taskDetail.notesPlaceholder}</p>`,
                }}
              />
            )}

            <div style={footerStyle}>
              <div style={{ fontSize: 12, color: '#8b7f70' }}>
                {copy.taskDetail.autoSaveHint}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={handleOpenTaskBox}
                  style={openTaskButtonStyle}
                >
                  {copy.taskDetail.openTaskBox}
                </button>
                <button
                  onClick={handleDelete}
                  style={deleteButtonStyle}
                >
                  {copy.taskDetail.deleteTask}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PropertyRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="task-detail-property-row" style={propertyRowStyle}>
      <div style={propertyLabelWrapStyle}>
        <span style={propertyIconStyle}>{icon}</span>
        <span style={propertyLabelStyle}>{label}</span>
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

const overlayStyle = (isRendered: boolean): React.CSSProperties => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(82, 63, 38, 0.14)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  transition: 'opacity 0.24s ease',
  opacity: isRendered ? 1 : 0,
  padding: 12,
})

const panelStyle = (theme: {
  border: string
  glow: string
}): React.CSSProperties => ({
  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,243,237,0.98) 100%)',
  borderRadius: 26,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: `0 28px 60px rgba(73,57,38,0.18), 0 0 0 1px ${theme.glow}`,
  border: `1px solid ${theme.border}`,
  animation: 'detailPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
})

const heroStyle = (theme: {
  hero: string
}): React.CSSProperties => ({
  display: 'grid',
  flexShrink: 0,
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 20,
  padding: 'clamp(24px, 3vw, 36px)',
  borderBottom: '1px solid rgba(126,113,95,0.12)',
  background: theme.hero,
})

const closeButtonStyle: React.CSSProperties = {
  alignSelf: 'start',
  width: 38,
  height: 38,
  borderRadius: 999,
  border: '1px solid rgba(126,113,95,0.14)',
  background: 'rgba(255,255,255,0.84)',
  color: '#8b7f70',
  fontSize: 18,
  cursor: 'pointer',
}

const titleInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#302821',
  fontSize: 'clamp(30px, 4vw, 52px)',
  fontWeight: 800,
  lineHeight: 1.05,
  outline: 'none',
  padding: 0,
}

const contentGridStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  gap: 24,
  padding: 'clamp(22px, 3vw, 34px)',
  boxSizing: 'border-box',
}

const propertyCardStyle = (theme: {
  card: string
  border: string
}): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '24px 22px',
  borderRadius: 20,
  background: `linear-gradient(180deg, rgba(255,255,255,0.84) 0%, ${theme.card} 100%)`,
  border: `1px solid ${theme.border}`,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden auto',
})

const propertyRowStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
  alignItems: 'start',
}

const propertyLabelWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  color: '#8b7f70',
  paddingTop: 9,
}

const propertyIconStyle: React.CSSProperties = {
  width: 16,
  textAlign: 'center',
  opacity: 0.8,
}

const propertyLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
}

const propertyTextStyle: React.CSSProperties = {
  minHeight: 42,
  display: 'flex',
  alignItems: 'center',
  color: '#3b332c',
  fontSize: 14,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}

const historySectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 6,
  paddingTop: 16,
  borderTop: '1px solid rgba(126,113,95,0.12)',
}

const historyItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '10px 12px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.78)',
  border: '1px solid rgba(126,113,95,0.12)',
}

const notesCardStyle = (theme: {
  cardStrong: string
  border: string
}): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  padding: '26px 28px 20px',
  borderRadius: 20,
  background: `linear-gradient(180deg, rgba(255,255,255,0.88) 0%, ${theme.cardStrong} 100%)`,
  border: `1px solid ${theme.border}`,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  paddingTop: 6,
  borderTop: '1px solid rgba(126,113,95,0.12)',
}

const deleteButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#cf654f',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const openTaskButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6a7f63',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 42,
  background: 'rgba(248,244,239,0.98)',
  border: '1px solid rgba(126,113,95,0.14)',
  borderRadius: 10,
  padding: '9px 12px',
  color: '#302821',
  fontSize: 14,
  outline: 'none',
}

const notesInputStyle = (theme: {
  cardStrong: string
  border: string
}): React.CSSProperties => ({
  ...inputStyle,
  flex: 1,
  width: '100%',
  minHeight: 'clamp(240px, 34vh, 420px)',
  resize: 'none',
  lineHeight: 1.7,
  padding: '18px 20px',
  background: theme.cardStrong,
  border: `1px solid ${theme.border}`,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  overflowY: 'auto',
})

const notesPreviewStyle = (theme: {
  cardStrong: string
  border: string
}): React.CSSProperties => ({
  ...notesInputStyle(theme),
  overflowY: 'auto',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  cursor: 'text',
  whiteSpace: 'normal',
})
