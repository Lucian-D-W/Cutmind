import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { AppSettings, DEFAULT_SETTINGS } from '../types'
import { normalizeAlertSettings } from '../lib/alertSettings'
import { migrateShortcutSettings, normalizeShortcutSettings } from '../lib/shortcuts'
import { markLocalStoreWrite } from '../lib/storeUpdateEcho'

const STORE_FILE = 'settings.json'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
}

function mergeSettings(data: Partial<AppSettings>) {
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    shortcuts: {
      ...DEFAULT_SETTINGS.shortcuts,
      ...data.shortcuts,
    },
    lastIdeaStyle: {
      ...DEFAULT_SETTINGS.lastIdeaStyle,
      ...data.lastIdeaStyle,
    },
    lastTaskStyle: {
      ...DEFAULT_SETTINGS.lastTaskStyle,
      ...data.lastTaskStyle,
    },
  }
}

function normalizeSettings(data: Partial<AppSettings>) {
  const merged = mergeSettings(data)
  return normalizeAlertSettings({
    ...merged,
    shortcuts: normalizeShortcutSettings(migrateShortcutSettings(merged.shortcuts)),
  })
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    if (get().loaded) return
    await get().reload()
  },

  reload: async () => {
    try {
      const data = await invoke<AppSettings>('load_store', { filename: STORE_FILE })
      const next = normalizeSettings(data)
      const current = get()
      if (JSON.stringify(next) !== JSON.stringify(current.settings)) {
        set({
          settings: next,
          loaded: true,
        })
      } else if (!current.loaded) {
        set({ loaded: true })
      }
    } catch {
      if (!get().loaded) {
        set({ loaded: true })
      }
    }
  },

  update: async (patch) => {
    const current = get().settings
    const next = normalizeSettings({ ...current, ...patch })

    if (patch.shortcuts) {
      await invoke('update_shortcuts', { shortcuts: next.shortcuts, previous: current.shortcuts })
    }

    markLocalStoreWrite(STORE_FILE)
    await invoke('save_store', { filename: STORE_FILE, data: next })
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      set({ settings: next, loaded: true })
    } else if (!get().loaded) {
      set({ loaded: true })
    }
  },
}))
