import { useEffect, useRef } from 'react'
import type { Engine } from '../simulation/Engine'

/** Live line graph of total food delivered, one point per simulated second. */
export function FoodGraph({ engine }: { engine: Engine }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const draw = () => {
      const { width: w, height: h } = cv
      const d = engine.history
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#cdd3c3'
      ctx.beginPath(); ctx.moveTo(0, h - 0.5); ctx.lineTo(w, h - 0.5); ctx.stroke()
      ctx.font = '11px system-ui'
      ctx.fillStyle = '#667060'
      if (d.length < 2) { ctx.fillText('Collecting data...', 6, 14); return }
      const max = Math.max(1, d[d.length - 1])
      const pt = (i: number): [number, number] => [(i / (d.length - 1)) * w, h - 4 - (d[i] / max) * (h - 20)]
      ctx.beginPath()
      d.forEach((_, i) => { const [x, y] = pt(i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
      ctx.strokeStyle = '#2f4a31'; ctx.lineWidth = 2; ctx.stroke()
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      ctx.fillStyle = 'rgba(47,74,49,.12)'; ctx.fill()
      ctx.fillStyle = '#667060'; ctx.fillText(String(max), 6, 12)
    }
    draw()
    const id = setInterval(draw, 500)
    return () => clearInterval(id)
  }, [engine])

  return <canvas ref={ref} width={480} height={150} />
}
