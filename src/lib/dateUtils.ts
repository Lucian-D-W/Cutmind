import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, startOfDay, addDays, getDay,
} from 'date-fns'
import { getDateLocale } from './i18n'
import type { AppLanguage } from '../types'

export function getMonthGrid(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn })
  return eachDayOfInterval({ start, end })
}

export function getWeekDays(weekStartsOn: 0 | 1 = 1, language: AppLanguage = 'zh-CN'): string[] {
  const base = new Date(2024, 0, weekStartsOn === 1 ? 1 : 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return format(d, 'EEE', { locale: getDateLocale(language) })
  })
}

export function getWeekRange(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(date, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export { format, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, getDay }
