import { useEffect, useRef, useState } from 'react'

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export interface Radii {
  inner: number
  outer: number
}

export function interpolateRadii(from: Radii, to: Radii, t: number): Radii {
  return {
    inner: lerp(from.inner, to.inner, t),
    outer: lerp(from.outer, to.outer, t),
  }
}

export function useAnimatedRadii(value: Radii, duration: number, from?: Radii): Radii {
  const inner = useAnimatedNumber(value.inner, duration, from?.inner)
  const outer = useAnimatedNumber(value.outer, duration, from?.outer)
  return { inner, outer }
}

export function useAnimatedNumber(value: number, duration: number, from?: number): number {
  const [animated, setAnimated] = useState(from ?? value)
  const frameRef = useRef<number | undefined>(undefined)
  const startRef = useRef(from ?? value)

  useEffect(() => {
    startRef.current = from ?? animated
    const start = performance.now()

    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1)
      setAnimated(lerp(startRef.current, value, t))
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step)
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current)
      }
    }
    // We intentionally omit animated from deps to start from the last value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, from])

  return animated
}

export function useRevealOnChange(trigger: any, duration: number): number {
  const [progress, setProgress] = useState(1)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current)
    }
    setProgress(0)
    const start = performance.now()

    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1)
      setProgress(t)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step)
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [trigger, duration])

  return progress
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  const prev = ref.current
  ref.current = value
  return prev
}
