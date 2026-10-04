import { useEffect, useState } from 'react'
import type { Engine, Tool } from '../simulation/Engine'
import { SimulationCanvas } from './SimulationCanvas'
import { ControlPanel } from './ControlPanel'
import { StatsStrip } from './StatsStrip'
import { Toolbar } from './Toolbar'
import { HelpPanel } from './HelpPanel'

export function SimScreen({ engine, onHome }: { engine: Engine; onHome: () => void }) {
  const [started, setStarted] = useState(false)
  const [tool, setTool] = useState<Tool>(engine.tool)
  const [tab, setTab] = useState<'world' | 'colony' | 'trails' | 'stats'>('world')
  const start = () => { engine.paused = false; setStarted(true) }

  const handleToolChange = (t: Tool) => {
    setTool(t)
    if (t === 'inspect') {
      setTab('stats')
    }
  }

  useEffect(() => {
    const prev = engine.onInspect
    engine.onInspect = () => {
      prev?.()
      if (engine.selected) {
        setTab('stats')
      }
    }
    return () => {
      engine.onInspect = prev
    }
  }, [engine])

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
          <Toolbar engine={engine} started={started} onStart={start} tool={tool} onToolChange={handleToolChange} />
        </div>
        <ControlPanel engine={engine} tab={tab} onTabChange={setTab} />
      </div>
    </main>
  )
}
