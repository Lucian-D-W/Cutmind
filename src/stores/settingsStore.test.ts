import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'

describe('settingsStore.reload', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('normalizes legacy shortcut data without saving during reload', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'load_store') {
        return {
          ...DEFAULT_SETTINGS,
          shortcuts: {
            newTask: 'Ctrl+Shift+T',
            newIdea: 'Ctrl+Shift+I',
            openCalendar: 'ctrl+shift+k',
          },
        }
      }

      throw new Error(`unexpected invoke: ${command}`)
    })

    vi.doMock('@tauri-apps/api/core', () => ({
      invoke,
    }))

    const { useSettingsStore } = await import('./settingsStore')

    await useSettingsStore.getState().reload()

    expect(useSettingsStore.getState().settings.shortcuts).toEqual({
      newTask: 'ctrl+shift+t',
      newIdea: 'ctrl+shift+i',
      openCalendar: 'ctrl+alt+c',
    })
    expect(useSettingsStore.getState().loaded).toBe(true)
    expect(invoke).toHaveBeenCalledWith('load_store', { filename: 'settings.json' })
    expect(invoke).not.toHaveBeenCalledWith('save_store', expect.anything())
  })

  it('keeps the current settings object when reload data is effectively unchanged', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'load_store') {
        return {
          ...DEFAULT_SETTINGS,
          shortcuts: {
            newTask: 'ctrl+shift+t',
            newIdea: 'ctrl+shift+i',
            openCalendar: 'ctrl+alt+c',
          },
        }
      }

      throw new Error(`unexpected invoke: ${command}`)
    })

    vi.doMock('@tauri-apps/api/core', () => ({
      invoke,
    }))

    const { useSettingsStore } = await import('./settingsStore')
    const currentSettings = {
      ...DEFAULT_SETTINGS,
      shortcuts: {
        newTask: 'ctrl+shift+t',
        newIdea: 'ctrl+shift+i',
        openCalendar: 'ctrl+alt+c',
      },
    }

    useSettingsStore.setState({
      settings: currentSettings,
      loaded: true,
    })

    await useSettingsStore.getState().reload()

    expect(useSettingsStore.getState().settings).toBe(currentSettings)
    expect(useSettingsStore.getState().loaded).toBe(true)
    expect(invoke).toHaveBeenCalledTimes(1)
  })
})
