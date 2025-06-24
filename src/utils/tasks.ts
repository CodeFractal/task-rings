import type { Task } from '../types'

export function getTasksAtPath(tasks: Task[], path: number[]): Task[] {
  let list = tasks
  for (const id of path) {
    const t = list.find((x) => x.id === id)
    if (!t) return []
    list = t.subtasks
  }
  return list
}

export function getTaskByPath(tasks: Task[], path: number[]): Task | null {
  let list = tasks
  let current: Task | null = null
  for (const id of path) {
    current = list.find((x) => x.id === id) || null
    if (!current) return null
    list = current.subtasks
  }
  return current
}

export function updateTaskAtPath(
  tasks: Task[],
  path: number[],
  updater: (t: Task) => Task,
): Task[] {
  if (path.length === 0) return tasks
  const [id, ...rest] = path
  return tasks.map((t) => {
    if (t.id !== id) return t
    if (rest.length === 0) return updater(t)
    return { ...t, subtasks: updateTaskAtPath(t.subtasks, rest, updater) }
  })
}

export function addTaskAtPath(tasks: Task[], path: number[], task: Task): Task[] {
  if (path.length === 0) return [...tasks, task]
  const [id, ...rest] = path
  return tasks.map((t) => {
    if (t.id !== id) return t
    return { ...t, subtasks: addTaskAtPath(t.subtasks, rest, task) }
  })
}

export function deleteTaskAtPath(tasks: Task[], path: number[]): Task[] {
  if (path.length === 1) return tasks.filter((t) => t.id !== path[0])
  const [id, ...rest] = path
  return tasks.map((t) => {
    if (t.id !== id) return t
    return { ...t, subtasks: deleteTaskAtPath(t.subtasks, rest) }
  })
}
