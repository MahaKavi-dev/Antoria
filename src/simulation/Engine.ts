import { Ant } from './Ant'
import { drawAnts } from './AntSprite'
import { PheromoneGrid } from './PheromoneGrid'
import { SCENARIOS, EXTRA_SPOTS, type Scenario } from './scenarios'

const START_ANTS = 20

export interface Params {
  ants: number // maximum colony size
  growth: number // new ants per simulated second
  antSpeed: number // cells per step
  speed: number // simulation steps per frame
  evap: number // trail memory (closer to 1 = lasts longer)
  follow: number
  wander: number
  trails: boolean
  events: boolean // optional random events
  fx: boolean // decorations, particles and rain overlay
  deposit: number // pheromone strength multiplier
  foodSources: number // number of food patches
  paths: boolean // show faint ant footprints
  showWalls: boolean
  foodStyle: FoodStyle
}
export type Tool = 'inspect' | 'food' | 'wall' | 'erase'
export type FoodStyle = 'mixed' | 'berries' | 'seeds' | 'crumbs' | 'apples'

export class Engine {
  readonly W = 160
  readonly H = 100
  readonly S = 5 // pixels per cell
  readonly NX = 80
  readonly NY = 50
  readonly NR = 4
  params: Params = { ants: 300, growth: 4, antSpeed: 0.35, speed: 1, evap: 0.99, follow: 1, wander: 0.3, trails: true, events: false, fx: true, deposit: 1, foodSources: 1, paths: false, showWalls: true, foodStyle: 'mixed' }
  tool: Tool = 'inspect'
  paused = false
  delivered = 0
  steps = 0
  history: number[] = [] // total food delivered, sampled once per simulated second
  avgTrip = 0 // moving average of nest-to-nest distance, in cells
  spawnAcc = 0
  rainUntil = 0
  log: string[] = []
  sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.04 }))
  private decor = this.makeDecor()
  private pathLayer = Object.assign(document.createElement('canvas'), { width: this.W * this.S, height: this.H * this.S })
  scenario: Scenario = SCENARIOS[0]
  private wallLayer = Object.assign(document.createElement('canvas'), { width: this.W * this.S, height: this.H * this.S })
  private wallSig = -1
  private noise = Float32Array.from({ length: this.W * this.H }, () => (Math.random() - 0.5) * 14)
  shortcutOpen = false
  gate = { shortcut: 0, around: 0 }
  selected: { kind: 'food' | 'nest'; x: number; y: number } | null = null
  onInspect?: () => void
  wall!: Uint8Array
  food!: Uint8Array
  toHome!: PheromoneGrid
  toFood!: PheromoneGrid
  ants: Ant[] = []
  private off = document.createElement('canvas')
  private img: ImageData

  constructor() {
    this.off.width = this.W
    this.off.height = this.H
    this.img = this.off.getContext('2d')!.createImageData(this.W, this.H)
    this.reset()
  }

  reset() {
    const n = this.W * this.H
    this.wall = new Uint8Array(n)
    this.food = new Uint8Array(n)
    this.toHome = new PheromoneGrid(this.W, this.H)
    this.toFood = new PheromoneGrid(this.W, this.H)
    this.ants = []
    this.delivered = 0
    this.steps = 0
    this.spawnAcc = 0
    this.rainUntil = 0
    this.log = []
    this.sparks = []
    this.history = []
    this.avgTrip = 0
    this.selected = null
    this.onInspect?.()
    this.shortcutOpen = false
    this.gate = { shortcut: 0, around: 0 }
    for (let i = 0; i < Math.min(START_ANTS, this.params.ants); i++) this.ants.push(new Ant(this.NX, this.NY))
    for (const [x1, y1, x2, y2] of this.scenario.walls)
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) this.wall[y * this.W + x] = 1
    this.placeFood()
  }

  get gateX() {
    return this.scenario.gateX ?? -1
  }

  /** Switches scenario (walls, food, shortcut) and restarts the colony. */
  load(id: string) {
    this.scenario = SCENARIOS.find((sc) => sc.id === id) ?? SCENARIOS[0]
    this.params.foodSources = this.scenario.food.length
    this.reset()
  }

  /** Replaces all food with `params.foodSources` patches: scenario patches first, then extra spots. */
  placeFood() {
    this.food.fill(0)
    const spots = [...this.scenario.food, ...EXTRA_SPOTS].slice(0, this.params.foodSources)
    for (const [cx, cy] of spots)
      for (let y = -4; y <= 4; y++)
        for (let x = -4; x <= 4; x++) {
          const i = (cy + y) * this.W + cx + x
          if (x * x + y * y <= 16 && !this.wall[i]) this.food[i] = this.scenario.foodAmount ?? 30
        }
  }

  clear() {
    this.wall.fill(0)
    this.food.fill(0)
    this.selected = null
    this.onInspect?.()
  }

  syncAnts() {
    if (this.ants.length > this.params.ants) this.ants.length = this.params.ants
  }

  stats() {
    let remaining = 0
    for (let i = 0; i < this.food.length; i++) remaining += this.food[i]
    // Strongest = highest combined trail value. Level = average strength of active trail cells, as % of the cap.
    const th = this.toHome.data, tf = this.toFood.data
    let max = 0, sum = 0, n = 0
    for (let i = 0; i < th.length; i++) {
      const v = th[i] + tf[i]
      if (v > 0.02) { sum += v; n++; if (v > max) max = v }
    }
    const g = this.gate, total = g.shortcut + g.around
    return {
      ants: this.ants.length, maxAnts: this.params.ants, delivered: this.delivered, remaining, time: this.steps / 60,
      hasShortcut: !!this.scenario.shortcut, avgTrip: Math.round(this.avgTrip * this.S), strongest: max, level: n ? Math.min(100, Math.round((sum / n / 3) * 100)) : 0,
      shortcutShare: this.shortcutOpen && total > 0 ? Math.round((100 * g.shortcut) / total) : null,
    }
  }

  /** Static layer drawn once: grit, pebbles, grass tufts and a vignette. */
  private makeDecor() {
    const w = this.W * this.S, h = this.H * this.S
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const c = cv.getContext('2d')!
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 140; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,225,180,.07)'
      c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 2)
    }
    for (let i = 0; i < 26; i++) {
      const sideways = rnd() < 0.5
      const x = sideways ? (rnd() < 0.5 ? rnd() * 40 : w - rnd() * 40) : rnd() * w
      const y = sideways ? rnd() * h : rnd() < 0.5 ? rnd() * 30 : h - rnd() * 30
      if (i % 2) {
        c.fillStyle = 'rgba(95,82,70,.9)'
        c.beginPath(); c.ellipse(x, y, 4 + rnd() * 6, 3 + rnd() * 4, rnd() * 3, 0, 7); c.fill()
      } else {
        c.strokeStyle = 'rgba(110,150,70,.75)'; c.lineWidth = 1.5
        for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + j * 3, y - 8 - rnd() * 8); c.stroke() }
      }
    }
    const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)')
    c.fillStyle = g; c.fillRect(0, 0, w, h)
    return cv
  }

  /** Animated extras: drifting dust, sparks on delivery, rain streaks. */
  private drawFx(ctx: CanvasRenderingContext2D) {
    const w = this.W * this.S, h = this.H * this.S
    ctx.fillStyle = 'rgba(255,250,235,.5)'
    for (const m of this.motes) {
      m.y -= m.v / 60
      m.x += Math.sin(this.steps / 90 + m.v * 100) * 0.0003
      if (m.y < 0) { m.y = 1; m.x = Math.random() }
      ctx.fillRect(m.x * w, m.y * h, 2, 2)
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]
      s.x += s.vx; s.y += s.vy; s.life -= 0.02
      if (s.life <= 0) { this.sparks.splice(i, 1); continue }
      ctx.fillStyle = `rgba(255,200,120,${s.life})`
      ctx.fillRect(s.x * this.S, s.y * this.S, 3, 3)
    }
    if (this.rainUntil > this.steps) {
      ctx.strokeStyle = 'rgba(160,200,235,.35)'; ctx.lineWidth = 1; ctx.beginPath()
      for (let i = 0; i < 60; i++) { const x = Math.random() * w, y = Math.random() * h; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12) }
      ctx.stroke()
    }
  }

  private note(text: string) {
    const t = (this.steps / 60) | 0
    this.log = [`${(t / 60) | 0}:${String(t % 60).padStart(2, '0')}  ${text}`, ...this.log].slice(0, 4)
  }

  /** One small random event. Only runs when the "Random events" option is on. */
  private randomEvent() {
    const { W, H, NX, NY } = this
    let spot: [number, number] | null = null
    for (let n = 0; n < 30 && !spot; n++) {
      const x = (6 + Math.random() * (W - 12)) | 0, y = (6 + Math.random() * (H - 12)) | 0
      if (Math.hypot(x - NX, y - NY) > 20) spot = [x, y]
    }
    const kind = (Math.random() * 5) | 0
    if (kind === 0 && spot) {
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const i = (spot[1] + dy) * W + spot[0] + dx
          if (dx * dx + dy * dy <= 9 && !this.wall[i]) this.food[i] = 30
        }
      this.note('New food appeared')
    } else if (kind === 1) {
      this.rainUntil = this.steps + 420
      this.note('Rain is weakening the trails')
    } else if (kind === 2 && spot) {
      const horiz = Math.random() < 0.5
      for (let k = 0; k < 14; k++) {
        const x = spot[0] + (horiz ? k : 0), y = spot[1] + (horiz ? 0 : k)
        if (x < W && y < H && Math.hypot(x - NX, y - NY) > this.NR + 3) { this.wall[y * W + x] = 1; this.food[y * W + x] = 0 }
      }
      this.note('A rock fell onto the soil')
    } else if (kind === 3 && this.ants.length) {
      for (let n = 0; n < 5; n++) this.ants[(Math.random() * this.ants.length) | 0].lost = 300
      this.note('A few ants got lost')
    } else if (kind === 4) {
      for (let n = 0; n < 200; n++) {
        const i = (Math.random() * W * H) | 0
        if (!this.food[i]) continue
        const fx = i % W, fy = (i / W) | 0
        for (let dy = -6; dy <= 6; dy++)
          for (let dx = -6; dx <= 6; dx++) {
            const x = fx + dx, y = fy + dy
            if (x >= 0 && y >= 0 && x < W && y < H) this.food[y * W + x] = 0
          }
        this.note('A food source was used up')
        break
      }
    }
  }

  /** Called on each delivery. Smoothed so a change in route shows up as a falling average. */
  recordTrip(cells: number) {
    this.avgTrip = this.avgTrip ? this.avgTrip * 0.9 + cells * 0.1 : cells
    for (let i = 0; i < 3 && this.sparks.length < 80; i++)
      this.sparks.push({ x: this.NX + (Math.random() - 0.5) * 4, y: this.NY + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.1, life: 1 })
  }

  /** Records a crossing of the scenario's wall column so we can see which gap ants use. */
  gateHit(y: number) {
    const sc = this.scenario.shortcut
    if (sc && (y | 0) >= sc[1] && (y | 0) <= sc[3]) this.gate.shortcut++
    else this.gate.around++
  }

  /** Opens the scenario's shorter gap. Traffic share per route then shows whether the colony switches. */
  openShortcut() {
    const sc = this.scenario.shortcut
    if (!sc) return
    for (let y = sc[1]; y <= sc[3]; y++) for (let x = sc[0]; x <= sc[2]; x++) this.wall[y * this.W + x] = 0
    // Remove most of the old route's memory so the experiment measures
    // relearning rather than permanent trail lock-in. The colony still keeps
    // a faint memory of the previous route.
    this.toHome.scale(0.35)
    this.toFood.scale(0.35)
    this.gate = { shortcut: 0, around: 0 }
    this.shortcutOpen = true
  }

  inspect(x: number, y: number) {
    if (Math.hypot(x - this.NX, y - this.NY) <= this.NR + 2) {
      this.selected = { kind: 'nest', x: this.NX, y: this.NY }
    } else {
      const p = this.patchAt(x, y)
      this.selected = p ? { kind: 'food', x: p.cx | 0, y: p.cy | 0 } : null
    }
    this.onInspect?.()
  }

  /** Flood-fills the food patch near (x, y): total amount and centre. */
  private patchAt(x: number, y: number) {
    const { W, H, food } = this
    let start = -1
    search: for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const cx = x + dx, cy = y + dy
        if (cx >= 0 && cy >= 0 && cx < W && cy < H && food[cy * W + cx]) { start = cy * W + cx; break search }
      }
    if (start < 0) return null
    const seen = new Uint8Array(W * H), stack = [start]
    seen[start] = 1
    let amount = 0, sx = 0, sy = 0, cells = 0
    while (stack.length) {
      const i = stack.pop()!
      const cx = i % W, cy = (i / W) | 0
      amount += food[i]; sx += cx; sy += cy; cells++
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j] || !food[j]) continue
        if ((j === i - 1 && cx === 0) || (j === i + 1 && cx === W - 1)) continue
        seen[j] = 1; stack.push(j)
      }
    }
    return { amount, cx: sx / cells, cy: sy / cells }
  }

  /** Live details for whatever the inspector is pointing at. */
  info() {
    const s = this.selected
    if (!s) return null
    if (s.kind === 'nest') {
      const out = this.ants.filter((a) => Math.hypot(a.x - this.NX, a.y - this.NY) > this.NR).length
      return { kind: 'nest' as const, out, stored: this.delivered, total: this.ants.length }
    }
    const p = this.patchAt(s.x, s.y)
    if (!p) { this.selected = null; return { kind: 'gone' as const } }
    s.x = p.cx | 0; s.y = p.cy | 0 // follow the patch as it shrinks
    const nearby = this.ants.filter((a) => Math.hypot(a.x - p.cx, a.y - p.cy) < 8).length
    return { kind: 'food' as const, amount: p.amount, nearby, distance: Math.round(Math.hypot(p.cx - this.NX, p.cy - this.NY) * this.S) }
  }

  tick() {
    if (this.paused) return
    for (let s = 0; s < this.params.speed; s++) {
      // The colony grows over time instead of starting full.
      this.spawnAcc += this.params.growth / 60
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1
        if (this.ants.length < this.params.ants) this.ants.push(new Ant(this.NX, this.NY))
      }
      for (const ant of this.ants) ant.update(this)
      const ev = this.rainUntil > this.steps ? this.params.evap * 0.96 : this.params.evap
      this.toHome.evaporate(ev)
      this.toFood.evaporate(ev)
      if (this.params.events && this.steps % 600 === 599) this.randomEvent()
      this.steps++
      if (this.steps % 60 === 0) {
        this.history.push(this.delivered)
        if (this.history.length > 300) this.history.shift()
      }
    }
  }

  paint(clientX: number, clientY: number, rect: DOMRect) {
    if (rect.width <= 0 || rect.height <= 0) return
    const relX = clientX - rect.left
    const relY = clientY - rect.top
    if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
      if (this.tool === 'inspect') {
        this.selected = null
        this.onInspect?.()
      }
      return
    }
    const x = Math.floor((relX / rect.width) * this.W)
    const y = Math.floor((relY / rect.height) * this.H)
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) {
      if (this.tool === 'inspect') {
        this.selected = null
        this.onInspect?.()
      }
      return
    }
    if (this.tool === 'inspect') {
      this.inspect(x, y)
      return
    }
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5) continue
        const cx = x + dx, cy = y + dy
        if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) continue
        if (Math.hypot(cx - this.NX, cy - this.NY) <= this.NR + 1) continue
        const i = cy * this.W + cx
        if (this.tool === 'food' && !this.wall[i]) this.food[i] = Math.min(60, this.food[i] + 8)
        else if (this.tool === 'wall') { this.wall[i] = 1; this.food[i] = 0 }
        else if (this.tool === 'erase') { this.wall[i] = 0; this.food[i] = 0 }
      }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { W, H, S, NX, NY, NR, img, wall } = this
    const px = img.data, th = this.toHome.data, tf = this.toFood.data
    let sig = this.params.showWalls ? 1 : 0 // changes whenever walls change, so the stone layer only redraws when needed
    for (let i = 0; i < W * H; i++) {
      const nz = this.noise[i]
      let r = 164 + nz, g = 130 + nz, b = 94 + nz
      if (wall[i]) sig = (sig * 33 + i + 1) | 0
      else if (this.params.trails) {
        const h = (Math.min(th[i], 1.5) / 1.5) * 0.6, f = (Math.min(tf[i], 1.5) / 1.5) * 0.7
        const r0 = r, g0 = g, b0 = b
        r = r0 + (52 - r0) * h + (222 - r0) * f
        g = g0 + (122 - g0) * h + (98 - g0) * f
        b = b0 + (148 - b0) * h + (36 - b0) * f
      }
      const p = i * 4
      px[p] = r; px[p + 1] = g; px[p + 2] = b; px[p + 3] = 255
    }
    if (sig !== this.wallSig) { this.wallSig = sig; this.renderWalls() }
    this.off.getContext('2d')!.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true // soft trails instead of hard squares
    ctx.drawImage(this.off, 0, 0, W * S, H * S)
    if (this.params.fx) ctx.drawImage(this.decor, 0, 0)
    const pl = this.pathLayer.getContext('2d')!
    if (this.params.paths) {
      pl.globalCompositeOperation = 'destination-out'
      pl.fillStyle = 'rgba(0,0,0,.04)'
      pl.fillRect(0, 0, W * S, H * S)
      pl.globalCompositeOperation = 'source-over'
      pl.fillStyle = 'rgba(40,24,12,.55)'
      for (const t of this.ants) pl.fillRect(t.x * S, t.y * S, 1.5, 1.5)
      ctx.drawImage(this.pathLayer, 0, 0)
    } else pl.clearRect(0, 0, W * S, H * S)
    if (this.params.showWalls) ctx.drawImage(this.wallLayer, 0, 0)
    this.drawFood(ctx)
    ctx.beginPath()
    ctx.arc((NX + 0.5) * S, (NY + 0.5) * S, NR * S, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(20,12,6,.55)'
    ctx.fill()
    ctx.strokeStyle = '#d9c7a8'
    ctx.lineWidth = 2
    ctx.stroke()
    drawAnts(ctx, this.ants, S)
    if (this.params.fx) this.drawFx(ctx)
  }

  /** Walls become shaded stones with soft shadows. Rendered once per wall change. */
  private renderWalls() {
    const { W, H, S, wall } = this
    const c = this.wallLayer.getContext('2d')!
    c.clearRect(0, 0, W * S, H * S)
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const cells: number[] = []
    for (let i = 0; i < W * H; i++) if (wall[i]) cells.push(i)
    c.fillStyle = 'rgba(30,18,8,.35)'
    for (const i of cells) {
      c.beginPath()
      c.ellipse(((i % W) + 0.5) * S + 2, (((i / W) | 0) + 0.5) * S + 3, S * 1.1, S, 0, 0, 7)
      c.fill()
    }
    for (const i of cells) {
      const x = ((i % W) + 0.5) * S + (rnd() - 0.5) * 2, y = (((i / W) | 0) + 0.5) * S + (rnd() - 0.5) * 2
      const r = S * (0.85 + rnd() * 0.35), t = (108 + rnd() * 22) | 0
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
      g.addColorStop(0, `rgb(${t + 38},${t + 34},${t + 28})`)
      g.addColorStop(1, `rgb(${t - 26},${t - 30},${t - 34})`)
      c.fillStyle = g
      c.beginPath()
      c.ellipse(x, y, r, r * (0.8 + rnd() * 0.2), rnd() * 3, 0, 7)
      c.fill()
    }
  }

  /** Food is drawn as small items (berries, seeds, crumbs, apples). Items shrink as a patch is eaten. */
  private drawFood(ctx: CanvasRenderingContext2D) {
    const { W, H, S, food } = this
    const fixed = ['berries', 'seeds', 'crumbs', 'apples'].indexOf(this.params.foodStyle)
    const shade = new Path2D(), leaf = new Path2D()
    const body = [0, 1, 2, 3].map(() => new Path2D()), light = [0, 1, 2, 3].map(() => new Path2D())
    const ell = (p: Path2D, x: number, y: number, rx: number, ry: number, rot: number) => {
      p.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx)
      p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
    }
    for (let i = 0; i < W * H; i++) {
      const f = food[i]
      if (!f) continue
      const h = Math.imul(i, 2654435761) >>> 0
      const k = fixed >= 0 ? fixed : (h >>> 28) % 4
      const sc = 0.55 + 0.45 * Math.min(f / 30, 1)
      const x = ((i % W) + 0.5) * S + ((h & 255) / 255 - 0.5) * S * 1.4
      const y = (((i / W) | 0) + 0.5) * S + (((h >>> 8) & 255) / 255 - 0.5) * S * 1.4
      const rot = ((h >>> 16) & 255) / 40
      if (k === 0 || k === 3) {
        const r = (k === 0 ? 2.3 : 3.1) * sc
        ell(shade, x + 1, y + 1.5, r, r, 0)
        ell(body[k], x, y, r, r, 0)
        ell(light[k], x - r * 0.3, y - r * 0.35, r * 0.32, r * 0.32, 0)
        if (k === 3) ell(leaf, x + r * 0.2, y - r, 1.6, 0.9, -0.5)
      } else if (k === 1) {
        const rx = 2.7 * sc, ry = 1.3 * sc
        ell(shade, x + 1, y + 1.5, rx, ry, rot)
        ell(body[1], x, y, rx, ry, rot)
        ell(light[1], x - 0.4, y - 0.3, rx * 0.5, ry * 0.35, rot)
      } else {
        const r = 2.6 * sc, b = body[2]
        ell(shade, x + 1, y + 1.5, r * 0.8, r * 0.6, rot)
        b.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r)
        for (let j = 1; j < 5; j++) {
          const a = rot + j * 1.57 + (j % 2 ? 0.3 : -0.2), rr = r * (j % 2 ? 0.7 : 1)
          b.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        }
        b.closePath()
        ell(light[2], x - 0.3, y - 0.4, r * 0.35, r * 0.25, rot)
      }
    }
    ctx.fillStyle = 'rgba(30,18,8,.28)'; ctx.fill(shade)
    const colors = ['#6d1d3a', '#7a5230', '#e6c882', '#bf3a2e']
    const lights = ['rgba(255,255,255,.55)', 'rgba(255,240,200,.4)', 'rgba(255,250,230,.5)', 'rgba(255,255,255,.45)']
    for (let k = 0; k < 4; k++) { ctx.fillStyle = colors[k]; ctx.fill(body[k]); ctx.fillStyle = lights[k]; ctx.fill(light[k]) }
    ctx.fillStyle = '#4f8a3a'; ctx.fill(leaf)
  }
}
