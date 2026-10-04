import { useEffect, useState } from 'react'
import type { Engine, FoodStyle, Params } from '../simulation/Engine'
import { SCENARIOS } from '../simulation/scenarios'
import { FoodGraph } from './FoodGraph'

function Slider(props: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label>
      {props.label}: {props.value}
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        onChange={(e) => props.onChange(+e.target.value)} />
    </label>
  )
}

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="chk">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} /> {props.label}
    </label>
  )
}

type Tab = 'world' | 'colony' | 'trails' | 'stats'
const TABS: [Tab, string][] = [['world', 'World'], ['colony', 'Colony'], ['trails', 'Trails'], ['stats', 'Stats']]
const FOODS: [FoodStyle, string][] = [['mixed', 'Mixed'], ['berries', 'Berries'], ['seeds', 'Seeds'], ['crumbs', 'Crumbs'], ['apples', 'Apples']]
const fmt = (s: number) => `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60 | 0).padStart(2, '0')}`

export function ControlPanel({
  engine,
  tab: controlledTab,
  onTabChange,
}: {
  engine: Engine
  tab?: Tab
  onTabChange?: (t: Tab) => void
}) {
  const [internalTab, setInternalTab] = useState<Tab>('world')
  const tab = controlledTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab
  const [p, setP] = useState<Params>({ ...engine.params })
  const [scenario, setScenario] = useState(engine.scenario.id)
  const [stats, setStats] = useState(engine.stats())
  const [info, setInfo] = useState(engine.info())
  const [log, setLog] = useState<string[]>([])

  // Poll a few times a second instead of re-rendering every frame.
  useEffect(() => {
    const id = setInterval(() => { setStats(engine.stats()); setInfo(engine.info()); setLog(engine.log) }, 250)
    return () => clearInterval(id)
  }, [engine])

  // Immediately update inspector when an object is inspected or deselected
  useEffect(() => {
    const prev = engine.onInspect
    engine.onInspect = () => {
      prev?.()
      setInfo(engine.info())
    }
    return () => {
      engine.onInspect = prev
    }
  }, [engine])

  const set = <K extends keyof Params>(k: K, v: Params[K]) => {
    engine.params[k] = v
    setP({ ...engine.params })
    if (k === 'ants') engine.syncAnts()
    if (k === 'foodSources') engine.placeFood()
  }

  return (
    <aside>
      <div className="tabs" role="tablist">
        {TABS.map(([t, name]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{name}</button>
        ))}
      </div>

      {tab === 'world' && (
        <>
          <label>Scenario
            <select value={scenario} onChange={(e) => { engine.load(e.target.value); setScenario(e.target.value); setP({ ...engine.params }) }}>
              {SCENARIOS.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
          </label>
          <Slider label="Food sources" min={1} max={8} step={1} value={p.foodSources} onChange={(v) => set('foodSources', v)} />
          <label>Food style
            <select value={p.foodStyle} onChange={(e) => set('foodStyle', e.target.value as FoodStyle)}>
              {FOODS.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
            </select>
          </label>
          <Check label="Show obstacles" checked={p.showWalls} onChange={(v) => set('showWalls', v)} />
          <Check label="Atmosphere effects" checked={p.fx} onChange={(v) => set('fx', v)} />
          <Check label="Random events" checked={p.events} onChange={(v) => set('events', v)} />
          {stats.hasShortcut && (
            <div className="info">
              <strong>Shorter route test</strong>
              <button onClick={() => engine.openShortcut()}>Open shortcut</button>
              <span>
                {stats.shortcutShare === null
                  ? 'Let a trail form around the wall first. Opening a shorter gap also fades most of the old trail, so you can watch the colony relearn.'
                  : `${stats.shortcutShare}% of crossings use the shortcut.`}
              </span>
            </div>
          )}
        </>
      )}

      {tab === 'colony' && (
        <>
          <Slider label="Max ants" min={50} max={1200} step={50} value={p.ants} onChange={(v) => set('ants', v)} />
          <Slider label="Growth (ants/sec)" min={0} max={20} step={1} value={p.growth} onChange={(v) => set('growth', v)} />
          <Slider label="Ant speed" min={0.1} max={1.2} step={0.05} value={p.antSpeed} onChange={(v) => set('antSpeed', v)} />
          <Slider label="Simulation speed" min={1} max={5} step={1} value={p.speed} onChange={(v) => set('speed', v)} />
          <Check label="Show ant paths" checked={p.paths} onChange={(v) => set('paths', v)} />
        </>
      )}

      {tab === 'trails' && (
        <>
          <Check label="Show pheromones" checked={p.trails} onChange={(v) => set('trails', v)} />
          <Slider label="Pheromone strength" min={0.2} max={2} step={0.1} value={p.deposit} onChange={(v) => set('deposit', v)} />
          <Slider label="Trail memory" min={0.95} max={0.999} step={0.001} value={p.evap} onChange={(v) => set('evap', v)} />
          <details>
            <summary>Advanced</summary>
            <Slider label="Wandering" min={0} max={1} step={0.05} value={p.wander} onChange={(v) => set('wander', v)} />
            <Slider label="Trail following" min={0} max={2} step={0.1} value={p.follow} onChange={(v) => set('follow', v)} />
          </details>
        </>
      )}

      {tab === 'stats' && (
        <>
          <dl className="stats">
            <div><dt>Food remaining</dt><dd>{stats.remaining}</dd></div>
            <div><dt>Time</dt><dd>{fmt(stats.time)}</dd></div>
            <div><dt>Strongest trail</dt><dd>{stats.strongest.toFixed(1)}</dd></div>
            <div><dt>Pheromone level</dt><dd>{stats.level}%</dd></div>
          </dl>
          <figure className="graph">
            <FoodGraph engine={engine} />
            <figcaption>Food collected over time</figcaption>
          </figure>
          {info && (
            <div className="info" aria-live="polite">
              {info.kind === 'food' && <>
                <strong>Food source</strong>
                <span>Amount: {info.amount}</span>
                <span>Ants nearby: {info.nearby}</span>
                <span>Distance from colony: {info.distance}px</span>
              </>}
              {info.kind === 'nest' && <>
                <strong>Colony</strong>
                <span>Ants out foraging: {info.out} of {info.total}</span>
                <span>Food stored: {info.stored}</span>
              </>}
              {info.kind === 'gone' && <strong>That food source is used up.</strong>}
            </div>
          )}
          {!info && <p className="hint">Pick the Inspect tool and click a food pile or the colony to see details.</p>}
          {log.length > 0 && <ul className="log" aria-live="polite">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </>
      )}

      {tab !== 'stats' && info && (
        <div className="info" aria-live="polite">
          {info.kind === 'food' && <>
            <strong>Food source</strong>
            <span>Amount: {info.amount}</span>
            <span>Ants nearby: {info.nearby}</span>
            <span>Distance from colony: {info.distance}px</span>
          </>}
          {info.kind === 'nest' && <>
            <strong>Colony</strong>
            <span>Ants out foraging: {info.out} of {info.total}</span>
            <span>Food stored: {info.stored}</span>
          </>}
          {info.kind === 'gone' && <strong>That food source is used up.</strong>}
        </div>
      )}
    </aside>
  )
}
