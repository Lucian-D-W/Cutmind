import type { IdeaBox, Task } from '../types'

export function getNextIdeaStyleDefaults(ideas: Record<string, IdeaBox>) {
  const ideaValues = Object.values(ideas)
  const lastIdea = ideaValues[ideaValues.length - 1]
  if (!lastIdea) {
    return {
      color: '#ffd93d',
      opacity: 0.95,
      fontSize: 14,
      fontFamily: 'default',
      fontColor: '#1a1a2e',
    }
  }

  return {
    color: lastIdea.color,
    opacity: lastIdea.opacity,
    fontSize: lastIdea.fontSize,
    fontFamily: lastIdea.fontFamily,
    fontColor: lastIdea.fontColor,
  }
}

export function getNextTaskStyleDefaults(tasks: Record<string, Task>) {
  const taskValues = Object.values(tasks)
  const lastTask = taskValues[taskValues.length - 1]
  if (!lastTask) {
    return {
      color: '#e94560',
      opacity: 0.95,
      titleFontSize: 15,
      titleFontFamily: 'default',
      titleFontColor: '#ffffff',
      bodyFontSize: 14,
      bodyFontFamily: 'default',
      bodyFontColor: '#ffffff',
      fontColor: '#ffffff',
    }
  }

  return {
    color: lastTask.color,
    opacity: lastTask.opacity,
    titleFontSize: lastTask.titleFontSize,
    titleFontFamily: lastTask.titleFontFamily,
    titleFontColor: lastTask.titleFontColor ?? lastTask.fontColor ?? '#ffffff',
    bodyFontSize: lastTask.bodyFontSize,
    bodyFontFamily: lastTask.bodyFontFamily,
    bodyFontColor: lastTask.bodyFontColor ?? lastTask.fontColor ?? '#ffffff',
    fontColor: lastTask.fontColor ?? lastTask.bodyFontColor ?? '#ffffff',
  }
}
