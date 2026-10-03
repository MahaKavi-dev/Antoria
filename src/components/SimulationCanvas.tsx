import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Engine } from '../simulation/Engine'

export function SimulationCanvas({ engine }: { engine: Engine }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    cv.width = engine.W * engine.S
    cv.height = engine.H * engine.S
    const ctx = cv.getContext('2d')!
    let raf = 0
    const loop = () => {
      engine.tick()
      engine.draw(ctx)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const paint = (e: PointerEvent<HTMLCanvasElement>) =>
    engine.paint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())

  return (
    <canvas
      ref={ref}
      className="sim"
      aria-label="Ant colony simulation"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); paint(e) }}
      onPointerMove={(e) => { if (e.buttons) paint(e) }}
    />
  )
}
