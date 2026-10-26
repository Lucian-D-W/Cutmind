import { describe, expect, it } from 'vitest'
import { getNextIdeaStyleDefaults, getNextTaskStyleDefaults } from './styleDefaults'
import type { IdeaBox, Task } from '../types'

describe('styleDefaults', () => {
  it('reuses the last idea style for new idea windows', () => {
    const lastIdea: IdeaBox = {
      id: 'idea-1',
      title: '新便签 1',
      body: '',
      color: '#123456',
      opacity: 0.42,
      fontSize: 22,
      fontFamily: 'Microsoft YaHei',
      fontColor: '#eeeeee',
      isVisible: false,
      isPinned: true,
      createdAt: '2026-04-06T10:00:00.000Z',
      windowState: null,
    }

    expect(getNextIdeaStyleDefaults({ a: lastIdea })).toEqual({
      color: '#123456',
      opacity: 0.42,
      fontSize: 22,
      fontFamily: 'Microsoft YaHei',
      fontColor: '#eeeeee',
    })
  })

  it('reuses the last task style for new task windows', () => {
    const lastTask: Task = {
      id: 'task-1',
      title: '',
      body: '',
      color: '#654321',
      opacity: 0.55,
      isPinned: true,
      showResetButton: false,
      tags: [],
      timerMinutes: 25,
      elapsedSeconds: 0,
      isRunning: false,
      isCompleted: false,
      isPlanningNextTask: false,
      isResting: false,
      restSeconds: 300,
      nextTaskDraft: null,
      nextStepMode: null,
      focusRecords: [],
      startTime: null,
      endTime: null,
      titleFontSize: 20,
      titleFontFamily: 'Georgia',
      titleFontColor: '#111111',
      bodyFontSize: 16,
      bodyFontFamily: 'Consolas',
      bodyFontColor: '#222222',
      fontColor: '#ffffff',
      createdAt: '2026-04-06T11:00:00.000Z',
      completedAt: null,
      windowState: null,
    }

    expect(getNextTaskStyleDefaults({ a: lastTask })).toEqual({
      color: '#654321',
      opacity: 0.55,
      titleFontSize: 20,
      titleFontFamily: 'Georgia',
      titleFontColor: '#111111',
      bodyFontSize: 16,
      bodyFontFamily: 'Consolas',
      bodyFontColor: '#222222',
      fontColor: '#ffffff',
    })
  })
})
