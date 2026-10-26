import { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTaskStore } from '../../stores/taskStore'
import { exportToJSONL, exportToJSON, exportToMarkdown } from '../../lib/export'
import { getLocaleCopy, replaceTemplate } from '../../lib/i18n'
import { useUiFeedbackStore } from '../../stores/uiFeedbackStore'
import { getRuntimeBridge, getRuntimeKind } from '../../platform/runtime'
import {
  DEFAULT_SHORTCUTS,
  formatShortcutLabel,
  migrateShortcutSettings,
  normalizeShortcutSettings,
  shortcutFromKeyboardEvent,
  type ShortcutField,
  type ShortcutSettings,
  validateShortcutSettings,
} from '../../lib/shortcuts'
import type { CalendarThemeId } from '../../types'
import licenseText from '../../../LICENSE?raw'

type FolderStatusKind = 'idle' | 'requesting_native_dialog' | 'waiting_for_user' | 'success' | 'error'
type StatusKind = FolderStatusKind | 'pending'
type SettingsPage = 'general' | 'focus' | 'shortcuts' | 'data' | 'about'

export function SettingsPanel() {
  const { settings, update } = useSettingsStore()
  const tasks = useTaskStore(s => s.tasks)
  const pushFeedback = useUiFeedbackStore(s => s.pushFeedback)
  const copy = getLocaleCopy(settings.language)
  const runtimeKind = getRuntimeKind()
  const runtimeBridge = getRuntimeBridge()
  const isBrowserRuntime = runtimeKind === 'browser'
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutSettings>(settings.shortcuts)
  const [shortcutError, setShortcutError] = useState('')
  const [shortcutSaving, setShortcutSaving] = useState(false)
  const [settingsPage, setSettingsPage] = useState<SettingsPage>('general')
  const settingsPages: Array<{ id: SettingsPage; label: string }> = settings.language === 'zh-CN'
    ? [
      { id: 'general', label: '常规' },
      { id: 'focus', label: '专注与提醒' },
      { id: 'shortcuts', label: '快捷键' },
      { id: 'data', label: '数据与导出' },
      { id: 'about', label: '关于' },
    ]
    : [
      { id: 'general', label: 'General' },
      { id: 'focus', label: 'Focus & alerts' },
      { id: 'shortcuts', label: 'Shortcuts' },
      { id: 'data', label: 'Data & export' },
      { id: 'about', label: 'About' },
    ]
  const [folderStatus, setFolderStatus] = useState<{ kind: FolderStatusKind; message: string }>({
    kind: 'idle',
    message: '',
  })
  const [exportStatus, setExportStatus] = useState<{ kind: 'idle' | 'pending' | 'success' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  })

  useEffect(() => {
    setShortcutDraft(settings.shortcuts)
  }, [settings.shortcuts])

  const normalizedShortcutDraft = useMemo(
    () => normalizeShortcutSettings(migrateShortcutSettings(shortcutDraft)),
    [shortcutDraft],
  )
  const shortcutsDirty = JSON.stringify(normalizedShortcutDraft) !== JSON.stringify(settings.shortcuts)
  const calendarThemeOptions: Array<{ value: CalendarThemeId; label: string }> = [
    { value: 'warm-day', label: copy.settings.options.themeWarmDay },
    { value: 'night', label: copy.settings.options.themeNight },
    { value: 'morandi', label: copy.settings.options.themeMorandi },
    { value: 'dunhuang', label: copy.settings.options.themeDunhuang },
    { value: 'earth', label: copy.settings.options.themeEarth },
  ]

  const handlePickJournalFolder = async () => {
    if (isBrowserRuntime) {
      const message = copy.feedback.folderPickerUnavailableInBrowser
      setFolderStatus({
        kind: 'error',
        message,
      })
      pushFeedback({ kind: 'error', message })
      return
    }

    setFolderStatus({
      kind: 'requesting_native_dialog',
      message: copy.feedback.folderRequestingDialog,
    })

    let slowDialogTimer: number | null = null
    let waitingTimer: number | null = null

    try {
      waitingTimer = window.setTimeout(() => {
        setFolderStatus({
          kind: 'waiting_for_user',
          message: copy.feedback.folderWaitingForSelection,
        })
      }, 120)
      slowDialogTimer = window.setTimeout(() => {
        setFolderStatus({
          kind: 'waiting_for_user',
          message: copy.feedback.folderDialogSlowHint,
        })
      }, 1800)
      const dialogResult = await runtimeBridge.dialog.openDirectory({
        defaultPath: settings.dailyJournalFolder || undefined,
      })

      if (!dialogResult.ok) {
        throw new Error(dialogResult.message)
      }

      const selected = dialogResult.value
      if (!selected) {
        setFolderStatus({
          kind: 'idle',
          message: '',
        })
        return
      }

      await update({ dailyJournalFolder: selected })
      const message = replaceTemplate(copy.feedback.folderSaved, { path: selected })
      setFolderStatus({
        kind: 'success',
        message,
      })
      pushFeedback({ kind: 'success', message })
    } catch (error) {
      const message = replaceTemplate(copy.feedback.folderSaveFailed, {
        message: error instanceof Error ? error.message : String(error),
      })
      setFolderStatus({
        kind: 'error',
        message,
      })
      pushFeedback({ kind: 'error', message })
    } finally {
      if (waitingTimer) {
        window.clearTimeout(waitingTimer)
      }
      if (slowDialogTimer) {
        window.clearTimeout(slowDialogTimer)
      }
    }
  }

  const handleExport = async () => {
    const taskList = Object.values(tasks)
    let content: string
    let ext: string
    let filterName: string

    switch (settings.exportFormat) {
      case 'jsonl':
        content = exportToJSONL(taskList)
        ext = 'jsonl'
        filterName = 'JSONL'
        break
      case 'json':
        content = exportToJSON(taskList)
        ext = 'json'
        filterName = 'JSON'
        break
      case 'markdown':
        content = exportToMarkdown(taskList)
        ext = 'md'
        filterName = 'Markdown'
        break
    }

    setExportStatus({
      kind: 'pending',
      message: copy.feedback.exportAllPending,
    })

    try {
      const saveResult = await runtimeBridge.dialog.saveFile({
        defaultPath: `cutmind-export.${ext}`,
        filters: [{ name: filterName, extensions: [ext] }],
      })

      if (!saveResult.ok) {
        throw new Error(saveResult.message)
      }

      const filePath = saveResult.value
      if (!filePath) {
        const message = copy.feedback.exportAllCancelled
        setExportStatus({
          kind: 'idle',
          message,
        })
        return
      }

      const writeResult = await runtimeBridge.files.writeTextFile(filePath, content)
      if (!writeResult.ok) {
        throw new Error(writeResult.message)
      }

      const message = replaceTemplate(copy.feedback.exportAllSuccess, {
        count: taskList.length,
        path: filePath,
      })
      setExportStatus({
        kind: 'success',
        message,
      })
      pushFeedback({ kind: 'success', message })
    } catch (error) {
      const message = replaceTemplate(copy.feedback.exportAllFailed, {
        message: error instanceof Error ? error.message : String(error),
      })
      setExportStatus({
        kind: 'error',
        message,
      })
      pushFeedback({ kind: 'error', message })
    }
  }

  const clearJournalFolder = async () => {
    try {
      await update({ dailyJournalFolder: '' })
      setFolderStatus({
        kind: 'success',
        message: copy.feedback.folderCleared,
      })
      pushFeedback({
        kind: 'success',
        message: copy.feedback.folderCleared,
      })
    } catch (error) {
      const message = replaceTemplate(copy.feedback.folderSaveFailed, {
        message: error instanceof Error ? error.message : String(error),
      })
      setFolderStatus({
        kind: 'error',
        message,
      })
      pushFeedback({ kind: 'error', message })
    }
  }

  const updateShortcutField = (field: ShortcutField, value: string) => {
    setShortcutDraft(prev => ({ ...prev, [field]: value }))
    setShortcutError('')
  }

  const handleShortcutKeyDown = (field: ShortcutField) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      updateShortcutField(field, '')
      return
    }

    const nextShortcut = shortcutFromKeyboardEvent(event)
    if (!nextShortcut) return
    event.preventDefault()
    updateShortcutField(field, nextShortcut)
  }

  const applyShortcutChanges = async () => {
    const validationError = validateShortcutSettings(normalizedShortcutDraft)
    if (validationError) {
      setShortcutError(validationError)
      return
    }

    setShortcutSaving(true)
    try {
      await update({ shortcuts: normalizedShortcutDraft })
      setShortcutError('')
    } catch (error) {
      console.error('Failed to update shortcuts:', error)
      const msg = error instanceof Error ? error.message : String(error)
      setShortcutError(msg || copy.settings.shortcutErrorFallback)
    } finally {
      setShortcutSaving(false)
    }
  }

  const resetShortcutDraft = () => {
    setShortcutDraft(DEFAULT_SHORTCUTS)
    setShortcutError('')
  }

  return (
    <div
      data-testid="settings-scroll-area"
      style={{
      background: '#f6f2ec',
      height: '100vh',
      color: '#2f2922',
      overflowY: 'auto',
      overflowX: 'hidden',
      overscrollBehavior: 'contain',
      scrollbarGutter: 'stable',
      padding: '20px clamp(12px, 3vw, 24px) 24px',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{
          marginBottom: 16,
        }}>
          <div>
            <div style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: '#8c7b68',
              marginBottom: 8,
            }}>
              {copy.settings.eyebrow}
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>{copy.settings.title}</h2>
          </div>
        </div>

        {isBrowserRuntime && (
          <div style={runtimeBannerStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              {copy.settings.desktopOnlyBannerTitle}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#7a6d5d' }}>
              {copy.settings.desktopOnlyBannerBody}
            </div>
          </div>
        )}

        <nav aria-label={copy.settings.title} style={{
          position: 'sticky', top: -20, zIndex: 1,
          display: 'flex', flexWrap: 'wrap', gap: 6,
          background: '#f6f2ec', padding: '12px 0', marginBottom: 6,
        }}>
          {settingsPages.map(page => (
            <button
              key={page.id}
              type="button"
              aria-pressed={settingsPage === page.id}
              onClick={() => setSettingsPage(page.id)}
              style={{
                border: '1px solid rgba(126,113,95,0.16)', borderRadius: 10,
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                fontWeight: settingsPage === page.id ? 700 : 500,
                color: settingsPage === page.id ? '#fff' : '#60574c',
                background: settingsPage === page.id ? '#8c6657' : '#fffdfa',
              }}
            >{page.label}</button>
          ))}
        </nav>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          alignItems: 'start',
          gap: 18,
        }}>

      <Section hidden={settingsPage !== 'general'} title={copy.settings.sections.language}>
        <Row label={copy.settings.rows.language}>
          <select
            value={settings.language}
            onChange={e => void update({ language: e.target.value as 'zh-CN' | 'en' })}
            style={{ ...inputStyle, width: 150 }}
          >
            <option value="zh-CN">{copy.settings.options.chinese}</option>
            <option value="en">{copy.settings.options.english}</option>
          </select>
        </Row>
      </Section>

      <Section hidden={settingsPage !== 'focus'} title={copy.settings.sections.timer}>
        <Row label={copy.settings.rows.defaultFocusTime}>
          <input type="number" value={settings.defaultTimerMinutes} min={1} max={120}
            onChange={e => void update({ defaultTimerMinutes: Number(e.target.value) })}
            style={inputStyle} />
        </Row>
        <Row label={copy.settings.rows.defaultRestTime}>
          <input type="number" value={settings.defaultRestMinutes} min={1} max={60}
            onChange={e => void update({ defaultRestMinutes: Number(e.target.value) })}
            style={inputStyle} />
        </Row>
      </Section>

      <Section hidden={settingsPage !== 'focus'} title={copy.settings.sections.alerts}>
        <Row label={copy.settings.rows.muteAlertSounds}>
          <input
            type="checkbox"
            checked={settings.alertMuted}
            onChange={e => void update({ alertMuted: e.target.checked })}
          />
        </Row>
        <Row label={copy.settings.rows.repeatInterval}>
          <input
            type="number"
            value={settings.alertRepeatSeconds}
            min={1}
            max={30}
            onChange={e => void update({ alertRepeatSeconds: Number(e.target.value) })}
            style={inputStyle}
          />
        </Row>
        <Row label={copy.settings.rows.alertVolume}>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.alertVolume}
            onChange={e => void update({ alertVolume: Number(e.target.value) })}
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 12, marginLeft: 8 }}>{settings.alertVolume}%</span>
        </Row>
        <Row label={copy.settings.rows.alertTone}>
          <select
            value={settings.alertTone}
            onChange={e => void update({ alertTone: e.target.value as 'soft' | 'bright' | 'chime' })}
            style={inputStyle}
          >
            <option value="soft">{copy.settings.options.soft}</option>
            <option value="bright">{copy.settings.options.bright}</option>
            <option value="chime">{copy.settings.options.chime}</option>
          </select>
        </Row>
      </Section>

      {/* Appearance */}
      <Section hidden={settingsPage !== 'general'} title={copy.settings.sections.appearance}>
        <Row label={copy.settings.rows.defaultOpacity}>
          <input type="range" min={30} max={100} value={settings.defaultOpacity * 100}
            onChange={e => void update({ defaultOpacity: Number(e.target.value) / 100 })}
            style={{ width: 120 }} />
          <span style={{ fontSize: 12, marginLeft: 8 }}>{Math.round(settings.defaultOpacity * 100)}%</span>
        </Row>
      </Section>

      {/* Calendar */}
      <Section hidden={settingsPage !== 'general'} title={copy.settings.sections.calendar}>
        <Row label={copy.settings.rows.calendarTheme}>
          <select
            data-testid="calendar-theme-select"
            value={settings.calendarTheme}
            onChange={e => void update({ calendarTheme: e.target.value as CalendarThemeId })}
            style={{ ...inputStyle, width: 150 }}
          >
            {calendarThemeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label={copy.settings.rows.weekStartsOn}>
          <select value={settings.calendarStartDay}
            onChange={e => void update({ calendarStartDay: Number(e.target.value) as 0 | 1 })}
            style={inputStyle}>
            <option value={1}>{copy.settings.options.monday}</option>
            <option value={0}>{copy.settings.options.sunday}</option>
          </select>
        </Row>
      </Section>

      <Section hidden={settingsPage !== 'data'} title={copy.settings.sections.dailyJournal}>
        <Row label={copy.settings.rows.dailyJournalFolder}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, maxWidth: '100%', minWidth: 0 }}>
            <div
              title={settings.dailyJournalFolder || copy.settings.journalFolderUnset}
              style={pathValueStyle}
            >
              {settings.dailyJournalFolder || copy.settings.journalFolderUnset}
            </div>
            <button onClick={() => void handlePickJournalFolder()} style={secondaryButtonStyle}>
              {copy.settings.chooseFolder}
            </button>
            {settings.dailyJournalFolder && (
              <button
                onClick={() => void clearJournalFolder()}
                style={{ ...secondaryButtonStyle, color: '#8c7b68' }}
              >
                {copy.settings.clearFolder}
              </button>
            )}
          </div>
        </Row>
        {folderStatus.message && (
          <StatusMessage
            kind={folderStatus.kind}
            message={folderStatus.message}
          />
        )}
      </Section>

      {/* Export */}
      <Section hidden={settingsPage !== 'data'} title={copy.settings.sections.export}>
        <Row label={copy.settings.rows.exportFormat}>
          <select value={settings.exportFormat}
            onChange={e => void update({ exportFormat: e.target.value as 'jsonl' | 'json' | 'markdown' })}
            style={inputStyle}>
            <option value="jsonl">JSONL</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
        </Row>
        <button onClick={handleExport} style={{
          marginTop: 8, padding: '10px 20px', borderRadius: 10, border: 'none',
          background: '#e7806c', color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', width: '100%',
          boxShadow: '0 12px 24px rgba(231,128,108,0.22)',
        }}>
          {copy.settings.exportAllTasks}
        </button>
        {exportStatus.message && (
          <StatusMessage
            kind={exportStatus.kind}
            message={exportStatus.message}
          />
        )}
      </Section>

      <Section hidden={settingsPage !== 'shortcuts'} title={copy.settings.sections.shortcuts}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {copy.settings.shortcutsHelp}
        </p>
        <Row label={copy.settings.rows.newTask}>
          <input
            value={formatShortcutLabel(shortcutDraft.newTask)}
            onKeyDown={handleShortcutKeyDown('newTask')}
            onChange={() => {}}
            readOnly
            style={shortcutInputStyle}
          />
        </Row>
        <Row label={copy.settings.rows.newIdea}>
          <input
            value={formatShortcutLabel(shortcutDraft.newIdea)}
            onKeyDown={handleShortcutKeyDown('newIdea')}
            onChange={() => {}}
            readOnly
            style={shortcutInputStyle}
          />
        </Row>
        <Row label={copy.settings.rows.openCalendar}>
          <input
            value={formatShortcutLabel(shortcutDraft.openCalendar)}
            onKeyDown={handleShortcutKeyDown('openCalendar')}
            onChange={() => {}}
            readOnly
            style={shortcutInputStyle}
          />
        </Row>
        {shortcutError && (
          <div style={{ fontSize: 12, color: '#ff7b7b', marginTop: 8 }}>
            {shortcutError}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => void applyShortcutChanges()}
            disabled={!shortcutsDirty || shortcutSaving}
            style={{
              ...buttonStyle,
              opacity: !shortcutsDirty || shortcutSaving ? 0.6 : 1,
              cursor: !shortcutsDirty || shortcutSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {shortcutSaving ? copy.settings.applyShortcutsSaving : copy.settings.applyShortcuts}
          </button>
          <button
            onClick={resetShortcutDraft}
            style={{ ...buttonStyle, background: '#ebe4db', color: '#60574c' }}
          >
            {copy.settings.resetDefaults}
          </button>
        </div>
      </Section>

      <Section hidden={settingsPage !== 'about'} title={settings.language === 'zh-CN' ? '关于 / 许可' : 'About / License'}>
        <p style={{ fontSize: 12, lineHeight: 1.6 }}>
          Copyright (C) 2026 Lucian W. (lucian-d-w)
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.6 }}>
          {settings.language === 'zh-CN'
            ? '本程序采用 GNU GPL 第 3 版（仅此版本，GPL-3.0-only）。你可以依照许可修改和再分发本程序；本程序不提供担保。'
            : 'GNU GPL version 3 only (GPL-3.0-only). You may modify and redistribute this program under the license. This program comes with no warranty.'}
        </p>
        <details style={{ marginTop: 10, fontSize: 12 }}>
          <summary style={{ cursor: 'pointer' }}>
            {settings.language === 'zh-CN' ? '查看 GNU GPL 第 3 版全文' : 'Read the GNU GPL version 3'}
          </summary>
          <pre style={{ maxHeight: 260, overflowY: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
            {licenseText}
          </pre>
        </details>
      </Section>
        </div>
      </div>
    </div>
  )
}

function StatusMessage({ kind, message }: { kind: StatusKind; message: string }) {
  const isPending = kind === 'pending' || kind === 'requesting_native_dialog' || kind === 'waiting_for_user'
  return (
    <div style={{
      marginTop: 10,
      fontSize: 12,
      lineHeight: 1.45,
      borderRadius: 12,
      padding: '10px 12px',
      background: kind === 'error'
        ? 'rgba(231, 128, 108, 0.12)'
        : kind === 'success'
          ? 'rgba(107, 203, 119, 0.14)'
          : isPending
            ? 'rgba(126, 113, 95, 0.12)'
            : 'rgba(126, 113, 95, 0.08)',
      color: kind === 'error'
        ? '#a34835'
        : kind === 'success'
          ? '#3c7b45'
          : '#7a6d5d',
    }}>
      {message}
    </div>
  )
}

function Section({ title, children, hidden = false }: { title: string; children: React.ReactNode; hidden?: boolean }) {
  return (
    <section hidden={hidden} style={{
      marginBottom: 0,
      background: 'rgba(255,255,255,0.74)',
      border: '1px solid rgba(126, 113, 95, 0.12)',
      borderRadius: 22,
      minWidth: 0,
      padding: '18px 18px 16px',
      boxShadow: '0 14px 34px rgba(140, 123, 104, 0.08)',
      backdropFilter: 'blur(8px)',
    }}>
      <h3 style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#8c7b68',
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
      padding: '10px 0',
      fontSize: 13,
      borderTop: '1px solid rgba(126, 113, 95, 0.08)',
    }}>
      <span style={{ color: '#60574c', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#fffdfa',
  border: '1px solid rgba(126, 113, 95, 0.18)',
  borderRadius: 10,
  padding: '8px 10px',
  color: '#2f2922',
  fontSize: 13,
  outline: 'none',
  width: 88,
  boxShadow: 'inset 0 1px 2px rgba(126, 113, 95, 0.06)',
}

const shortcutInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 170,
  cursor: 'pointer',
  textAlign: 'center',
}

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  background: '#e7806c',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  boxShadow: '0 12px 24px rgba(231,128,108,0.2)',
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(126, 113, 95, 0.16)',
  borderRadius: 10,
  padding: '8px 12px',
  background: '#fffdfa',
  color: '#60574c',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const pathValueStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(126, 113, 95, 0.12)',
  background: '#fffdfa',
  color: '#60574c',
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const runtimeBannerStyle: React.CSSProperties = {
  marginBottom: 18,
  borderRadius: 16,
  border: '1px solid rgba(231, 128, 108, 0.2)',
  background: 'rgba(231, 128, 108, 0.08)',
  padding: '12px 14px',
}
