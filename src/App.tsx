import { useEffect, useRef, useState } from 'react'
import { GoogleDriveService } from './storage/GoogleDriveService'
import { QueryStringHandler } from './storage/QueryStringHandler'
import EditableField, { type EditableFieldHandle } from './EditableField'
import './App.css'
import Modal from './Modal'
import {
  polarToCartesian,
  describeRingArc,
  calculateAngles,
  calculateRotation,
} from './utils/pie'
import {
  useAnimatedNumber,
  useAnimatedRadii,
  useRevealOnChange,
  usePrevious,
} from './utils/animation'

const VERSION =
  document.querySelector<HTMLMetaElement>('meta[name="build-version"]')?.content ||
  '0.0.0'

const driveService = new GoogleDriveService()
const queryHandler = new QueryStringHandler()

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
  const layerFade = useRevealOnChange(path.join('/'), 1500)
  const prevPath = usePrevious(path) || path
  const depthDiff = path.length - prevPath.length
  const parentFadeRaw = useRevealOnChange(path.length, 1500)

  const parentPath = path.slice(0, -1)
  const currentTasks = getTasksAtPath(tasks, parentPath)
  const selectedId = path[path.length - 1] ?? null
  const angles = calculateAngles(currentTasks)
  const selectedIndex = currentTasks.findIndex((t) => t.id === selectedId)
  const targetRotation =
    selectedIndex >= 0 ? calculateRotation(angles[selectedIndex].mid, isMobile) : 0
  const rotation = useAnimatedNumber(targetRotation, 1500)
  const rotationDeg = (rotation * 180) / Math.PI
  const selectedTask = selectedIndex >= 0 ? currentTasks[selectedIndex] : null
  const childTasks = selectedTask ? selectedTask.subtasks : []
  const childAngles = calculateAngles(childTasks)
  
  const r1 = 70
  const r2 = 100
  const parentRadius = r1 * 0.4

  const targetParent = path.length > 0 ? parentRadius : 0
  const targetCurrent = { inner: path.length > 0 ? parentRadius : 0, outer: r1 }
  const targetChild = { inner: r1 + 5, outer: r2 }

  let fromParent: number | undefined
  let fromCurrent: { inner: number; outer: number } | undefined
  let fromChild: { inner: number; outer: number } | undefined

  if (depthDiff > 0) {
    // drilling in
    fromParent = r1
    fromCurrent = { inner: r1 + 5, outer: r2 }
    fromChild = { inner: r2 + 5, outer: r2 + 10 }
  } else if (depthDiff < 0) {
    // moving outward
    fromParent = 0
    fromCurrent = { inner: 0, outer: parentRadius }
    fromChild = { inner: parentRadius, outer: r1 }
  }

  const currentRadii = useAnimatedRadii(targetCurrent, 1500, fromCurrent)

  const childRadii = useAnimatedRadii(targetChild, 1500, fromChild)

  const animatedParentRadius = useAnimatedNumber(targetParent, 1500, fromParent)

  const parentOpacity = depthDiff > 0 ? parentFadeRaw : depthDiff < 0 ? 1 - parentFadeRaw : 1

  if (tasks.length === 0) {
    return <p>No tasks yet</p>
  }

  const parentName = parentPath.length ? getTaskByPath(tasks, parentPath)?.name : ''

  return (
    <svg className="pie" viewBox="-110 -110 220 220" width={220} height={220}>
      <g
        className="parent"
        onClick={parentPath.length > 0 ? onUp : undefined}
        style={{ opacity: parentOpacity }}
      >
        <circle cx={0} cy={0} r={animatedParentRadius} fill="#444" stroke="#000" />
        {parentPath.length > 0 && (
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
            {parentName}
          </text>
        )}
      </g>
      <g transform={`rotate(${rotationDeg})`} className="current" style={{ opacity: layerFade }}>
        {currentTasks.map((task, i) => {
          const { start, end, mid } = angles[i]
          const pathD = describeRingArc(
            0,
            0,
            currentRadii.inner,
            currentRadii.outer,
            start,
            end,
          )
          const color = task.completed ? '#006400' : '#555'
          const textRadius = (currentRadii.inner + currentRadii.outer) / 2
          const textPos = polarToCartesian(0, 0, textRadius, mid)
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
        <g transform={`rotate(${rotationDeg})`} className="children" style={{ opacity: layerFade }}>
          {childTasks.map((task, i) => {
            const { start, end, mid } = childAngles[i]
            const pathD = describeRingArc(0, 0, childRadii.inner, childRadii.outer, start, end)
            const color = task.completed ? '#228b22' : '#777'
            const textPos = polarToCartesian(0, 0, (childRadii.inner + childRadii.outer) / 2, mid)
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
  const [fileId, setFileId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const loadedRef = useRef(false)
  const [path, setPath] = useState<number[]>([])
  const [pendingName, setPendingName] = useState(false)
  const [pendingDesc, setPendingDesc] = useState(false)
  const [pendingEffort, setPendingEffort] = useState(false)
  const [targetPath, setTargetPath] = useState<number[] | null>(null)
  const [pendingAddPath, setPendingAddPath] = useState<number[] | null>(null)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [confirmDeletePath, setConfirmDeletePath] = useState<number[] | null>(
    null,
  )

  const nameRef = useRef<EditableFieldHandle>(null)
  const descRef = useRef<EditableFieldHandle>(null)
  const effortRef = useRef<EditableFieldHandle>(null)

  useEffect(() => {
    async function init() {
      await driveService.init()
      if (!driveService.tryAutoSignIn()) {
        const ok = await driveService.signIn()
        if (!ok) return
      }
      const loc = queryHandler.getStorageLocation()
      let id = loc?.id || null
      if (!id) {
        const createNew = confirm('Create a new task file? Click Cancel to open existing.')
        if (createNew) {
          const folder = await driveService.pickFolder()
          if (folder === null) return
          let name = prompt('Enter file name', 'tasks.tr.json') || 'tasks.tr.json'
          if (!name.endsWith('.tr.json')) name += '.tr.json'
          id = await driveService.saveAs(
            name,
            folder,
            JSON.stringify({ version: '1', tasks: [] }, null, 2),
            'application/json',
          )
        } else {
          id = await driveService.pickFile('application/json')
        }
        if (!id) return
        queryHandler.setStorageLocation({ source: 'g', id })
      }
      setFileId(id)
      const content = await driveService.open(id)
      if (content) {
        try {
          const data = JSON.parse(content) as { tasks: Task[] }
          setTasks(data.tasks)
        } catch {
          // ignore
        }
      }
      loadedRef.current = true
    }
    init()
  }, [])

  const hasPending = pendingName || pendingDesc || pendingEffort

  useEffect(() => {
    if (!loadedRef.current || !fileId) return
    const timer = setTimeout(async () => {
      setSaving(true)
      await driveService.save(
        fileId,
        JSON.stringify({ tasks }, null, 2),
        'application/json',
      )
      setSaving(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [tasks, fileId])

  const createTaskAtPath = (parent: number[]) => {
    const id = nextId++
    setTasks((prev) => {
      const parentTask = getTaskByPath(prev, parent)
      const index = parentTask ? parentTask.subtasks.length + 1 : prev.length + 1
      const namePrefix = parent.length > 0 ? 'Subtask' : 'New Task'
      const newTask: Task = {
        id,
        name: `${namePrefix} ${index}`,
        description: '',
        effort: 100,
        completed: false,
        subtasks: [],
      }
      return addTaskAtPath(prev, parent, newTask)
    })
    setPath([...parent, id])
  }

  const addTask = () => {
    if (hasPending) {
      setPendingAddPath([])
      setShowUnsavedModal(true)
    } else {
      createTaskAtPath([])
    }
  }

  const addSubtask = () => {
    if (hasPending) {
      setPendingAddPath(path)
      setShowUnsavedModal(true)
    } else {
      createTaskAtPath(path)
    }
  }

  const addSibling = () => {
    const parent = path.slice(0, -1)
    if (hasPending) {
      setPendingAddPath(parent)
      setShowUnsavedModal(true)
    } else {
      createTaskAtPath(parent)
    }
  }

  const updateTaskFields = (fields: Partial<Task>) => {
    setTasks((prev) => updateTaskAtPath(prev, path, (t) => ({ ...t, ...fields })))
  }

  const deleteTask = () => {
    setTasks((prev) => deleteTaskAtPath(prev, path))
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
    if (pendingAddPath !== null) {
      createTaskAtPath(pendingAddPath)
      setPendingAddPath(null)
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
    if (pendingAddPath !== null) {
      createTaskAtPath(pendingAddPath)
      setPendingAddPath(null)
    }
  }

  const selected = getTaskByPath(tasks, path)

  return (
    <div id="appRoot">
      <div className="menu-bar">
        <span className="version">v{VERSION}</span>
        {saving && <span className="spinner" aria-label="Saving" />}
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
              <button type="button" onClick={addSibling}>Add Sibling Task</button>
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

