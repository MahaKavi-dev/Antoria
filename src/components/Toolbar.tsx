import { useEffect, useState } from 'react'
import type { Engine, Tool } from '../simulation/Engine'

const TOOLS: [Tool, string][] = [['inspect', 'Inspect'], ['food', 'Food'], ['wall', 'Wall'], ['erase', 'Erase']]

export function Toolbar({
  engine,
  started,
  onStart,
  tool: controlledTool,
  onToolChange,
}: {
  engine: Engine
  started: boolean
  onStart: () => void
  tool?: Tool
  onToolChange?: (t: Tool) => void
}) {
  const [internalTool, setInternalTool] = useState<Tool>(engine.tool)
  const currentTool = controlledTool ?? internalTool
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (controlledTool) setInternalTool(controlledTool)
  }, [controlledTool])

  const selectTool = (t: Tool) => {
    engine.tool = t
    setInternalTool(t)
    onToolChange?.(t)
  }

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
          <button key={t} aria-pressed={currentTool === t} onClick={() => selectTool(t)}>{name}</button>
        ))}
      </div>
    </div>
  )
}
