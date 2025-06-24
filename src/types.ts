export interface Task {
  id: number
  name: string
  description: string
  effort: number
  completed: boolean
  subtasks: Task[]
}
