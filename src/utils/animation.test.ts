import { describe, it, expect } from 'vitest'
import { lerp, interpolateRadii } from './animation'

describe('lerp', () => {
  it('interpolates between numbers', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 0.5)).toBeCloseTo(5)
    expect(lerp(0, 10, 1)).toBe(10)
  })
})

describe('interpolateRadii', () => {
  it('interpolates inner and outer radii', () => {
    const from = { inner: 0, outer: 10 }
    const to = { inner: 5, outer: 20 }
    expect(interpolateRadii(from, to, 0)).toEqual({ inner: 0, outer: 10 })
    const mid = interpolateRadii(from, to, 0.5)
    expect(mid.inner).toBeCloseTo(2.5)
    expect(mid.outer).toBeCloseTo(15)
    expect(interpolateRadii(from, to, 1)).toEqual({ inner: 5, outer: 20 })
  })
})
