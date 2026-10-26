import { create } from 'zustand'

export type UiFeedbackKind = 'info' | 'success' | 'error'

export interface UiFeedbackEntry {
  id: string
  kind: UiFeedbackKind
  message: string
}

interface UiFeedbackState {
  items: UiFeedbackEntry[]
  pushFeedback: (entry: Omit<UiFeedbackEntry, 'id'> & { durationMs?: number }) => void
  removeFeedback: (id: string) => void
  clearFeedback: () => void
}

export const useUiFeedbackStore = create<UiFeedbackState>((set, get) => ({
  items: [],

  pushFeedback: ({ durationMs = 3200, ...entry }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set(state => ({
      items: [...state.items, { ...entry, id }].slice(-4),
    }))

    window.setTimeout(() => {
      get().removeFeedback(id)
    }, durationMs)
  },

  removeFeedback: (id) => {
    set(state => ({
      items: state.items.filter(item => item.id !== id),
    }))
  },

  clearFeedback: () => {
    set({ items: [] })
  },
}))
