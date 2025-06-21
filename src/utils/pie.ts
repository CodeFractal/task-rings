export interface Point {
  x: number
  y: number
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angle: number,
): Point {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

export interface TaskLike {
  effort: number
}

export interface AngleInfo {
  start: number
  end: number
  mid: number
}

export function calculateAngles<T extends TaskLike>(tasks: T[]): AngleInfo[] {
  const total = tasks.reduce((sum, t) => sum + t.effort, 0)
  let acc = 0
  return tasks.map((t) => {
    const start = (acc / total) * Math.PI * 2
    acc += t.effort
    const end = (acc / total) * Math.PI * 2
    const mid = (start + end) / 2
    return { start, end, mid }
  })
}

export function calculateRotation(midAngle: number, isMobile: boolean): number {
  const target = isMobile ? -Math.PI / 2 : 0
  return target - midAngle
}
