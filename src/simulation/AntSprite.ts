import type { Ant } from './Ant'

const ATTACH = [2.1, 1.2, 0.3] // where each leg pair joins the thorax
const FOOT = [3.8, 1.2, -2.4] // where each foot rests

/**
 * Draws every ant as an insect: head, thorax, abdomen, six jointed legs and two
 * antennae. Legs step as the ant walks. Shapes are batched into a few paths so
 * hundreds of ants stay cheap. Coordinates are in canvas px; +f is forward, +l is sideways.
 */
export function drawAnts(ctx: CanvasRenderingContext2D, ants: Ant[], S: number) {
  const shadow = new Path2D(), abdomen = new Path2D(), thorax = new Path2D(), head = new Path2D()
  const sheen = new Path2D(), legs = new Path2D(), feelers = new Path2D(), crumbs = new Path2D()
  let x = 0, y = 0, c = 1, s = 0
  const X = (f: number, l: number) => x + c * f - s * l
  const Y = (f: number, l: number) => y + s * f + c * l
  const blob = (p: Path2D, f: number, l: number, rx: number, ry: number, rot: number, dx = 0, dy = 0) => {
    const cx = X(f, l) + dx, cy = Y(f, l) + dy
    p.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx)
    p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  }

  for (const t of ants) {
    c = Math.cos(t.ra); s = Math.sin(t.ra); x = t.x * S; y = t.y * S
    blob(shadow, -2.7, 0, 3, 1.9, t.ra, 1.2, 1.8)
    blob(shadow, 1.2, 0, 2, 1.2, t.ra, 1.2, 1.8)
    blob(abdomen, -2.7, 0, 3, 1.9, t.ra)
    blob(sheen, -2.9, -0.5, 1.4, 0.6, t.ra)
    blob(thorax, 1.2, 0, 2, 1.2, t.ra)
    blob(head, 3.9, 0, 1.5, 1.3, t.ra)

    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1
        const swing = Math.sin(t.phase + i * 2.1 + (k ? Math.PI : 0)) * 1.3
        const kneeF = ATTACH[i] + (FOOT[i] - ATTACH[i]) * 0.3 + swing * 0.5
        legs.moveTo(X(ATTACH[i], side * 0.8), Y(ATTACH[i], side * 0.8))
        legs.lineTo(X(kneeF, side * 3.4), Y(kneeF, side * 3.4))
        legs.lineTo(X(FOOT[i] + swing, side * 4.6), Y(FOOT[i] + swing, side * 4.6))
      }

    const wob = Math.sin(t.phase * 0.7) * 0.4
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1
      feelers.moveTo(X(5, side * 0.6), Y(5, side * 0.6))
      feelers.lineTo(X(7, side * 1.9 + wob), Y(7, side * 1.9 + wob))
      feelers.lineTo(X(8.6, side * 2.7 + wob * 1.5), Y(8.6, side * 2.7 + wob * 1.5))
    }
    if (t.carrying) blob(crumbs, 7.2, 0, 1.7, 1.5, 0)
  }

  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill(shadow)
  ctx.fillStyle = '#26150c'; ctx.fill(abdomen)
  ctx.fillStyle = '#3a2013'; ctx.fill(thorax)
  ctx.fillStyle = '#2f1a0f'; ctx.fill(head)
  ctx.fillStyle = 'rgba(255,230,200,.2)'; ctx.fill(sheen)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = '#3a2213'; ctx.lineWidth = 0.9; ctx.stroke(legs)
  ctx.lineWidth = 0.6; ctx.stroke(feelers)
  ctx.fillStyle = '#6fae3c'; ctx.fill(crumbs)
}
