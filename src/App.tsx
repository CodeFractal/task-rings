import { useEffect, useState } from 'react'
import './App.css'
import Modal from './Modal'
import {
  polarToCartesian,
  describeArc,
  calculateAngles,
  calculateRotation,
} from './utils/pie'

interface Task {
  id: number
  name: string
  description: string
  effort: number
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
          const color = `hsl(${(i * 70) % 360},70%,50%)`
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const addTask = () => {
    const newTask: Task = {
      id: Date.now(),
      name: `New Task ${tasks.length + 1}`,
      description: '',
      effort: 100,
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

  const selected = tasks.find((t) => t.id === selectedId) || null

  return (
    <div id="appRoot">
      <div className="menu-bar">
        <button onClick={addTask}>+</button>
      </div>
      <div className="split">
        <div className="task-picker">
          <PieChart tasks={tasks} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="task-details">
          {selected ? (
            <form>
              <div>
                <label>
                  Name
                  <input
                    type="text"
                    value={selected.name}
                    onChange={(e) => updateTask({ ...selected, name: e.target.value })}
                  />
                </label>
              </div>
              <div>
                <label>
                  Description
                  <br />
                  <textarea
                    value={selected.description}
                    onChange={(e) => updateTask({ ...selected, description: e.target.value })}
                  />
                </label>
              </div>
              <div>
                <label>
                  Effort
                  <input
                    type="number"
                    min={0}
                    value={selected.effort}
                    onChange={(e) =>
                      updateTask({ ...selected, effort: Number(e.target.value) })
                    }
                  />
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
