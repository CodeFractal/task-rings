import { useEffect, useRef, useState } from 'react'
import EditableField, { type EditableFieldHandle } from './EditableField'
import './App.css'
import Modal from './Modal'
import {
  polarToCartesian,
  describeArc,
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

function PieChart({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: Task[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const isMobile = useIsMobile()

  if (tasks.length === 0) {
    return <p>No tasks yet</p>
  }

  const r = 100
  const angles = calculateAngles(tasks)
  const selectedIndex = tasks.findIndex((t) => t.id === selectedId)
  const rotation =
    selectedIndex >= 0 ? calculateRotation(angles[selectedIndex].mid, isMobile) : 0
  const rotationDeg = (rotation * 180) / Math.PI

  return (
    <svg
      className="pie"
      viewBox="-110 -110 220 220"
      width={220}
      height={220}
    >
      <g transform={`rotate(${rotationDeg})`}>
        {tasks.map((task, i) => {
          const { start, end, mid } = angles[i]
          const path = describeArc(0, 0, r, start, end)
          const color = task.completed ? '#006400' : '#555'
          const textPos = polarToCartesian(0, 0, r * 0.6, mid)
          return (
            <g key={task.id} onClick={() => onSelect(task.id)}>
              <path
                d={path}
                fill={color}
                stroke="#000"
                strokeWidth={selectedId === task.id ? 3 : 1}
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
    </svg>
  )
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingName, setPendingName] = useState(false)
  const [pendingDesc, setPendingDesc] = useState(false)
  const [pendingEffort, setPendingEffort] = useState(false)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const nameRef = useRef<EditableFieldHandle>(null)
  const descRef = useRef<EditableFieldHandle>(null)
  const effortRef = useRef<EditableFieldHandle>(null)

  const hasPending = pendingName || pendingDesc || pendingEffort

  const addTask = () => {
    const newTask: Task = {
      id: Date.now(),
      name: `New Task ${tasks.length + 1}`,
      description: '',
      effort: 100,
      completed: false,
    }
    setTasks([...tasks, newTask])
    setSelectedId(newTask.id)
  }

  const updateTask = (updated: Task) => {
    setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)))
  }

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((t) => t.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  const handleSelect = (id: number) => {
    if (id === selectedId) return
    if (hasPending) {
      setTargetId(id)
      setShowUnsavedModal(true)
    } else {
      setSelectedId(id)
    }
  }

  const saveAll = () => {
    nameRef.current?.save()
    descRef.current?.save()
    effortRef.current?.save()
    setShowUnsavedModal(false)
    if (targetId !== null) {
      setSelectedId(targetId)
      setTargetId(null)
    }
  }

  const discardAll = () => {
    nameRef.current?.revert()
    descRef.current?.revert()
    effortRef.current?.revert()
    setShowUnsavedModal(false)
    if (targetId !== null) {
      setSelectedId(targetId)
      setTargetId(null)
    }
  }

  const selected = tasks.find((t) => t.id === selectedId) || null

  return (
    <div id="appRoot">
      <div className="menu-bar">
        <span className="version">v{VERSION}</span>
        <button onClick={addTask}>+</button>
      </div>
      <div className="split">
        <div className="task-picker">
          <PieChart tasks={tasks} selectedId={selectedId} onSelect={handleSelect} />
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
                    onSave={(v) => updateTask({ ...selected, name: v as string })}
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
                    onSave={(v) => updateTask({ ...selected, description: v as string })}
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
                    onSave={(v) =>
                      updateTask({ ...selected, effort: Number(v) })
                    }
                  />
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.completed}
                    onChange={(e) =>
                      updateTask({ ...selected, completed: e.target.checked })
                    }
                  />{' '}
                  Completed
                </label>
              </div>
              <button type="button" onClick={() => setConfirmDeleteId(selected.id)}>
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
      {confirmDeleteId !== null && (
        <Modal onClose={() => setConfirmDeleteId(null)}>
          <p>Delete this task?</p>
          <div className="modal-buttons">
            <button
              onClick={() => {
                deleteTask(confirmDeleteId)
                setConfirmDeleteId(null)
              }}
            >
              Delete
            </button>
            <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
