import { useState } from 'react'
import type { Engine } from '../simulation/Engine'
import { SimulationCanvas } from './SimulationCanvas'
import { ControlPanel } from './ControlPanel'
import { StatsStrip } from './StatsStrip'
import { Toolbar } from './Toolbar'
import { HelpPanel } from './HelpPanel'

export function SimScreen({ engine, onHome }: { engine: Engine; onHome: () => void }) {
  const [started, setStarted] = useState(false)
  const start = () => { engine.paused = false; setStarted(true) }
  return (
    <main>
      <header className="bar">
        <button className="wordmark" onClick={onHome} title="Back to home">Antoria</button>
        <StatsStrip engine={engine} />
        <HelpPanel />
      </header>
      <div className="layout">
        <div className="stage">
          <div className="canvas-wrap">
            <SimulationCanvas engine={engine} />
            {!started && (
              <div className="start">
                <button className="primary" onClick={start}>Start</button>
                <p>Paint food and walls first, or just start.</p>
              </div>
            )}
          </div>
          <Toolbar engine={engine} started={started} onStart={start} />
        </div>
        <ControlPanel engine={engine} />
      </div>
    </main>
  )
}
