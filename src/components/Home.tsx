import { useState } from 'react'
import type { Engine } from '../simulation/Engine'
import { SCENARIOS } from '../simulation/scenarios'
import { SimulationCanvas } from './SimulationCanvas'
import { HelpPanel } from './HelpPanel'

export function Home({ ambient, onStart }: { ambient: Engine; onStart: (scenarioId: string) => void }) {
  const [id, setId] = useState(SCENARIOS[0].id)
  return (
    <main className="home">
      <section className="hero">
        <h1>Antoria</h1>
        <p className="lede">Watch a colony teach itself the shortest way to food. Nobody tells the ants where to go: every route you see is discovered.</p>
        <div className="scenarios" role="radiogroup" aria-label="Choose a scenario">
          {SCENARIOS.map((sc) => (
            <button key={sc.id} role="radio" aria-checked={id === sc.id} className="card" onClick={() => setId(sc.id)}>
              <strong>{sc.name}</strong>
              <span>{sc.blurb}</span>
            </button>
          ))}
        </div>
        <div className="row">
          <button className="primary" onClick={() => onStart(id)}>Start simulation</button>
          <HelpPanel />
        </div>
      </section>
      <div className="window"><SimulationCanvas engine={ambient} /></div>
    </main>
  )
}
