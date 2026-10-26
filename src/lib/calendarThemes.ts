import type { CalendarThemeId } from '../types'

export interface CalendarThemeTokens {
  id: CalendarThemeId
  background: string
  headerBackground: string
  surface: string
  surfaceMuted: string
  surfaceHover: string
  popoverBackground: string
  border: string
  text: string
  secondaryText: string
  mutedText: string
  accent: string
  accentText: string
  accentSoft: string
  todayBackground: string
  todayBorder: string
  timeAxisBackground: string
  taskCardBackground: string
  taskCardDraggingBackground: string
  taskCardText: string
  taskMetaText: string
  buttonBackground: string
  buttonText: string
  buttonActiveBackground: string
  buttonActiveText: string
}

export const CALENDAR_THEMES: Record<CalendarThemeId, CalendarThemeTokens> = {
  'warm-day': {
    id: 'warm-day',
    background: '#f6f2ec',
    headerBackground: 'rgba(255,255,255,0.72)',
    surface: 'rgba(255,255,255,0.78)',
    surfaceMuted: 'rgba(239,232,222,0.65)',
    surfaceHover: 'rgba(255,255,255,0.94)',
    popoverBackground: 'rgba(255,255,255,0.96)',
    border: 'rgba(126,113,95,0.12)',
    text: '#2f2922',
    secondaryText: '#60574c',
    mutedText: '#958877',
    accent: '#e7806c',
    accentText: '#ffffff',
    accentSoft: 'rgba(231,128,108,0.12)',
    todayBackground: 'rgba(231,128,108,0.11)',
    todayBorder: 'rgba(231,128,108,0.5)',
    timeAxisBackground: 'rgba(255,255,255,0.72)',
    taskCardBackground: 'rgba(255,255,255,0.96)',
    taskCardDraggingBackground: '#e7806c',
    taskCardText: '#2f2922',
    taskMetaText: '#7e715f',
    buttonBackground: '#ebe4db',
    buttonText: '#60574c',
    buttonActiveBackground: '#e7806c',
    buttonActiveText: '#ffffff',
  },
  night: {
    id: 'night',
    background: '#161b24',
    headerBackground: 'rgba(31,37,48,0.9)',
    surface: 'rgba(42,49,62,0.92)',
    surfaceMuted: 'rgba(28,33,43,0.88)',
    surfaceHover: 'rgba(52,61,76,0.96)',
    popoverBackground: 'rgba(24,29,38,0.98)',
    border: 'rgba(119,130,150,0.24)',
    text: '#f0eee8',
    secondaryText: '#d0cabf',
    mutedText: '#9ea6b4',
    accent: '#7da2ff',
    accentText: '#0f1520',
    accentSoft: 'rgba(125,162,255,0.16)',
    todayBackground: 'rgba(125,162,255,0.12)',
    todayBorder: 'rgba(125,162,255,0.46)',
    timeAxisBackground: 'rgba(26,31,40,0.94)',
    taskCardBackground: 'rgba(36,43,55,0.98)',
    taskCardDraggingBackground: '#7da2ff',
    taskCardText: '#f5f2ea',
    taskMetaText: '#c6cfdd',
    buttonBackground: '#313847',
    buttonText: '#e7e2d7',
    buttonActiveBackground: '#7da2ff',
    buttonActiveText: '#0f1520',
  },
  morandi: {
    id: 'morandi',
    background: '#ece7e0',
    headerBackground: 'rgba(245,241,234,0.86)',
    surface: 'rgba(250,247,242,0.92)',
    surfaceMuted: 'rgba(224,217,208,0.78)',
    surfaceHover: 'rgba(255,251,246,0.98)',
    popoverBackground: 'rgba(248,244,237,0.98)',
    border: 'rgba(148,134,123,0.18)',
    text: '#4f463f',
    secondaryText: '#6f645c',
    mutedText: '#95867c',
    accent: '#9caf88',
    accentText: '#ffffff',
    accentSoft: 'rgba(156,175,136,0.16)',
    todayBackground: 'rgba(156,175,136,0.12)',
    todayBorder: 'rgba(156,175,136,0.44)',
    timeAxisBackground: 'rgba(244,240,233,0.9)',
    taskCardBackground: 'rgba(255,252,247,0.96)',
    taskCardDraggingBackground: '#9caf88',
    taskCardText: '#4f463f',
    taskMetaText: '#80746b',
    buttonBackground: '#e1d8cf',
    buttonText: '#5c534c',
    buttonActiveBackground: '#9caf88',
    buttonActiveText: '#ffffff',
  },
  dunhuang: {
    id: 'dunhuang',
    background: '#f1e0c9',
    headerBackground: 'rgba(252,243,228,0.88)',
    surface: 'rgba(255,248,236,0.94)',
    surfaceMuted: 'rgba(230,210,185,0.84)',
    surfaceHover: 'rgba(255,250,240,0.98)',
    popoverBackground: 'rgba(255,247,235,0.98)',
    border: 'rgba(134,97,67,0.2)',
    text: '#4d3528',
    secondaryText: '#6e4c38',
    mutedText: '#8f735c',
    accent: '#2b5e72',
    accentText: '#ffffff',
    accentSoft: 'rgba(43,94,114,0.16)',
    todayBackground: 'rgba(212,156,78,0.16)',
    todayBorder: 'rgba(168,67,46,0.42)',
    timeAxisBackground: 'rgba(250,240,221,0.92)',
    taskCardBackground: 'rgba(255,250,242,0.96)',
    taskCardDraggingBackground: '#a8432e',
    taskCardText: '#4d3528',
    taskMetaText: '#7f624e',
    buttonBackground: '#ead5ba',
    buttonText: '#654735',
    buttonActiveBackground: '#2b5e72',
    buttonActiveText: '#ffffff',
  },
  earth: {
    id: 'earth',
    background: '#ede3d6',
    headerBackground: 'rgba(246,238,229,0.9)',
    surface: 'rgba(251,246,239,0.94)',
    surfaceMuted: 'rgba(224,205,181,0.76)',
    surfaceHover: 'rgba(255,250,244,0.98)',
    popoverBackground: 'rgba(251,245,237,0.98)',
    border: 'rgba(117,96,73,0.2)',
    text: '#433528',
    secondaryText: '#6b5845',
    mutedText: '#8f7a64',
    accent: '#606c38',
    accentText: '#ffffff',
    accentSoft: 'rgba(96,108,56,0.16)',
    todayBackground: 'rgba(221,161,94,0.16)',
    todayBorder: 'rgba(188,108,37,0.4)',
    timeAxisBackground: 'rgba(247,239,229,0.92)',
    taskCardBackground: 'rgba(255,251,245,0.96)',
    taskCardDraggingBackground: '#bc6c25',
    taskCardText: '#433528',
    taskMetaText: '#75614f',
    buttonBackground: '#e8d7be',
    buttonText: '#5f4b37',
    buttonActiveBackground: '#606c38',
    buttonActiveText: '#ffffff',
  },
}

