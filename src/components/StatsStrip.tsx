import { useEffect, useState } from 'react'
import type { Engine } from '../simulation/Engine'

const fmt = (s: number) => `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60 | 0).padStart(2, '0')}`

export function StatsStrip({ engine }: { engine: Engine }) {
  const [s, setS] = useState(engine.stats())
  useEffect(() => {
    const id = setInterval(() => setS(engine.stats()), 250)
    return () => clearInterval(id)
  }, [engine])
  return (
    <dl className="strip">
      <div><dt>Ants</dt><dd>{s.ants}</dd></div>
      <div><dt>Food collected</dt><dd>{s.delivered}</dd></div>
      <div><dt>Time</dt><dd>{fmt(s.time)}</dd></div>
      <div><dt>Avg trip</dt><dd>{s.avgTrip ? `${s.avgTrip}px` : '-'}</dd></div>
    </dl>
  )
}
