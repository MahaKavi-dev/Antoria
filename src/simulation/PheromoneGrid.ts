export class PheromoneGrid {
  data: Float32Array
  constructor(public w: number, public h: number) {
    this.data = new Float32Array(w * h)
  }
  deposit(i: number, amount: number, cap = 3) {
    this.data[i] = Math.min(cap, this.data[i] + amount)
  }
  evaporate(keep: number) {
    const d = this.data
    for (let i = 0; i < d.length; i++) d[i] *= keep
  }
  scale(factor: number) {
    const d = this.data
    for (let i = 0; i < d.length; i++) d[i] *= factor
  }
  clear() {
    this.data.fill(0)
  }
}