export function getCalendarTheme(themeId: CalendarThemeId) {
  return CALENDAR_THEMES[themeId]
}

export function buildCalendarThemeVars(themeId: CalendarThemeId): Record<string, string> {
  const theme = getCalendarTheme(themeId)
  return {
    '--calendar-bg': theme.background,
    '--calendar-header-bg': theme.headerBackground,
    '--calendar-surface': theme.surface,
    '--calendar-surface-muted': theme.surfaceMuted,
    '--calendar-surface-hover': theme.surfaceHover,
    '--calendar-popover-bg': theme.popoverBackground,
    '--calendar-border': theme.border,
    '--calendar-text': theme.text,
    '--calendar-secondary-text': theme.secondaryText,
    '--calendar-muted-text': theme.mutedText,
    '--calendar-accent': theme.accent,
    '--calendar-accent-text': theme.accentText,
    '--calendar-accent-soft': theme.accentSoft,
    '--calendar-today-bg': theme.todayBackground,
    '--calendar-today-border': theme.todayBorder,
    '--calendar-time-axis-bg': theme.timeAxisBackground,
    '--calendar-task-card-bg': theme.taskCardBackground,
    '--calendar-task-card-dragging-bg': theme.taskCardDraggingBackground,
    '--calendar-task-card-text': theme.taskCardText,
    '--calendar-task-meta-text': theme.taskMetaText,
    '--calendar-button-bg': theme.buttonBackground,
    '--calendar-button-text': theme.buttonText,
    '--calendar-button-active-bg': theme.buttonActiveBackground,
    '--calendar-button-active-text': theme.buttonActiveText,
  }
}
