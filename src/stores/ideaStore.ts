import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { AppSettings, DEFAULT_SETTINGS, IdeaBox } from '../types'
import { getNextIdeaStyleDefaults } from './styleDefaults'
import { markLocalStoreWrite } from '../lib/storeUpdateEcho'
import { syncIdeaTrayMenu } from '../lib/ideaWindows'
import { useSettingsStore } from './settingsStore'

const STORE_FILE = 'ideas.json'
const SAVE_DEBOUNCE_MS = 300

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface IdeaState {
  ideas: Record<string, IdeaBox>
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
  save: () => Promise<void>
  flushPendingSave: () => Promise<void>
  createIdea: (id: string) => Promise<IdeaBox>
  updateIdea: (id: string, patch: Partial<IdeaBox>) => void
  hideIdea: (id: string) => void
  showIdea: (id: string) => void
  hideAllIdeas: () => void
  showAllIdeas: () => void
  renameIdea: (id: string, title: string) => void
  deleteIdea: (id: string) => void
}

function defaultIdeaTitle(count: number) {
  return `新便签 ${count + 1}`
}

function normalizeIdea(id: string, idea: Partial<IdeaBox>, index: number): IdeaBox {
  return {
    id,
    title: idea.title?.trim() || defaultIdeaTitle(index),
    body: idea.body ?? '',
    color: idea.color ?? DEFAULT_SETTINGS.lastIdeaStyle.color,
    opacity: idea.opacity ?? DEFAULT_SETTINGS.lastIdeaStyle.opacity,
    fontSize: idea.fontSize ?? DEFAULT_SETTINGS.lastIdeaStyle.fontSize,
    fontFamily: idea.fontFamily ?? DEFAULT_SETTINGS.lastIdeaStyle.fontFamily,
    fontColor: idea.fontColor ?? DEFAULT_SETTINGS.lastIdeaStyle.fontColor,
    isVisible: idea.isVisible ?? false,
    isPinned: idea.isPinned ?? true,
    createdAt: idea.createdAt ?? new Date().toISOString(),
    windowState: idea.windowState ?? null,
  }
}

async function persistIdeas(ideas: Record<string, IdeaBox>) {
  markLocalStoreWrite(STORE_FILE)
  await invoke('save_store', { filename: STORE_FILE, data: ideas })
  await syncIdeaTrayMenu(ideas)
}

export const useIdeaStore = create<IdeaState>((set, get) => ({
  ideas: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return
    await get().reload()
  },

  reload: async () => {
    try {
      const data = await invoke<Record<string, Partial<IdeaBox>>>('load_store', { filename: STORE_FILE })
      const normalized = Object.entries(data ?? {}).reduce<Record<string, IdeaBox>>((acc, [id, idea], index) => {
        acc[id] = normalizeIdea(id, idea, index)
        return acc
      }, {})
      set({ ideas: normalized, loaded: true })
      await syncIdeaTrayMenu(normalized)
    } catch {
      set({ ideas: {}, loaded: true })
      await syncIdeaTrayMenu({})
    }
  },

  save: async () => {
    const { ideas } = get()
    await persistIdeas(ideas)
  },

  flushPendingSave: async () => {
    const hadPendingSave = Boolean(saveTimer)
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }

    if (!hadPendingSave && !get().loaded) return
    await get().save()
  },

  createIdea: async (id: string) => {
    const settingsState = useSettingsStore.getState()
    const settings: AppSettings = settingsState.settings
    const styleDefaults = settingsState.loaded
      ? settings.lastIdeaStyle
      : getNextIdeaStyleDefaults(get().ideas)
    const idea: IdeaBox = {
      id,
      title: defaultIdeaTitle(Object.keys(get().ideas).length),
      body: '',
      color: styleDefaults.color,
      opacity: styleDefaults.opacity,
      fontSize: styleDefaults.fontSize,
      fontFamily: styleDefaults.fontFamily,
      fontColor: styleDefaults.fontColor,
      isVisible: false,
      isPinned: true,
      createdAt: new Date().toISOString(),
      windowState: null,
    }
    set(s => ({ ideas: { ...s.ideas, [id]: idea } }))
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await get().save()
    return idea
  },

  updateIdea: (id, patch) => {
    let nextIdeas: Record<string, IdeaBox> | null = null
    set(s => {
      const existing = s.ideas[id]
      if (!existing) return s
      nextIdeas = { ...s.ideas, [id]: { ...existing, ...patch } }
      return { ideas: nextIdeas }
    })
    if (!nextIdeas) return

    // Tray-sensitive changes (title/visibility) must persist immediately for menu sync
    const traySensitivePatch = 'title' in patch || 'isVisible' in patch
    if (traySensitivePatch) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
      void persistIdeas(nextIdeas)
      return
    }

    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      markLocalStoreWrite(STORE_FILE)
      void invoke('save_store', { filename: STORE_FILE, data: get().ideas })
    }, SAVE_DEBOUNCE_MS)
  },

  hideIdea: (id) => {
    get().updateIdea(id, { isVisible: false })
  },

  showIdea: (id) => {
    get().updateIdea(id, { isVisible: true })
  },

  hideAllIdeas: () => {
    const nextIdeas = Object.fromEntries(
      Object.entries(get().ideas).map(([id, idea]) => [id, { ...idea, isVisible: false }]),
    )
    set({ ideas: nextIdeas })
    void persistIdeas(nextIdeas)
  },

  showAllIdeas: () => {
    const nextIdeas = Object.fromEntries(
      Object.entries(get().ideas).map(([id, idea]) => [id, { ...idea, isVisible: true }]),
    )
    set({ ideas: nextIdeas })
    void persistIdeas(nextIdeas)
  },

  renameIdea: (id, title) => {
    const fallback = get().ideas[id]?.title || '新便签'
    get().updateIdea(id, { title: title.trim() || fallback })
  },

  deleteIdea: (id) => {
    let nextIdeas: Record<string, IdeaBox> | null = null
    set(s => {
      const copy = { ...s.ideas }
      delete copy[id]
      nextIdeas = copy
      return { ideas: copy }
    })
    if (!nextIdeas) return
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    void persistIdeas(nextIdeas)
  },
}))
