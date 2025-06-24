import { useIsMobile } from '../utils/useIsMobile'
import {
  useAnimatedNumber,
  useAnimatedRadii,
  useRevealOnChange,
  usePrevious,
} from '../utils/animation'
import { useEffect, useRef } from 'react'
import type { Radii } from '../utils/animation'
import {
  calculateAngles,
  calculateRotation,
} from '../utils/pie'
import type { AngleInfo } from '../utils/pie'
import { getTasksAtPath } from '../utils/tasks'
import type { Task } from '../types'

export interface AnimatedLayers {
  rotationDeg: number
  parentRadius: number
  parentOpacity: number
  current: Radii
  child: Radii
  prev?: {
    tasks: Task[]
    angles: AngleInfo[]
    radii: Radii
    rotationDeg: number
    opacity: number
  }
  prevParent?: {
    radius: number
    opacity: number
  }
  fadingChild?: {
    tasks: Task[]
    angles: AngleInfo[]
    radii: Radii
    rotationDeg: number
    opacity: number
  }
}

export function usePieAnimation(tasks: Task[], path: number[]): AnimatedLayers {
  const isMobile = useIsMobile()
  const prevPath = usePrevious(path) || path
  const depthDiff = path.length - prevPath.length
  const transitionRef = useRef<
    | {
        type: 'in' | 'out'
        prevTasks: Task[]
        prevAngles: AngleInfo[]
        prevRotationDeg: number
        prevChildTasks: Task[]
        prevChildAngles: AngleInfo[]
      }
    | null
  >(null)
  const fade = useRevealOnChange(path.length, 1500)
  const prevParentPath = prevPath.slice(0, -1)
  const prevTasks = getTasksAtPath(tasks, prevParentPath)
  const prevAngles = calculateAngles(prevTasks)
  const prevSelectedId = prevPath[prevPath.length - 1] ?? null
  const prevSelectedIndex = prevTasks.findIndex((t) => t.id === prevSelectedId)
  const prevRotationDeg =
    prevSelectedIndex >= 0
      ? (calculateRotation(prevAngles[prevSelectedIndex].mid, isMobile) * 180) /
        Math.PI
      : 0
  const prevSelectedTask = prevSelectedIndex >= 0 ? prevTasks[prevSelectedIndex] : null
  const prevChildTasks = prevSelectedTask ? prevSelectedTask.subtasks : []
  const prevChildAngles = calculateAngles(prevChildTasks)

  useEffect(() => {
    if (depthDiff > 0) {
      transitionRef.current = {
        type: 'in',
        prevTasks,
        prevAngles,
        prevRotationDeg,
        prevChildTasks,
        prevChildAngles,
      }
    } else if (depthDiff < 0) {
      transitionRef.current = {
        type: 'out',
        prevTasks,
        prevAngles,
        prevRotationDeg,
        prevChildTasks,
        prevChildAngles,
      }
    }
  }, [depthDiff, prevTasks, prevAngles, prevRotationDeg, prevChildTasks, prevChildAngles])

  useEffect(() => {
    if (fade === 1) {
      transitionRef.current = null
    }
  }, [fade])

  const parentPath = path.slice(0, -1)
  const currentTasks = getTasksAtPath(tasks, parentPath)
  const selectedId = path[path.length - 1] ?? null
  const angles = calculateAngles(currentTasks)
  const selectedIndex = currentTasks.findIndex((t) => t.id === selectedId)
  const targetRotation =
    selectedIndex >= 0 ? calculateRotation(angles[selectedIndex].mid, isMobile) : 0

  const rotationDeg =
    (useAnimatedNumber(targetRotation, 1500) * 180) / Math.PI

  const r1 = 70
  const r2 = 100
  const naturalParent = r1 * 0.4

  const targetParent = path.length > 0 ? naturalParent : 0
  const targetCurrent = { inner: path.length > 0 ? naturalParent : 0, outer: r1 }
  const targetChild = { inner: r1 + 5, outer: r2 }

  const transition = transitionRef.current
  const activeDiff = transition && fade < 1 ? (transition.type === 'in' ? 1 : -1) : depthDiff

  let fromParent: number | undefined
  let fromCurrent: Radii | undefined
  let fromChild: Radii | undefined
  let fromPrev: Radii | undefined
  let targetPrev: Radii = { inner: 0, outer: 0 }
  let prevParentFrom: number | undefined
  let prevChildFrom: Radii | undefined
  let prevChildTo: Radii | undefined

  if (activeDiff > 0) {
    fromParent = r1
    fromCurrent = { inner: r1 + 5, outer: r2 }
    fromChild = { inner: r2 + 5, outer: r2 + 10 }
    fromPrev = { inner: naturalParent, outer: r1 }
    targetPrev = { inner: 0, outer: naturalParent }
  } else if (activeDiff < 0) {
    fromParent = 0
    fromCurrent = { inner: 0, outer: naturalParent }
    fromChild = { inner: naturalParent, outer: r1 }
    prevParentFrom = naturalParent
    prevChildFrom = { inner: r1 + 5, outer: r2 }
    prevChildTo = { inner: r2 + 5, outer: r2 + 10 }
  }

  const parentRadius = useAnimatedNumber(targetParent, 1500, fromParent)
  const current = useAnimatedRadii(targetCurrent, 1500, fromCurrent)
  const child = useAnimatedRadii(targetChild, 1500, fromChild)
  const prevRadii = useAnimatedRadii(targetPrev, 1500, fromPrev)
  const prevParentRadius = useAnimatedNumber(r1, 1500, prevParentFrom)
  const prevChildRadii = useAnimatedRadii(prevChildTo ?? { inner: 0, outer: 0 }, 1500, prevChildFrom)

  const parentOpacity = transition ? fade : 1
  const prev: AnimatedLayers['prev'] =
    transition?.type === 'in'
      ? {
          tasks: transition.prevTasks,
          angles: transition.prevAngles,
          radii: prevRadii,
          rotationDeg: transition.prevRotationDeg,
          opacity: 1 - fade,
        }
      : undefined
  const prevParent =
    transition?.type === 'out' && prevParentFrom !== undefined
      ? { radius: prevParentRadius, opacity: 1 - fade }
      : undefined
  const fadingChild =
    transition?.type === 'out' && prevChildFrom
      ? {
          tasks: transition.prevChildTasks,
          angles: transition.prevChildAngles,
          radii: prevChildRadii,
          rotationDeg: transition.prevRotationDeg,
          opacity: 1 - fade,
        }
      : undefined

  return {
    rotationDeg,
    parentRadius,
    parentOpacity,
    current,
    child,
    prev,
    prevParent,
    fadingChild,
  }
}
