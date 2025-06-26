import { describe, it, expect } from 'vitest'
import {
  polarToCartesian,
  calculateAngles,
  calculateRotation,
  describeRingArc,
} from './pie'

describe('polarToCartesian', () => {
  it('converts polar coordinates to cartesian', () => {
    const p = polarToCartesian(0, 0, 1, 0)
    expect(p.x).toBeCloseTo(1)
    expect(p.y).toBeCloseTo(0)
  })
})

describe('calculateAngles', () => {
  it('returns weighted angles', () => {
    const angles = calculateAngles([
      { effort: 1 },
      { effort: 2 },
      { effort: 1 },
    ])
    const total = Math.PI * 2
    expect(angles[0]).toEqual({
      start: 0,
      end: total * 0.25,
      mid: total * 0.125,
    })
    expect(angles[1].start).toBeCloseTo(total * 0.25)
    expect(angles[1].end).toBeCloseTo(total * 0.75)
    expect(angles[2].start).toBeCloseTo(total * 0.75)
    expect(angles[2].end).toBeCloseTo(total)
  })
})

describe('calculateRotation', () => {
  it('rotates selected slice to the right', () => {
    const rot = calculateRotation(Math.PI / 4)
    expect(rot).toBeCloseTo(-Math.PI / 4)
  })
})

describe('describeRingArc', () => {
  it('creates an svg path for an annular sector', () => {
    const path = describeRingArc(0, 0, 1, 2, 0, Math.PI)
    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
  })
})
