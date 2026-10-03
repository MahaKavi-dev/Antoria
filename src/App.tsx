import { useMemo, useState } from 'react'
import { Engine } from './simulation/Engine'
import { Home } from './components/Home'
import { SimScreen } from './components/SimScreen'

export default function App() {
  // Engines live outside React state: ants never trigger re-renders.
  const engine = useMemo(() => { const e = new Engine(); e.paused = true; return e }, [])
  const ambient = useMemo(() => {
    const e = new Engine() // a small quiet colony for the home page
    e.load('open')
    e.params.ants = 90
    e.params.growth = 6
    return e
  }, [])
  const [screen, setScreen] = useState<'home' | 'sim'>('home')

  if (screen === 'home')
    return <Home ambient={ambient} onStart={(id) => { engine.load(id); engine.paused = true; setScreen('sim') }} />
  return <SimScreen engine={engine} onHome={() => setScreen('home')} />
}
