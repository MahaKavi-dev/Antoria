import type { Engine } from './Engine'

/**
 * Ant simulation state. The ant itself owns movement state; Engine owns the
 * world fields and records higher-level events such as route crossings.
 */
export class Ant {
  a = Math.random() * Math.PI * 2
  phase = Math.random() * Math.PI * 2
  carrying = false
  strength = 1
  lost = 0
  ra = this.a // smoothed heading, used only for drawing
  private previousX: number
  private roundTripDistance = 0

  constructor(public x: number, public y: number) {
    this.previousX = x
  }

  update(w: Engine) {
    const { W, H, NX, NY, NR, wall, food, params: p } = w
    const wasCarrying = this.carrying
    const wasLost = this.lost > 0
    this.ra += Math.atan2(Math.sin(this.a - this.ra), Math.cos(this.a - this.ra)) * 0.2

    // Lost ants temporarily ignore pheromones and goal sensing. They still
    // obey walls, so the event looks like exploration rather than teleporting.
    if (this.lost > 0) {
      this.lost--
      this.a += (Math.random() - 0.5) * 0.7
    } else {
      const follow = (this.carrying ? w.toHome : w.toFood).data

      // Sense three cells ahead and steer toward the strongest local signal.
      let best = -1
      let turn = 0
      for (const d of [-0.6, 0, 0.6]) {
        const sx = (this.x + Math.cos(this.a + d) * 3) | 0
        const sy = (this.y + Math.sin(this.a + d) * 3) | 0
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue
        const i = sy * W + sx
        if (wall[i]) continue
        let v = follow[i] + Math.random() * 0.02
        if (!this.carrying && food[i]) v += 50
        if (this.carrying && Math.hypot(sx - NX, sy - NY) < NR + 1) v += 50
        if (v > best) { best = v; turn = d }
      }
      this.a += turn * 0.5 * p.follow + (Math.random() - 0.5) * p.wander * 2
    }

    // antSpeed controls actual movement; simulation speed remains independent.
    const distance = p.antSpeed
    const nx = this.x + Math.cos(this.a) * distance
    const ny = this.y + Math.sin(this.a) * distance
    const ix = nx | 0
    const iy = ny | 0

    if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[iy * W + ix]) {
      this.a += Math.PI / 2 + Math.random()
      this.phase += 0.25
      return
    }

    this.previousX = this.x
    this.x = nx
    this.y = ny
    this.roundTripDistance += distance
    this.phase += 0.35 + distance * 0.8

    // Count outward crossings only. This measures the route ants actually use
    // to reach food, avoiding double-counting the return trip.
    if (!wasLost && !wasCarrying && w.gateX >= 0) {
      const crossedForward = this.previousX < w.gateX && this.x >= w.gateX
      if (crossedForward) w.gateHit(this.y)
    }

    if (this.lost > 0) return

    const i = iy * W + ix
    const trail = this.carrying ? w.toFood : w.toHome
    trail.deposit(i, this.strength * 0.5 * p.deposit)
    this.strength *= 0.995

    if (!this.carrying && food[i]) {
      food[i]--
      this.carrying = true
      this.a += Math.PI
      this.strength = 1
    } else if (Math.hypot(nx - NX, ny - NY) < NR) {
      if (this.carrying) {
        this.carrying = false
        this.a += Math.PI
        w.delivered++
        w.recordTrip(this.roundTripDistance)
        this.roundTripDistance = 0
      } else {
        // A failed foraging excursion is not a completed round trip.
        this.roundTripDistance = 0
      }
      this.strength = 1
    }
  }

}
