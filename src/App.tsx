import { useEffect, useRef, useState } from 'react'
import EditableField, { type EditableFieldHandle } from './EditableField'
import './App.css'
import Modal from './Modal'
import {
  polarToCartesian,
  describeArc,
  describeRingArc,
  calculateAngles,
  calculateRotation,
} from './utils/pie'

const VERSION =
  document.querySelector<HTMLMetaElement>('meta[name="build-version"]')?.content ||
  '0.0.0'

interface Task {
  id: number
  name: string
  description: string
  effort: number
  completed: boolean
  subtasks: Task[]
}

function useIsMobile() {
  const query = '(max-width: 600px)'
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

function getTasksAtPath(tasks: Task[], path: number[]): Task[] {
  let list = tasks
  for (const id of path) {
    const t = list.find((x) => x.id === id)
    if (!t) return []
    list = t.subtasks
  }
  return list
}

function getTaskByPath(tasks: Task[], path: number[]): Task | null {
  let list = tasks
  let current: Task | null = null
  for (const id of path) {
    current = list.find((x) => x.id === id) || null
    if (!current) return null
    list = current.subtasks
  }
  return current
}

function updateTaskAtPath(
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

function addTaskAtPath(tasks: Task[], path: number[], task: Task): Task[] {
  if (path.length === 0) return [...tasks, task]
  const [id, ...rest] = path
  return tasks.map((t) => {
    if (t.id !== id) return t
    return { ...t, subtasks: addTaskAtPath(t.subtasks, rest, task) }
  })
}

function deleteTaskAtPath(tasks: Task[], path: number[]): Task[] {
  if (path.length === 1) return tasks.filter((t) => t.id !== path[0])
  const [id, ...rest] = path
  return tasks.map((t) => {
    if (t.id !== id) return t
    return { ...t, subtasks: deleteTaskAtPath(t.subtasks, rest) }
  })
}


function PieChart({
  tasks,
  path,
  onSelect,
  onUp,
}: {
  tasks: Task[]
  path: number[]
  onSelect: (p: number[]) => void
  onUp: () => void
}) {
  const isMobile = useIsMobile()

  if (tasks.length === 0) {
    return <p>No tasks yet</p>
  }

  const parentPath = path.slice(0, -1)
  const currentTasks = getTasksAtPath(tasks, parentPath)
  const selectedId = path[path.length - 1] ?? null
  const angles = calculateAngles(currentTasks)
  const selectedIndex = currentTasks.findIndex((t) => t.id === selectedId)
  const rotation =
    selectedIndex >= 0 ? calculateRotation(angles[selectedIndex].mid, isMobile) : 0
  const rotationDeg = (rotation * 180) / Math.PI
  const selectedTask = selectedIndex >= 0 ? currentTasks[selectedIndex] : null
  const childTasks = selectedTask ? selectedTask.subtasks : []
  const childAngles = calculateAngles(childTasks)

  const r1 = 70
  const r2 = 100

  const parentName = parentPath.length ? getTaskByPath(tasks, parentPath)?.name : ''

  return (
    <svg className="pie" viewBox="-110 -110 220 220" width={220} height={220}>
      {parentPath.length > 0 && (
        <g onClick={onUp} className="parent">
          <circle cx={0} cy={0} r={r1 * 0.4} fill="#444" stroke="#000" />
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
            {parentName}
          </text>
        </g>
      )}
      <g transform={`rotate(${rotationDeg})`} className="current">
        {currentTasks.map((task, i) => {
          const { start, end, mid } = angles[i]
          const pathD = describeArc(0, 0, r1, start, end)
          const color = task.completed ? '#006400' : '#555'
          const textPos = polarToCartesian(0, 0, r1 * 0.6, mid)
          return (
            <g key={task.id} onClick={() => onSelect([...parentPath, task.id])}>
              <path
                d={pathD}
                fill={color}
                stroke="#000"
                strokeWidth={1}
                className={task.id === selectedId ? 'selected' : undefined}
              />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                transform={`rotate(${ -rotationDeg } ${textPos.x} ${textPos.y})`}
              >
                {task.name}
              </text>
            </g>
          )
        })}
      </g>
      {selectedTask && childTasks.length > 0 && (
        <g transform={`rotate(${rotationDeg})`} className="children">
          {childTasks.map((task, i) => {
            const { start, end, mid } = childAngles[i]
            const pathD = describeRingArc(0, 0, r1 + 5, r2, start, end)
            const color = task.completed ? '#228b22' : '#777'
            const textPos = polarToCartesian(0, 0, (r1 + r2) / 2, mid)
            return (
              <g key={task.id} onClick={() => onSelect([...path, task.id])}>
                <path d={pathD} fill={color} stroke="#000" />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  transform={`rotate(${ -rotationDeg } ${textPos.x} ${textPos.y})`}
                >
                  {task.name}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )
}

let nextId = 1

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [path, setPath] = useState<number[]>([])
  const [pendingName, setPendingName] = useState(false)
  const [pendingDesc, setPendingDesc] = useState(false)
  const [pendingEffort, setPendingEffort] = useState(false)
  const [targetPath, setTargetPath] = useState<number[] | null>(null)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [confirmDeletePath, setConfirmDeletePath] = useState<number[] | null>(
    null,
  )

  const nameRef = useRef<EditableFieldHandle>(null)
  const descRef = useRef<EditableFieldHandle>(null)
  const effortRef = useRef<EditableFieldHandle>(null)

  const hasPending = pendingName || pendingDesc || pendingEffort

  const createTask = () => {
    const newTask: Task = {
      id: nextId++,
      name: `New Task ${tasks.length + 1}`,
      description: '',
      effort: 100,
      completed: false,
      subtasks: [],
    }
    setTasks(addTaskAtPath(tasks, [], newTask))
    setPath([newTask.id])
  }

  const addTask = () => {
    if (hasPending) {
      setPendingAdd(true)
      setShowUnsavedModal(true)
    } else {
      createTask()
    }
  }

  const addSubtask = () => {
    const parent = getTaskByPath(tasks, path)
    const subIndex = parent ? parent.subtasks.length + 1 : 1
    const newTask: Task = {
      id: nextId++,
      name: `Subtask ${subIndex}`,
      description: '',
      effort: 100,
      completed: false,
      subtasks: [],
    }
    setTasks(addTaskAtPath(tasks, path, newTask))
    setPath([...path, newTask.id])
  }

  const updateTaskFields = (fields: Partial<Task>) => {
    setTasks(updateTaskAtPath(tasks, path, (t) => ({ ...t, ...fields })))
  }

  const deleteTask = () => {
    setTasks(deleteTaskAtPath(tasks, path))
    setPath(path.slice(0, -1))
  }

  const handleSelect = (p: number[]) => {
    if (p.join('/') === path.join('/')) return
    if (hasPending) {
      setTargetPath(p)
      setShowUnsavedModal(true)
    } else {
      setPath(p)
    }
  }

  const saveAll = () => {
    nameRef.current?.save()
    descRef.current?.save()
    effortRef.current?.save()
    setShowUnsavedModal(false)
    if (targetPath !== null) {
      setPath(targetPath)
      setTargetPath(null)
    }
    if (pendingAdd) {
      createTask()
      setPendingAdd(false)
    }
  }

  const discardAll = () => {
    nameRef.current?.revert()
    descRef.current?.revert()
    effortRef.current?.revert()
    setShowUnsavedModal(false)
    if (targetPath !== null) {
      setPath(targetPath)
      setTargetPath(null)
    }
    if (pendingAdd) {
      createTask()
      setPendingAdd(false)
    }
  }

  const selected = getTaskByPath(tasks, path)

  return (
    <div id="appRoot">
      <div className="menu-bar">
        <span className="version">v{VERSION}</span>
        <button onClick={addTask}>+</button>
      </div>
      <div className="split">
        <div className="task-picker">
          <PieChart
            tasks={tasks}
            path={path}
            onSelect={handleSelect}
            onUp={() => setPath(path.slice(0, -1))}
          />
        </div>
        <div className="task-details">
          {selected ? (
            <form>
              <div>
                <label>
                  Name
                  <EditableField
                    ref={nameRef}
                    value={selected.name}
                    onDirtyChange={setPendingName}
                    onSave={(v) => updateTaskFields({ name: v as string })}
                  />
                </label>
              </div>
              <div>
                <label>
                  Description
                  <br />
                  <EditableField
                    ref={descRef}
                    multiline
                    value={selected.description}
                    onDirtyChange={setPendingDesc}
                    onSave={(v) => updateTaskFields({ description: v as string })}
                  />
                </label>
              </div>
              <div>
                <label>
                  Effort
                  <EditableField
                    ref={effortRef}
                    inputType="number"
                    inputProps={{ min: 0 }}
                    value={selected.effort}
                    onDirtyChange={setPendingEffort}
                    onSave={(v) => updateTaskFields({ effort: Number(v) })}
                  />
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.completed}
                    onChange={(e) =>
                      updateTaskFields({ completed: e.target.checked })
                    }
                  />{' '}
                  Completed
                </label>
              </div>
              <button type="button" onClick={addSubtask}>Add Subtask</button>
              <button type="button" onClick={() => setConfirmDeletePath(path)}>
                Delete Task
              </button>
            </form>
          ) : (
            <p>No task selected</p>
          )}
        </div>
      </div>
      {showUnsavedModal && (
        <Modal onClose={() => setShowUnsavedModal(false)}>
          <p>You have unsaved changes.</p>
          <div className="modal-buttons">
            <button onClick={saveAll}>Save</button>
            <button onClick={discardAll}>Discard</button>
            <button onClick={() => setShowUnsavedModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
      {confirmDeletePath !== null && (
        <Modal onClose={() => setConfirmDeletePath(null)}>
          <p>Delete this task?</p>
          <div className="modal-buttons">
            <button
              onClick={() => {
                deleteTask()
                setConfirmDeletePath(null)
              }}
            >
              Delete
            </button>
            <button onClick={() => setConfirmDeletePath(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
