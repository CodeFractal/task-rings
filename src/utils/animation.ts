import { useEffect, useRef, useState, useLayoutEffect } from 'react'

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function easeInOut(t: number): number {
  return (1 - Math.cos(Math.PI * t)) / 2
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

export function useAnimatedRadii(
  value: Radii,
  duration: number,
  from?: Radii,
  easing: (t: number) => number = easeInOut,
): Radii {
  const inner = useAnimatedNumber(value.inner, duration, from?.inner, easing)
  const outer = useAnimatedNumber(value.outer, duration, from?.outer, easing)
  return { inner, outer }
}

export function useAnimatedNumber(
  value: number,
  duration: number,
  from?: number,
  easing: (t: number) => number = easeInOut,
): number {
  const [animated, setAnimated] = useState(from ?? value)
  const frameRef = useRef<number | undefined>(undefined)
  const startRef = useRef(from ?? value)

  useLayoutEffect(() => {
    if (from !== undefined) {
      setAnimated(from)
    }
  }, [from])

  useEffect(() => {
    startRef.current = from ?? animated
    const start = performance.now()

    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1)
      setAnimated(lerp(startRef.current, value, easing(t)))
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
  }, [value, duration, from, easing])

  return animated
}

export function useRevealOnChange<T>(
  trigger: T,
  duration: number,
  easing: (t: number) => number = easeInOut,
): number {
  const [progress, setProgress] = useState(1)
  const frameRef = useRef<number | undefined>(undefined)
  const prevRef = useRef(trigger)

  useLayoutEffect(() => {
    if (prevRef.current !== trigger) {
      prevRef.current = trigger
      setProgress(0)
    }
  }, [trigger])

  useEffect(() => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current)
    }
    const start = performance.now()

    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1)
      setProgress(easing(t))
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
  }, [trigger, duration, easing])

  return progress
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  const prev = ref.current
  ref.current = value
  return prev
}
