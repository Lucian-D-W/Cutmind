import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { Task, AppSettings, DEFAULT_SETTINGS } from '../types'
import { markLocalStoreWrite } from '../lib/storeUpdateEcho'
import { getNextTaskStyleDefaults } from './styleDefaults'
import { useSettingsStore } from './settingsStore'

const STORE_FILE = 'tasks.json'
const SAVE_DEBOUNCE_MS = 300

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface TaskState {
  tasks: Record<string, Task>
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
  save: () => Promise<void>
  flushPendingSave: () => Promise<void>
  createTask: (id: string) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
}

function normalizeTask(id: string, task: Partial<Task>): Task {
  return {
    id,
    title: task.title ?? '',
    body: task.body ?? '',
    color: task.color ?? DEFAULT_SETTINGS.lastTaskStyle.color,
    opacity: task.opacity ?? DEFAULT_SETTINGS.lastTaskStyle.opacity,
    isPinned: task.isPinned ?? true,
    showResetButton: task.showResetButton ?? false,
    tags: task.tags ?? [],
    timerMinutes: task.timerMinutes ?? DEFAULT_SETTINGS.defaultTimerMinutes,
    elapsedSeconds: task.elapsedSeconds ?? 0,
    isRunning: task.isRunning ?? false,
    isCompleted: task.isCompleted ?? false,
    isPlanningNextTask: task.isPlanningNextTask ?? false,
    isResting: task.isResting ?? false,
    restSeconds: task.restSeconds ?? DEFAULT_SETTINGS.defaultRestMinutes * 60,
    nextTaskDraft: task.nextTaskDraft ?? null,
    nextStepMode: task.nextStepMode ?? null,
    focusRecords: task.focusRecords ?? [],
    startTime: task.startTime ?? null,
    endTime: task.endTime ?? null,
    titleFontSize: task.titleFontSize ?? DEFAULT_SETTINGS.lastTaskStyle.titleFontSize,
    titleFontFamily: task.titleFontFamily ?? DEFAULT_SETTINGS.lastTaskStyle.titleFontFamily,
    titleFontColor: task.titleFontColor ?? DEFAULT_SETTINGS.lastTaskStyle.titleFontColor,
    bodyFontSize: task.bodyFontSize ?? DEFAULT_SETTINGS.lastTaskStyle.bodyFontSize,
    bodyFontFamily: task.bodyFontFamily ?? DEFAULT_SETTINGS.lastTaskStyle.bodyFontFamily,
    bodyFontColor: task.bodyFontColor ?? DEFAULT_SETTINGS.lastTaskStyle.bodyFontColor,
    fontColor: task.fontColor ?? DEFAULT_SETTINGS.lastTaskStyle.fontColor,
    createdAt: task.createdAt ?? new Date().toISOString(),
    completedAt: task.completedAt ?? null,
    windowState: task.windowState ?? null,
  }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return
    await get().reload()
  },

  reload: async () => {
    try {
      const data = await invoke<Record<string, Partial<Task>>>('load_store', { filename: STORE_FILE })
      const normalized = Object.entries(data ?? {}).reduce<Record<string, Task>>((acc, [id, task]) => {
        acc[id] = normalizeTask(id, task)
        return acc
      }, {})
      set({ tasks: normalized, loaded: true })
    } catch {
      set({ tasks: {}, loaded: true })
    }
  },

  save: async () => {
    const { tasks } = get()
    markLocalStoreWrite(STORE_FILE)
    await invoke('save_store', { filename: STORE_FILE, data: tasks })
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

  createTask: async (id: string) => {
    const settingsState = useSettingsStore.getState()
    const settings: AppSettings = settingsState.settings
    const styleDefaults = settingsState.loaded
      ? settings.lastTaskStyle
      : getNextTaskStyleDefaults(get().tasks)
    const task: Task = {
      id,
      title: '',
      body: '',
      color: styleDefaults.color,
      opacity: styleDefaults.opacity,
      isPinned: true,
      showResetButton: false,
      tags: [],
      timerMinutes: settings.defaultTimerMinutes,
      elapsedSeconds: 0,
      isRunning: false,
      isCompleted: false,
      isPlanningNextTask: false,
      isResting: false,
      restSeconds: settings.defaultRestMinutes * 60,
      nextTaskDraft: null,
      nextStepMode: null,
      focusRecords: [],
      startTime: null,
      endTime: null,
      titleFontSize: styleDefaults.titleFontSize,
      titleFontFamily: styleDefaults.titleFontFamily,
      titleFontColor: styleDefaults.titleFontColor,
      bodyFontSize: styleDefaults.bodyFontSize,
      bodyFontFamily: styleDefaults.bodyFontFamily,
      bodyFontColor: styleDefaults.bodyFontColor,
      fontColor: styleDefaults.fontColor,
      createdAt: new Date().toISOString(),
      completedAt: null,
      windowState: null,
    }
    set(s => ({ tasks: { ...s.tasks, [id]: task } }))
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await get().save()
    return task
  },

  updateTask: (id, patch) => {
    set(s => {
      const existing = s.tasks[id]
      if (!existing) return s
      return { tasks: { ...s.tasks, [id]: { ...existing, ...patch } } }
    })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      void get().save()
    }, SAVE_DEBOUNCE_MS)
  },

  deleteTask: (id) => {
    set(s => {
      const copy = { ...s.tasks }
      delete copy[id]
      return { tasks: copy }
    })
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    get().save()
  },
}))
