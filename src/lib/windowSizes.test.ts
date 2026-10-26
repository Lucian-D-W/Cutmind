import { describe, expect, it } from 'vitest'
import { IDEA_WINDOW_DEFAULT_SIZE, TASK_WINDOW_DEFAULT_SIZE } from './windowSizes'

describe('windowSizes', () => {
  it('provides room for task controls, notes, and the next-step form by default', () => {
    expect(TASK_WINDOW_DEFAULT_SIZE).toEqual({
      width: 420,
      height: 520,
    })
  })

  it('keeps the default idea window compact', () => {
    expect(IDEA_WINDOW_DEFAULT_SIZE).toEqual({
      width: 442,
      height: 374,
    })
  })
})
