import { useState, useRef, useCallback, useEffect } from 'react'
import { useIdeaStore } from '../../stores/ideaStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'
import { useDrag } from '../../hooks/useDrag'
import { useSystemFonts } from '../../hooks/useSystemFonts'
import { COLOR_PALETTE, TEXT_COLOR_PALETTE, hexToRgba } from '../../lib/colors'
import { RichTextEditor, richTextToPlainText, type RichTextEditorHandle } from '../RichText/RichTextEditor'
import { ContextMenuLayer } from '../ContextMenuLayer'
import { getSelectionAnchorRect } from '../contextMenuAnchors'
import { WindowPinIcon } from '../WindowPinIcon'
import { getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { getRuntimeBridge } from '../../platform/runtime'
import type { IdeaBox as IdeaRecord } from '../../types'
// CRITICAL: Do NOT import useTaskStore, WebviewWindow, or uuid at top level
// — these cause IdeaBox black screen. Use dynamic import() inside callbacks.

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function IdeaBox({ id }: { id: string }) {
  const idea = useIdeaStore(s => s.ideas[id])
  const ideas = useIdeaStore(s => s.ideas)
  const updateIdea = useIdeaStore(s => s.updateIdea)
  const flushPendingSave = useIdeaStore(s => s.flushPendingSave)
  const hideIdea = useIdeaStore(s => s.hideIdea)
  const showIdea = useIdeaStore(s => s.showIdea)
  const hideAllIdeas = useIdeaStore(s => s.hideAllIdeas)
  const showAllIdeas = useIdeaStore(s => s.showAllIdeas)
  const renameIdea = useIdeaStore(s => s.renameIdea)
  const deleteIdea = useIdeaStore(s => s.deleteIdea)
  const loaded = useIdeaStore(s => s.loaded)
  const language = useSettingsStore(s => s.settings.language)
  const saveSettings = useSettingsStore(s => s.update)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(language)
  const { onMouseDown } = useDrag()
  const systemFonts = useSystemFonts()
  const [showColors, setShowColors] = useState(false)
  const [selectionToolbar, setSelectionToolbar] = useState<{ selectedText: string } | null>(null)
  const [titleMenu, setTitleMenu] = useState<{ x: number; y: number; anchorRect?: DOMRect | null } | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const editorRef = useRef<RichTextEditorHandle>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const resolveCurrentWindow = useCallback(async () => {
    const result = await getRuntimeBridge().windows.getCurrentWindow()
    return result.ok ? result.value : null
  }, [])
  const closeCurrentWindow = useCallback(async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) return
    await flushPendingSave?.()
    await currentWindow.destroy()
  }, [flushPendingSave, resolveCurrentWindow])
  const persistCurrentWindowState = useCallback(async (markHidden = false) => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) {
      if (markHidden) {
        updateIdea(id, { isVisible: false })
      }
      return
    }

    const patch: Partial<IdeaRecord> = markHidden ? { isVisible: false } : {}

    if (currentWindow.outerPosition && currentWindow.outerSize) {
      try {
        const [position, size, scale] = await Promise.all([
          currentWindow.outerPosition(),
          currentWindow.innerSize?.() ?? currentWindow.outerSize(),
          currentWindow.scaleFactor?.() ?? Promise.resolve(1),
        ])
        const scaleFactor = Number.isFinite(scale) && scale > 0 ? scale : 1
        patch.windowState = {
          x: position.x,
          y: position.y,
          width: size.width / scaleFactor,
          height: size.height / scaleFactor,
          sizeUnit: 'logical',
        }
      } catch (error) {
        console.warn('[IdeaBox] failed to persist window bounds:', error)
      }
    }

    if (Object.keys(patch).length > 0) {
      updateIdea(id, patch)
    }
  }, [id, resolveCurrentWindow, updateIdea])

  useEffect(() => {
    const applyGlassEffect = async () => {
      try {
        const currentWindow = await resolveCurrentWindow()
        if (!currentWindow) return
        await currentWindow.applyGlassSurface(idea?.opacity ?? 1)
      } catch (err) {
        console.warn('[IdeaBox] failed to update window effects:', err)
      }
    }

    void applyGlassEffect()
  }, [idea?.opacity, resolveCurrentWindow])

  useEffect(() => {
    if (!loaded || idea) return
    void closeCurrentWindow()
  }, [closeCurrentWindow, idea, loaded])

  useEffect(() => {
    if (!idea) return
    const syncAlwaysOnTop = async () => {
      try {
        const currentWindow = await resolveCurrentWindow()
        if (!currentWindow) return
        await currentWindow.setAlwaysOnTop(idea.isPinned)
      } catch (error) {
        console.warn('[IdeaBox] failed to sync always-on-top:', error)
      }
    }

    void syncAlwaysOnTop()
  }, [idea?.isPinned, resolveCurrentWindow])

  useEffect(() => {
    if (!idea) return
    void resolveCurrentWindow().then(currentWindow => currentWindow?.setTitle(idea.title || copy.common.untitledIdea))
  }, [copy.common.untitledIdea, idea?.title, resolveCurrentWindow])

  useEffect(() => {
    if (!loaded || !idea) return

    let disposed = false
    let unlisten: (() => void) | null = null

    const bindClosePersistence = async () => {
      const currentWindow = await resolveCurrentWindow()
      if (!currentWindow?.onCloseRequested || disposed) return
      unlisten = await currentWindow.onCloseRequested(() => persistCurrentWindowState(true))
    }

    void bindClosePersistence()

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [loaded, idea, persistCurrentWindowState, resolveCurrentWindow])

  useEffect(() => {
    setTitleDraft(idea?.title ?? '')
  }, [idea?.title])

  useEffect(() => {
    if (!isEditingTitle) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [isEditingTitle])

  useEffect(() => {
    if (!idea) return
    saveSettings({
      lastIdeaStyle: {
        color: idea.color,
        opacity: idea.opacity,
        fontSize: idea.fontSize,
        fontFamily: idea.fontFamily,
        fontColor: idea.fontColor,
      },
    })
  }, [idea?.color, idea?.opacity, idea?.fontSize, idea?.fontFamily, idea?.fontColor])

  // ALL hooks must be above the early return
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const selectedText = editorRef.current?.getSelectedText() ?? ''
    setTitleMenu(null)
    setSelectionToolbar({ selectedText })
  }, [])

  const handleTitleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setSelectionToolbar(null)
    setTitleMenu({
      x: e.clientX,
      y: e.clientY,
      anchorRect: getSelectionAnchorRect(window.getSelection()),
    })
  }, [])

  const stopToolbarPointer = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleCreateTaskFromSelection = useCallback(async () => {
    if (!selectionToolbar) return
    const plainText = idea ? richTextToPlainText(idea.body) : ''
    const title = selectionToolbar.selectedText.trim() || idea?.title || plainText.slice(0, 60) || copy.common.untitledTask
    setSelectionToolbar(null)
    try {
      const [{ v4: uuidv4 }, { useTaskStore }, { openTaskWindow }] = await Promise.all([
        import('uuid'),
        import('../../stores/taskStore'),
        import('../../lib/taskWindows'),
      ])
      const taskId = uuidv4()
      const store = useTaskStore.getState()
      await store.createTask(taskId)
      store.updateTask(taskId, { title, body: '' })
      await store.save()
      await openTaskWindow(taskId)
      pushFeedback({ kind: 'success', message: copy.feedback.taskWindowReady })
    } catch (err) {
      console.error('Failed to create task from idea:', err)
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.taskWindowFailed, {
          message: err instanceof Error ? err.message : String(err),
        }),
      })
    }
  }, [copy.common.untitledTask, copy.feedback.taskWindowFailed, copy.feedback.taskWindowReady, idea, pushFeedback, selectionToolbar])

  if (!loaded || !idea) return (
    <div style={{
      background: '#2d2d4e',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffd93d',
      fontSize: 14,
      fontFamily: 'monospace',
      padding: 20,
      textAlign: 'center',
      position: 'relative',
    }}>
      <button
        onClick={() => void closeCurrentWindow()}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: '2px 6px',
        }}
        title={copy.common.close}
      >&#10005;</button>
      <div>
        <div>{copy.ideaBox.loadingTitle}</div>
        <div>id: {id} | loaded: {String(loaded)}</div>
      </div>
    </div>
  )

  const handleDelete = async () => {
    setSelectionToolbar(null)
    setTitleMenu(null)
    deleteIdea(id)
    await closeCurrentWindow()
  }

  const handleHide = async () => {
    setSelectionToolbar(null)
    setTitleMenu(null)
    await persistCurrentWindowState(true)
    await closeCurrentWindow()
  }

  const handleMinimize = async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) return
    await currentWindow.minimize()
  }

  const handleCommitTitle = () => {
    renameIdea(id, titleDraft)
    setIsEditingTitle(false)
  }

  const handleTogglePin = async () => {
    const nextPinned = !idea.isPinned
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
      updateIdea(id, { isPinned: nextPinned })
      setTitleMenu(null)
    } catch (error) {
      console.error('[IdeaBox] failed to toggle always-on-top:', error)
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.alwaysOnTopToggleFailed, {
          message: getErrorMessage(error),
        }),
      })
    }
  }

  const handleToggleIdeaVisibility = async (ideaId: string) => {
    const target = ideas[ideaId]
    if (!target) return

    try {
      const { closeIdeaWindow, openIdeaWindow } = await import('../../lib/ideaWindows')
      if (target.isVisible) {
        hideIdea(ideaId)
        try {
          await closeIdeaWindow(ideaId)
          pushFeedback({
            kind: 'success',
            message: replaceTemplate(copy.feedback.ideaHidden, { title: target.title || copy.common.untitledIdea }),
          })
        } catch (error) {
          showIdea(ideaId)
          throw error
        }
      } else {
        showIdea(ideaId)
        try {
          await openIdeaWindow({ ...target, isVisible: true })
          pushFeedback({
            kind: 'success',
            message: replaceTemplate(copy.feedback.ideaShown, { title: target.title || copy.common.untitledIdea }),
          })
        } catch (error) {
          hideIdea(ideaId)
          throw error
        }
      }
    } catch (error) {
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.ideaToggleFailed, {
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    }
    setTitleMenu(null)
  }

  const handleShowAllIdeas = async () => {
    try {
      const { openIdeaWindow } = await import('../../lib/ideaWindows')
      const currentIdeas = Object.values(ideas)
      showAllIdeas()
      await Promise.all(
        currentIdeas.map(currentIdea => openIdeaWindow({ ...currentIdea, isVisible: true })),
      )
      pushFeedback({ kind: 'success', message: copy.feedback.showAllIdeasReady })
    } catch (error) {
      hideAllIdeas()
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.showAllIdeasFailed, {
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    }
    setTitleMenu(null)
  }

  const handleHideAllIdeas = async () => {
    try {
      const { closeIdeaWindow } = await import('../../lib/ideaWindows')
      const ideaIds = Object.keys(ideas)
      hideAllIdeas()
      await Promise.all(ideaIds.map(ideaId => closeIdeaWindow(ideaId)))
      pushFeedback({ kind: 'success', message: copy.feedback.hideAllIdeasReady })
    } catch (error) {
      showAllIdeas()
      pushFeedback({
        kind: 'error',
        message: replaceTemplate(copy.feedback.hideAllIdeasFailed, {
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    }
    setTitleMenu(null)
  }

  const fontSize = idea.fontSize ?? 14
  const fontFamily = idea.fontFamily ?? 'default'
  const fontColor = idea.fontColor ?? '#1a1a2e'
  const resolveFont = (f: string) => f === 'default' ? 'inherit' : `"${f}"`
  const surfaceBackground = idea.opacity <= 0
    ? 'transparent'
    : hexToRgba(idea.color, idea.opacity)
  const surfaceBorder = idea.opacity <= 0.08
    ? '1px solid rgba(255,255,255,0.22)'
    : '1px solid rgba(255,255,255,0.08)'

  const applySelectionFontFamily = (nextFont: string) => {
    if (nextFont === 'default') return
    editorRef.current?.applyFontFamily(nextFont)
  }

  const applySelectionFontSize = (nextSize: number) => {
    editorRef.current?.applyFontSize(nextSize)
  }

  const applySelectionFontColor = (nextColor: string) => {
    editorRef.current?.applyTextColor(nextColor)
  }

  return (
    <div
      onClick={() => {
        if (selectionToolbar) setSelectionToolbar(null)
        if (titleMenu) setTitleMenu(null)
      }}
      style={{
        background: surfaceBackground,
        borderRadius: 10,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        position: 'relative',
        color: fontColor,
        border: surfaceBorder,
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      }}
    >
      {/* Toolbar */}
      <div
        data-testid="idea-window-toolbar"
        onContextMenu={handleTitleMenu}
        style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        minHeight: 40,
        flexShrink: 0,
        background: surfaceBackground,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 8,
            color: fontColor,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <div
            data-testid="idea-title-shell"
            style={{
              minWidth: 0,
              width: '75%',
              maxWidth: '75%',
            }}
          >
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                data-no-drag
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleCommitTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCommitTitle()
                  } else if (e.key === 'Escape') {
                    setTitleDraft(idea.title)
                    setIsEditingTitle(false)
                  }
                }}
                style={{
                  width: '100%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.15)',
                  color: fontColor,
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              />
            ) : (
              <div
                data-no-drag
                onDoubleClick={() => setIsEditingTitle(true)}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'text',
                }}
                title={idea.title}
              >
                {idea.title}
              </div>
            )}
          </div>
          <div
            data-drag-handle="idea-window"
            onMouseDown={onMouseDown}
            style={{
              minWidth: 24,
              flex: 1,
              alignSelf: 'stretch',
              cursor: 'grab',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            data-no-drag
            onMouseDown={stopToolbarPointer}
            onClick={() => void handleTogglePin()}
            style={iconBtnStyle}
            aria-label={idea.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
            title={idea.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
          >
            <WindowPinIcon pinned={idea.isPinned} />
          </button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={() => { setSelectionToolbar(null); setShowColors(!showColors) }}
            style={iconBtnStyle} title={copy.common.color}>&#127912;</button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={handleMinimize}
            style={iconBtnStyle}>&mdash;</button>
          <button data-no-drag onMouseDown={stopToolbarPointer} onClick={handleHide}
            style={iconBtnStyle} title={copy.common.close}>&#10005;</button>
        </div>
      </div>

      {selectionToolbar && (
        <div
          data-testid="idea-selection-toolbar"
          data-no-drag
          style={{
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(30,30,50,0.96)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <select
              defaultValue={fontSize}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onChange={e => applySelectionFontSize(Number(e.target.value))}
              style={contextSelectStyle}
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            <select
              defaultValue={fontFamily}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onChange={e => applySelectionFontFamily(e.target.value)}
              style={{ ...contextSelectStyle, maxWidth: 150 }}
            >
              <option value="default">{copy.common.defaultOption}</option>
              {systemFonts.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button
              data-no-drag
              onMouseDown={e => e.preventDefault()}
              onClick={() => editorRef.current?.toggleStyle('bold')}
              style={formatBtnStyle}
              title={copy.ideaBox.bold}
            >
              <strong>B</strong>
            </button>
            <button
              data-no-drag
              onMouseDown={e => e.preventDefault()}
              onClick={() => editorRef.current?.toggleStyle('italic')}
              style={formatBtnStyle}
              title={copy.ideaBox.italic}
            >
              <em>I</em>
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {TEXT_COLOR_PALETTE.map(c => (
              <div key={c} onClick={() => applySelectionFontColor(c)}
                style={{
                  width: 18, height: 18, borderRadius: 4, background: c,
                  border: c === fontColor ? '2px solid #4d96ff' : '1px solid rgba(128,128,128,0.4)',
                  cursor: 'pointer',
                }} />
            ))}
            <input
              type="color"
              value={fontColor}
              onChange={e => applySelectionFontColor(e.target.value)}
              style={{ width: 18, height: 18, padding: 0, border: 'none', cursor: 'pointer' }}
              title={copy.common.customColor}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button
              data-no-drag
              onMouseDown={e => e.preventDefault()}
              onClick={() => void handleCreateTaskFromSelection()}
              style={inlineActionButtonStyle}
            >
              {selectionToolbar.selectedText ? copy.ideaBox.createTaskFromSelection : copy.ideaBox.createTask}
            </button>
            <button
              data-no-drag
              onMouseDown={e => e.preventDefault()}
              onClick={() => void handleTogglePin()}
              style={inlineActionButtonStyle}
            >
              {idea.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
            </button>
          </div>
        </div>
      )}

      {/* Background color + opacity panel */}
      {showColors && (
        <div data-no-drag style={{ padding: '4px 10px', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{copy.common.background}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {COLOR_PALETTE.map(c => (
              <div key={c} onClick={() => updateIdea(id, { color: c })}
                style={{
                  width: 18, height: 18, borderRadius: 4, background: c,
                  border: c === idea.color ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                }} />
            ))}
            <input
              type="color"
              value={idea.color}
              onChange={e => updateIdea(id, { color: e.target.value })}
              style={{ width: 18, height: 18, padding: 0, border: 'none', cursor: 'pointer' }}
              title={copy.common.customColor}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{copy.common.opacity}</span>
            <input type="range" min={0} max={100} value={idea.opacity * 100}
              onChange={e => updateIdea(id, { opacity: Number(e.target.value) / 100 })}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 11, minWidth: 30 }}>{Math.round(idea.opacity * 100)}%</span>
          </div>
        </div>
      )}

      {/* Rich text body */}
      <RichTextEditor
        ref={editorRef}
        value={idea.body}
        onChange={html => updateIdea(id, { body: html })}
        onContextMenu={handleContextMenu}
        placeholder={copy.ideaBox.capturePlaceholder}
        style={{
          background: idea.opacity <= 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
          border: 'none',
          outline: 'none',
          color: fontColor,
          padding: '8px 10px',
          flex: '1 1 0',
          minHeight: 120,
          fontSize,
          fontFamily: resolveFont(fontFamily),
          lineHeight: 1.5,
          cursor: 'text',
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
          overflowWrap: 'anywhere',
        }}
      />

      {titleMenu && (
        <ContextMenuLayer
          x={titleMenu.x}
          y={titleMenu.y}
          anchorRect={titleMenu.anchorRect}
          placement="bottom-start"
          style={{
            background: 'rgba(30,30,50,0.96)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '4px 0',
            boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
            minWidth: 260,
            maxWidth: 320,
          }}
        >
          <div data-no-drag onClick={handleShowAllIdeas} style={menuItemStyle}>{copy.ideaBox.showAllIdeas}</div>
          <div data-no-drag onClick={handleHideAllIdeas} style={menuItemStyle}>{copy.ideaBox.hideAllIdeas}</div>
          <div style={menuSectionLabelStyle}>{copy.ideaBox.undeletedIdeas}</div>
          {Object.values(ideas)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map(currentIdea => (
              <div
                key={currentIdea.id}
                data-no-drag
                onClick={() => handleToggleIdeaVisibility(currentIdea.id)}
                style={menuItemStyle}
                title={currentIdea.title}
              >
                <span style={{ opacity: currentIdea.isVisible ? 1 : 0.55 }}>
                  {currentIdea.title}
                </span>
              </div>
            ))}
          <div style={menuDividerStyle} />
          <div
            data-no-drag
            onClick={() => {
              setIsEditingTitle(true)
              setTitleMenu(null)
            }}
            style={menuItemStyle}
          >
            {copy.common.editTitle}
          </div>
          <div data-no-drag onClick={handleTogglePin} style={menuItemStyle}>
            {idea.isPinned ? copy.common.disableAlwaysOnTop : copy.common.alwaysOnTop}
          </div>
          <div data-no-drag onClick={handleDelete} style={{ ...menuItemStyle, color: '#ff8f8f' }}>
            {copy.ideaBox.deleteIdeaBox}
          </div>
        </ContextMenuLayer>
      )}
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, padding: 2, lineHeight: 1,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 16, minHeight: 16,
}

const formatBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.14)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.28)',
  borderRadius: 4,
  minWidth: 30,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 8px',
  fontSize: 14,
  cursor: 'pointer',
  outline: 'none',
  fontWeight: 700,
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

const menuItemStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  color: '#fff',
}

const menuSectionLabelStyle: React.CSSProperties = {
  padding: '8px 14px 4px',
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.55)',
}

const menuDividerStyle: React.CSSProperties = {
  height: 1,
  margin: '4px 0',
  background: 'rgba(255,255,255,0.12)',
}
