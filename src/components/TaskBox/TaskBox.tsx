import { useCallback, useEffect, useState } from 'react'
import { useTaskStore } from '../../stores/taskStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'
import { useDrag } from '../../hooks/useDrag'
import { useSystemFonts } from '../../hooks/useSystemFonts'
import { COLOR_PALETTE, TEXT_COLOR_PALETTE, hexToRgba } from '../../lib/colors'
import { TimerDisplay } from './TimerDisplay'
import { TimeSelector } from './TimeSelector'
import { RestModal } from './RestModal'
import { renderMarkdownHtml } from '../RichText/markdown'
import { ContextMenuLayer } from '../ContextMenuLayer'
import { TaskTagEditor } from '../TaskTagEditor'
import { WindowPinIcon } from '../WindowPinIcon'
import { buildTimerPatch } from '../../lib/taskMeta'
import { getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { getRuntimeBridge } from '../../platform/runtime'

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function TaskBox({ id }: { id: string }) {
  const task = useTaskStore(s => s.tasks[id])
  const updateTask = useTaskStore(s => s.updateTask)
  const flushPendingSave = useTaskStore(s => s.flushPendingSave)
  const loaded = useTaskStore(s => s.loaded)
  const language = useSettingsStore(s => s.settings.language)
  const saveSettings = useSettingsStore(s => s.update)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(language)
  const { onMouseDown } = useDrag()
  const systemFonts = useSystemFonts()
  const [showColors, setShowColors] = useState(false)
  const [inlineFormatToolbarTarget, setInlineFormatToolbarTarget] = useState<'title' | 'body' | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{
    x: number
    y: number
    target: 'title' | 'body' | 'controls'
    anchorRect?: DOMRect | null
  } | null>(null)
  const [isEditingBody, setIsEditingBody] = useState(false)
  const resolveCurrentWindow = useCallback(async () => {
    const result = await getRuntimeBridge().windows.getCurrentWindow()
    return result.ok ? result.value : null
  }, [])
  const closeCurrentWindow = useCallback(async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) return
    await flushPendingSave?.()
    await currentWindow.close()
  }, [flushPendingSave, resolveCurrentWindow])

  useEffect(() => {
    const applyGlassEffect = async () => {
      try {
        const currentWindow = await resolveCurrentWindow()
        if (!currentWindow) return
        await currentWindow.applyGlassSurface(task?.opacity ?? 1)
      } catch (err) {
        console.warn('[TaskBox] failed to update window effects:', err)
      }
    }

    void applyGlassEffect()
  }, [resolveCurrentWindow, task?.opacity])

  useEffect(() => {
    if (!loaded || task) return
    void closeCurrentWindow()
  }, [closeCurrentWindow, loaded, task])

  useEffect(() => {
    if (!task) return
    const syncAlwaysOnTop = async () => {
      try {
        const currentWindow = await resolveCurrentWindow()
        if (!currentWindow) return
        await currentWindow.setAlwaysOnTop(task.isPinned)
      } catch (error) {
        console.warn('[TaskBox] failed to sync always-on-top:', error)
      }
    }

    void syncAlwaysOnTop()
  }, [resolveCurrentWindow, task?.isPinned])

  useEffect(() => {
    if (!task) return
    void resolveCurrentWindow().then(currentWindow => currentWindow?.setTitle(task.title || copy.common.untitledTask))
  }, [copy.common.untitledTask, resolveCurrentWindow, task?.title])

  useEffect(() => {
    if (!task) return
    saveSettings({
      lastTaskStyle: {
        color: task.color,
        opacity: task.opacity,
        titleFontSize: task.titleFontSize,
        titleFontFamily: task.titleFontFamily,
        titleFontColor: task.titleFontColor ?? task.fontColor ?? '#ffffff',
        bodyFontSize: task.bodyFontSize,
        bodyFontFamily: task.bodyFontFamily,
        bodyFontColor: task.bodyFontColor ?? task.fontColor ?? '#ffffff',
        fontColor: task.fontColor ?? task.bodyFontColor ?? '#ffffff',
      },
    })
  }, [
    task?.color,
    task?.opacity,
    task?.titleFontSize,
    task?.titleFontFamily,
    task?.titleFontColor,
    task?.bodyFontSize,
    task?.bodyFontFamily,
    task?.bodyFontColor,
    task?.fontColor,
  ])

  const handleTitleContextMenu = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu(null)
    setInlineFormatToolbarTarget('title')
  }, [])

  const handleBodyContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu(null)
    setInlineFormatToolbarTarget('body')
  }, [])

  const handleControlsContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setInlineFormatToolbarTarget(null)
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      target: 'controls',
      anchorRect: e.currentTarget.getBoundingClientRect(),
    })
  }, [])

  const handleSurfaceContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
  }, [])

  const stopToolbarPointer = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  if (!loaded || !task) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13, position: 'relative' }}>
      <button
        onClick={() => void closeCurrentWindow()}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 4,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: '2px 6px',
        }}
        title={copy.common.close}
      >&#10005;</button>
      {copy.common.loading}
    </div>
  )

  const handleClose = async () => {
    await closeCurrentWindow()
  }

  const handleMinimize = async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) return
    await currentWindow.minimize()
  }

  const handleTogglePin = async () => {
    const nextPinned = !task.isPinned
    const currentWindowResult = await getRuntimeBridge().windows.getCurrentWindow()
    if (!currentWindowResult.ok) {
      pushFeedback({
        kind: 'error',
        message: copy.feedback.alwaysOnTopUnavailableInBrowser,
      })
      return
    }

    try {
      await currentWindowResult.value.setAlwaysOnTop(nextPinned)
      updateTask(id, { isPinned: nextPinned })
    } catch (error) {
      console.error('[TaskBox] failed to toggle always-on-top:', error)
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.alwaysOnTopToggleFailed, {
          message: getErrorMessage(error),
        }),
      })
    }
  }

  const titleFontSize = task.titleFontSize ?? 15
  const titleFontFamily = task.titleFontFamily ?? 'default'
  const titleFontColor = task.titleFontColor ?? task.fontColor ?? '#ffffff'
  const bodyFontSize = task.bodyFontSize ?? 14
  const bodyFontFamily = task.bodyFontFamily ?? 'default'
  const bodyFontColor = task.bodyFontColor ?? task.fontColor ?? '#ffffff'
  const resolveFont = (f: string) => f === 'default' ? 'inherit' : `"${f}"`
  const surfaceBackground = task.opacity <= 0
    ? 'transparent'
    : hexToRgba(task.color, task.opacity)
  const surfaceBorder = task.opacity <= 0.08
    ? '1px solid rgba(255,255,255,0.22)'
    : '1px solid rgba(255,255,255,0.08)'

  const closeAllPanels = () => {
    setShowColors(false)
    setCtxMenu(null)
    setInlineFormatToolbarTarget(null)
  }

  const applyTitleFontFamily = (nextFont: string) => updateTask(id, { titleFontFamily: nextFont })
  const applyTitleFontSize = (nextSize: number) => updateTask(id, { titleFontSize: nextSize })
  const applyTitleFontColor = (nextColor: string) => updateTask(id, {
    titleFontColor: nextColor,
    fontColor: task.fontColor ?? nextColor,
  })

  const applyBodyFontFamily = (nextFont: string) => updateTask(id, { bodyFontFamily: nextFont })
  const applyBodyFontSize = (nextSize: number) => updateTask(id, { bodyFontSize: nextSize })
  const applyBodyFontColor = (nextColor: string) => updateTask(id, {
    bodyFontColor: nextColor,
    fontColor: task.fontColor ?? nextColor,
  })
  const markdownPreview = renderMarkdownHtml(task.body)

  return (
    <div
      className="task-window-surface"
      data-testid="task-scroll-area"
      onClick={() => {
        if (ctxMenu) setCtxMenu(null)
        if (inlineFormatToolbarTarget) setInlineFormatToolbarTarget(null)
      }}
      onContextMenu={handleSurfaceContextMenu}
      style={{
        background: surfaceBackground,
        borderRadius: 10,
        width: '100%',
        height: '100vh',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        color: bodyFontColor,
        border: surfaceBorder,
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      }}
    >
      <div
        data-testid="task-window-toolbar"
        onContextMenu={handleControlsContextMenu}
        style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        minHeight: 32,
        background: surfaceBackground,
      }}
      >
        <div
          data-drag-handle="task-window"
          onMouseDown={onMouseDown}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 20,
            cursor: 'grab',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            data-no-drag
            onMouseDown={stopToolbarPointer}
            onClick={() => void handleTogglePin()}
            style={iconBtnStyle}
            aria-label={task.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
            title={task.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
          >
            <WindowPinIcon pinned={task.isPinned} />
          </button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={() => { closeAllPanels(); setShowColors(!showColors) }}
            style={iconBtnStyle} title={copy.common.color}>&#127912;</button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={handleMinimize}
            style={iconBtnStyle} title={copy.common.hide}>&mdash;</button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={handleClose}
            style={iconBtnStyle} title={copy.common.close}>&#10005;</button>
        </div>
      </div>

      {/* Color picker */}
      {showColors && (
        <div data-no-drag style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 10px', alignItems: 'center',
        }}>
          {COLOR_PALETTE.map(c => (
            <div key={c} onClick={() => { updateTask(id, { color: c }); setShowColors(false) }}
              style={{
                width: 18, height: 18, borderRadius: 4, background: c,
                border: c === task.color ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
              }} />
          ))}
          <input
            type="color"
            value={task.color}
            onChange={e => updateTask(id, { color: e.target.value })}
            style={{ width: 18, height: 18, padding: 0, border: 'none', cursor: 'pointer' }}
            title={copy.common.customColor}
          />
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{copy.common.opacity}</span>
            <input type="range" min={0} max={100} value={task.opacity * 100}
              onChange={e => updateTask(id, { opacity: Number(e.target.value) / 100 })}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 11, minWidth: 30 }}>{Math.round(task.opacity * 100)}%</span>
          </div>
        </div>
      )}

      {/* Title — below drag bar, editable */}
      <textarea
        data-no-drag
        rows={2}
        value={task.title}
        onChange={e => updateTask(id, { title: e.target.value })}
        onContextMenu={handleTitleContextMenu}
        placeholder={copy.taskBox.titlePlaceholder}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: titleFontColor,
          fontSize: titleFontSize,
          fontFamily: resolveFont(titleFontFamily),
          fontWeight: 700,
          padding: '4px 12px 8px',
          lineHeight: 1.4,
          resize: 'none',
          cursor: 'text',
        }}
      />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '0 12px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <TimeSelector selected={task.timerMinutes}
          onSelect={m => updateTask(id, { ...buildTimerPatch(task, m), elapsedSeconds: 0, isRunning: false })} />
        <div data-no-drag>
          <TaskTagEditor
            tags={task.tags}
            onChange={tags => updateTask(id, { tags })}
            accentColor={task.color}
            compact
            placeholder={copy.taskBox.tagPlaceholder}
            inputPlaceholder={copy.taskBox.tagPlaceholder}
            textColor={bodyFontColor}
          />
        </div>
        <div
          data-no-drag
          onContextMenu={handleControlsContextMenu}
          style={{
            background: task.opacity <= 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <TimerDisplay taskId={id} />
        </div>
      </div>

      {inlineFormatToolbarTarget && (
        <div
          data-testid="task-format-toolbar"
          data-no-drag
          style={{
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(30,30,50,0.92)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <select
              defaultValue={inlineFormatToolbarTarget === 'title' ? titleFontSize : bodyFontSize}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                const nextSize = Number(e.target.value)
                if (inlineFormatToolbarTarget === 'title') {
                  applyTitleFontSize(nextSize)
                } else {
                  applyBodyFontSize(nextSize)
                }
              }}
              style={contextSelectStyle}
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            <select
              defaultValue={inlineFormatToolbarTarget === 'title' ? titleFontFamily : bodyFontFamily}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                const nextFont = e.target.value
                if (inlineFormatToolbarTarget === 'title') {
                  applyTitleFontFamily(nextFont)
                } else {
                  applyBodyFontFamily(nextFont)
                }
              }}
              style={{ ...contextSelectStyle, maxWidth: 150 }}
            >
              <option value="default">{copy.common.defaultOption}</option>
              {systemFonts.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {TEXT_COLOR_PALETTE.map(c => (
              <div
                key={c}
                onClick={() => {
                  if (inlineFormatToolbarTarget === 'title') {
                    applyTitleFontColor(c)
                  } else {
                    applyBodyFontColor(c)
                  }
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: c,
                  border: c === (inlineFormatToolbarTarget === 'title' ? titleFontColor : bodyFontColor)
                    ? '2px solid #4d96ff'
                    : '1px solid rgba(128,128,128,0.4)',
                  cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="color"
              value={inlineFormatToolbarTarget === 'title' ? titleFontColor : bodyFontColor}
              onChange={e => {
                if (inlineFormatToolbarTarget === 'title') {
                  applyTitleFontColor(e.target.value)
                } else {
                  applyBodyFontColor(e.target.value)
                }
              }}
              style={{ width: 18, height: 18, padding: 0, border: 'none', cursor: 'pointer' }}
              title={copy.common.customColor}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button
              data-no-drag
              onMouseDown={e => e.preventDefault()}
              onClick={() => void handleTogglePin()}
              style={inlineActionButtonStyle}
            >
              {task.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {isEditingBody ? (
        <textarea
          data-no-drag
          value={task.body}
          onChange={e => updateTask(id, { body: e.target.value })}
          onBlur={() => setIsEditingBody(false)}
          onContextMenu={handleBodyContextMenu}
          placeholder={copy.taskBox.bodyPlaceholder}
          style={{
            flex: '1 1 0',
            minHeight: 96,
            resize: 'none',
            background: task.opacity <= 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
            border: 'none',
            outline: 'none',
            color: bodyFontColor,
            padding: '14px 10px 12px',
            fontSize: bodyFontSize,
            fontFamily: resolveFont(bodyFontFamily),
            lineHeight: 1.5,
            cursor: 'text',
            whiteSpace: 'pre-wrap',
            overflowY: 'auto',
          }}
          autoFocus
        />
      ) : (
        <div
          data-no-drag
          onClick={() => setIsEditingBody(true)}
          onContextMenu={handleBodyContextMenu}
          style={{
            flex: '1 1 0',
            minHeight: 96,
            background: task.opacity <= 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
            border: 'none',
            outline: 'none',
            color: bodyFontColor,
            padding: '14px 10px 12px',
            fontSize: bodyFontSize,
            fontFamily: resolveFont(bodyFontFamily),
            lineHeight: 1.6,
            cursor: 'text',
            overflowY: 'auto',
            overflowWrap: 'anywhere',
          }}
          dangerouslySetInnerHTML={{
            __html: markdownPreview || `<p style="opacity:0.55">${copy.taskBox.bodyPlaceholder}</p>`,
          }}
        />
      )}

      {ctxMenu && (
        <ContextMenuLayer
          x={ctxMenu.x}
          y={ctxMenu.y}
          anchorRect={ctxMenu.anchorRect}
          placement="bottom-start"
          style={{
            background: 'rgba(30,30,50,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            minWidth: 260,
          }}
        >
          <div
            data-no-drag
            onClick={() => void handleTogglePin()}
            style={contextMenuItemStyle}
          >
            {task.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
          </div>
          <div
            data-no-drag
            onClick={() => updateTask(id, { showResetButton: !task.showResetButton })}
            style={contextMenuItemStyle}
          >
            {task.showResetButton ? copy.taskBox.hideResetButton : copy.taskBox.showResetButton}
          </div>
        </ContextMenuLayer>
      )}

      <RestModal taskId={id} />
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, padding: 2, lineHeight: 1,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 16, minHeight: 16,
}

const contextSelectStyle: React.CSSProperties = {
  background: '#f5f5f5',
  color: '#111827',
  border: '1px solid rgba(17,24,39,0.24)',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
}

const inlineActionButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
}

const contextMenuItemStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 4,
  padding: '6px 8px',
  userSelect: 'none',
}
