import { describe, it, expect } from 'vitest'
import {
  polarToCartesian,
  calculateAngles,
  calculateRotation,
  scaleAngles,
  interpolateAngles,
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
  it('rotates for desktop', () => {
    const rot = calculateRotation(Math.PI / 4)
    expect(rot).toBeCloseTo(-Math.PI / 4)
  })
  it('rotates for mobile', () => {
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

describe('scaleAngles', () => {
  it('maps angles to a new range', () => {
    const original = calculateAngles([
      { effort: 1 },
      { effort: 1 },
    ])
    const start = Math.PI / 2
    const end = Math.PI
    const scaled = scaleAngles(original, start, end)
    expect(scaled[0].start).toBeCloseTo(start)
    expect(scaled[0].end).toBeCloseTo(start + (end - start) / 2)
    expect(scaled[1].start).toBeCloseTo(start + (end - start) / 2)
    expect(scaled[1].end).toBeCloseTo(end)
  })
})

describe('interpolateAngles', () => {
  it('blends between angle sets', () => {
    const from = [
      { start: 0, end: Math.PI / 2, mid: Math.PI / 4 },
      { start: Math.PI / 2, end: Math.PI, mid: (3 * Math.PI) / 4 },
    ]
    const to = [
      { start: 0, end: Math.PI, mid: Math.PI / 2 },
      { start: Math.PI, end: Math.PI * 2, mid: (3 * Math.PI) / 2 },
    ]
    const blended = interpolateAngles(from, to, 0.5)
    expect(blended[0].start).toBeCloseTo(0)
    expect(blended[0].end).toBeCloseTo((Math.PI / 2 + Math.PI) / 2)
    expect(blended[1].start).toBeCloseTo((Math.PI / 2 + Math.PI) / 2)
    expect(blended[1].end).toBeCloseTo((Math.PI + Math.PI * 2) / 2)
  })
})
