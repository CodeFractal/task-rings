import { polarToCartesian, describeRingArc, calculateAngles } from './utils/pie'
import { getTasksAtPath, getTaskByPath } from './utils/tasks'
import type { Task } from './types'
import { usePieAnimation } from './hooks/usePieAnimation'

interface Props {
  tasks: Task[]
  path: number[]
  onSelect: (p: number[]) => void
  onUp: () => void
}

export function PieChart({ tasks, path, onSelect, onUp }: Props) {
  const {
    rotationDeg,
    parentRadius,
    parentOpacity,
    current,
    child,
    prev,
    prevParent,
    fadingChild,
  } = usePieAnimation(tasks, path)

  const parentPath = path.slice(0, -1)
  const currentTasks = getTasksAtPath(tasks, parentPath)
  const angles = calculateAngles(currentTasks)
  const selectedId = path[path.length - 1] ?? null
  const selectedTask = currentTasks.find((t) => t.id === selectedId) || null
  const selectedIndex = currentTasks.findIndex((t) => t.id === selectedId)
  const childTasks = selectedTask ? selectedTask.subtasks : []
  const baseChildAngles = calculateAngles(childTasks)
  const childAngles = selectedTask
    ? baseChildAngles.map((a) => {
        const parent = angles[selectedIndex]
        const span = parent.end - parent.start
        const scale = span / (Math.PI * 2)
        return {
          start: parent.start + a.start * scale,
          end: parent.start + a.end * scale,
          mid: parent.start + a.mid * scale,
        }
      })
    : []
  const parentName = parentPath.length ? getTaskByPath(tasks, parentPath)?.name : ''

  return (
    <svg className="pie" viewBox="-110 -110 220 220" width={220} height={220}>
      <g
        className="parent"
        onClick={parentPath.length > 0 ? onUp : undefined}
        style={{ opacity: parentOpacity }}
      >
        <circle cx={0} cy={0} r={parentRadius} fill="#444" stroke="#000" />
        {parentPath.length > 0 && (
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
            {parentName}
          </text>
        )}
      </g>
      {prevParent && (
        <circle
          cx={0}
          cy={0}
          r={prevParent.radius}
          fill="#444"
          stroke="#000"
          style={{ opacity: prevParent.opacity }}
        />
      )}
      {prev && (
        <g transform={`rotate(${prev.rotationDeg})`} style={{ opacity: prev.opacity }}>
          {prev.tasks.map((task, i) => {
            const { start, end, mid } = prev.angles[i]
            const d = describeRingArc(0, 0, prev.radii.inner, prev.radii.outer, start, end)
            const color = task.completed ? '#006400' : '#555'
            const textRadius = (prev.radii.inner + prev.radii.outer) / 2
            const pos = polarToCartesian(0, 0, textRadius, mid)
            return (
              <g key={task.id}>
                <path d={d} fill={color} stroke="#000" />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  transform={`rotate(${-prev.rotationDeg} ${pos.x} ${pos.y})`}
                >
                  {task.name}
                </text>
              </g>
            )
          })}
        </g>
      )}
      <g transform={`rotate(${rotationDeg})`} className="current">
        {currentTasks.map((task, i) => {
          const { start, end, mid } = angles[i]
          const d = describeRingArc(0, 0, current.inner, current.outer, start, end)
          const color = task.completed ? '#006400' : '#555'
          const textRadius = (current.inner + current.outer) / 2
          const pos = polarToCartesian(0, 0, textRadius, mid)
          return (
            <g key={task.id} onClick={() => onSelect([...parentPath, task.id])}>
              <path
                d={d}
                fill={color}
                stroke="#000"
                strokeWidth={1}
                className={task.id === selectedId ? 'selected' : undefined}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                transform={`rotate(${-rotationDeg} ${pos.x} ${pos.y})`}
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
            const d = describeRingArc(0, 0, child.inner, child.outer, start, end)
            const color = task.completed ? '#006400' : '#555'
            const pos = polarToCartesian(0, 0, (child.inner + child.outer) / 2, mid)
            return (
              <g key={task.id} onClick={() => onSelect([...path, task.id])}>
                <path d={d} fill={color} stroke="#000" />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  transform={`rotate(${-rotationDeg} ${pos.x} ${pos.y})`}
                >
                  {task.name}
                </text>
              </g>
            )
          })}
        </g>
      )}
      {fadingChild && (
        <g transform={`rotate(${fadingChild.rotationDeg})`} style={{ opacity: fadingChild.opacity }}>
          {fadingChild.tasks.map((task, i) => {
            const { start, end } = fadingChild.angles[i]
            const d = describeRingArc(0, 0, fadingChild.radii.inner, fadingChild.radii.outer, start, end)
            const color = task.completed ? '#006400' : '#555'
            return <path key={task.id} d={d} fill={color} stroke="#000" />
          })}
        </g>
      )}
    </svg>
  )
}
