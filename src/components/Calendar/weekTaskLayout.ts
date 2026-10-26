import { getTaskDurationMinutes, getTaskEnd, getTaskStart } from '../../lib/taskMeta'
import type { Task } from '../../types'

export interface WeekTaskLaneLayout {
  laneIndex: number
  laneCount: number
}

interface TaskInterval {
  taskId: string
  startMinutes: number
  endMinutes: number
}

function clampTaskInterval(task: Task): TaskInterval {
  const start = getTaskStart(task)
  const fallbackEnd = new Date(start.getTime() + getTaskDurationMinutes(task) * 60 * 1000)
  const end = getTaskEnd(task) ?? fallbackEnd
  const startMinutes = Math.max(0, Math.min(24 * 60 - 15, start.getHours() * 60 + start.getMinutes()))
  const rawEndMinutes = end.getHours() * 60 + end.getMinutes()
  const endMinutes = Math.max(startMinutes + 15, Math.min(24 * 60, rawEndMinutes))

  return {
    taskId: task.id,
    startMinutes,
    endMinutes,
  }
}

function assignClusterLanes(cluster: TaskInterval[], layouts: Map<string, WeekTaskLaneLayout>) {
  if (cluster.length === 0) return

  const laneEndMinutes: number[] = []
  const pendingAssignments: Array<{ taskId: string; laneIndex: number }> = []

  for (const task of cluster) {
    const laneIndex = laneEndMinutes.findIndex(endMinutes => endMinutes <= task.startMinutes)
    if (laneIndex === -1) {
      laneEndMinutes.push(task.endMinutes)
      pendingAssignments.push({
        taskId: task.taskId,
        laneIndex: laneEndMinutes.length - 1,
      })
      continue
    }

    laneEndMinutes[laneIndex] = task.endMinutes
    pendingAssignments.push({
      taskId: task.taskId,
      laneIndex,
    })
  }

  const laneCount = getClusterLaneCount(cluster)
  pendingAssignments.forEach(({ taskId, laneIndex }) => {
    layouts.set(taskId, { laneIndex, laneCount })
  })
}

function getClusterLaneCount(cluster: TaskInterval[]) {
  const events = cluster.flatMap(task => ([
    { minute: task.startMinutes, delta: 1 },
    { minute: task.endMinutes, delta: -1 },
  ]))

  events.sort((left, right) => {
    if (left.minute !== right.minute) {
      return left.minute - right.minute
    }
    return left.delta - right.delta
  })

  let activeCount = 0
  let maxActiveCount = 0

  events.forEach(event => {
    activeCount += event.delta
    maxActiveCount = Math.max(maxActiveCount, activeCount)
  })

  return Math.max(1, maxActiveCount)
}

export function buildWeekTaskLaneLayout(tasks: Task[]) {
  const sortedIntervals = tasks
    .map(clampTaskInterval)
    .sort((left, right) => {
      if (left.startMinutes !== right.startMinutes) {
        return left.startMinutes - right.startMinutes
      }
      if (left.endMinutes !== right.endMinutes) {
        return left.endMinutes - right.endMinutes
      }
      return left.taskId.localeCompare(right.taskId)
    })

  const layouts = new Map<string, WeekTaskLaneLayout>()
  let cluster: TaskInterval[] = []
  let clusterEndMinutes = -1

  sortedIntervals.forEach(interval => {
    if (cluster.length === 0 || interval.startMinutes < clusterEndMinutes) {
      cluster.push(interval)
      clusterEndMinutes = Math.max(clusterEndMinutes, interval.endMinutes)
      return
    }

    assignClusterLanes(cluster, layouts)
    cluster = [interval]
    clusterEndMinutes = interval.endMinutes
  })

  assignClusterLanes(cluster, layouts)
  return layouts
}
