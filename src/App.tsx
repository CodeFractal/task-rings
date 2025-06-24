import { useEffect, useRef, useState } from 'react'
import { GoogleDriveService } from './storage/GoogleDriveService'
import { QueryStringHandler } from './storage/QueryStringHandler'
import EditableField, { type EditableFieldHandle } from './EditableField'
import './App.css'
import Modal from './Modal'
import { PieChart } from './PieChart'
import {
  getTaskByPath,
  updateTaskAtPath,
  addTaskAtPath,
  deleteTaskAtPath,
} from './utils/tasks'
import type { Task } from './types'

const VERSION =
  document.querySelector<HTMLMetaElement>('meta[name="build-version"]')?.content ||
  '0.0.0'

const driveService = new GoogleDriveService()
const queryHandler = new QueryStringHandler()


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

