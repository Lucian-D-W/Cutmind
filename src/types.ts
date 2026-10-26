export interface Task {
  id: string
  title: string
  body: string
  color: string
  opacity: number
  isPinned: boolean
  showResetButton: boolean
  tags: string[]
  timerMinutes: number
  elapsedSeconds: number
  isRunning: boolean
  isCompleted: boolean
  isPlanningNextTask: boolean
  isResting: boolean
  restSeconds: number
  nextTaskDraft: NextTaskDraft | null
  nextStepMode: NextStepMode | null
  focusRecords: TaskFocusRecord[]
  startTime: string | null
  endTime: string | null
  titleFontSize: number
  titleFontFamily: string
  titleFontColor: string
  bodyFontSize: number
  bodyFontFamily: string
  bodyFontColor: string
  fontColor: string
  createdAt: string
  completedAt: string | null
  windowState: WindowState | null
}

export interface NextTaskDraft {
  title: string
  body: string
  restMinutes: number
  minimumRestMinutes: number
}

export type NextStepMode = 'continue' | 'retitle' | 'new-task' | 'finish-task'

export interface TaskFocusRecord {
  startedAt: string
  endedAt: string | null
}

export interface IdeaBox {
  id: string
  title: string
  body: string
  color: string
  opacity: number
  fontSize: number
  fontFamily: string
  fontColor: string
  isVisible: boolean
  isPinned: boolean
  createdAt: string
  windowState: WindowState | null
}

export interface WindowState {
  /** Screen coordinates are physical pixels. Unmarked legacy sizes are physical. */
  x: number
  y: number
  width: number
  height: number
  sizeUnit?: 'logical'
}

export interface AppSettings {
  language: AppLanguage
  defaultTimerMinutes: number
  defaultRestMinutes: number
  alertMuted: boolean
  alertRepeatSeconds: number
  alertVolume: number
  alertTone: 'soft' | 'bright' | 'chime'
  defaultColor: string
  defaultOpacity: number
  lastIdeaStyle: {
    color: string
    opacity: number
    fontSize: number
    fontFamily: string
    fontColor: string
  }
  lastTaskStyle: {
    color: string
    opacity: number
    titleFontSize: number
    titleFontFamily: string
    titleFontColor: string
    bodyFontSize: number
    bodyFontFamily: string
    bodyFontColor: string
    fontColor: string
  }
  calendarStartDay: 0 | 1
  calendarTheme: CalendarThemeId
  exportFormat: 'jsonl' | 'json' | 'markdown'
  dailyJournalFolder: string
  windowCloseBehavior: WindowCloseBehavior
  shortcuts: {
    newTask: string
    newIdea: string
    openCalendar: string
  }
}

export type AppLanguage = 'zh-CN' | 'en'
export type WindowCloseBehavior = 'close' | 'minimize'
export type CalendarThemeId = 'warm-day' | 'night' | 'morandi' | 'dunhuang' | 'earth'

export const DEFAULT_SHORTCUTS = {
  newTask: 'Ctrl+Shift+T',
  newIdea: 'Ctrl+Shift+I',
  openCalendar: 'Ctrl+Alt+C',
} as const

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  defaultTimerMinutes: 25,
  defaultRestMinutes: 5,
  alertMuted: false,
  alertRepeatSeconds: 2,
  alertVolume: 70,
  alertTone: 'chime',
  defaultColor: '#e94560',
  defaultOpacity: 0.95,
  lastIdeaStyle: {
    color: '#ffd93d',
    opacity: 0.95,
    fontSize: 14,
    fontFamily: 'default',
    fontColor: '#1a1a2e',
  },
  lastTaskStyle: {
    color: '#e94560',
    opacity: 0.95,
    titleFontSize: 15,
    titleFontFamily: 'default',
    titleFontColor: '#ffffff',
    bodyFontSize: 14,
    bodyFontFamily: 'default',
    bodyFontColor: '#ffffff',
    fontColor: '#ffffff',
  },
  calendarStartDay: 1,
  calendarTheme: 'warm-day',
  exportFormat: 'jsonl',
  dailyJournalFolder: '',
  windowCloseBehavior: 'close',
  shortcuts: DEFAULT_SHORTCUTS,
}

export type ViewType = 'task' | 'idea' | 'calendar' | 'settings'
