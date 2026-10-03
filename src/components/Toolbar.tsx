import { useState } from 'react'
import type { Engine, Tool } from '../simulation/Engine'

const TOOLS: [Tool, string][] = [['inspect', 'Inspect'], ['food', 'Food'], ['wall', 'Wall'], ['erase', 'Erase']]

export function Toolbar({ engine, started, onStart }: { engine: Engine; started: boolean; onStart: () => void }) {
  const [tool, setTool] = useState<Tool>(engine.tool)
  const [paused, setPaused] = useState(false)
  return (
    <div className="toolbar">
      <div className="row" role="group" aria-label="Playback">
        <button className="primary" onClick={() => {
          if (!started) onStart()
          else { engine.paused = !engine.paused; setPaused(engine.paused) }
        }}>{!started ? 'Start' : paused ? 'Resume' : 'Pause'}</button>
        <button onClick={() => engine.reset()}>Reset</button>
        <button onClick={() => engine.clear()}>Clear</button>
      </div>
      <div className="row" role="group" aria-label="Tool">
        {TOOLS.map(([t, name]) => (
          <button key={t} aria-pressed={tool === t} onClick={() => { engine.tool = t; setTool(t) }}>{name}</button>
        ))}
      </div>
    </div>
  )
}
