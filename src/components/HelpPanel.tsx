import { useEffect, useState } from 'react'

export function HelpPanel() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button className="help-btn" onClick={() => setOpen(true)}>How it works</button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="How it works" onClick={(e) => e.stopPropagation()}>
            <h2>How it works</h2>
            <p>Ants don't know the best path. They explore randomly. When an ant finds food, it returns to the colony while leaving pheromones behind. Other ants detect the pheromones. Shorter paths are travelled more often, so they build stronger trails. Over time the colony discovers efficient routes.</p>
            <h3>The rules each ant follows</h3>
            <ul>
              <li><b>Wander:</b> move forward and turn a little at random.</li>
              <li><b>Sense:</b> look at three spots ahead (left, front, right) and turn toward the strongest trail.</li>
              <li><b>Searching:</b> lay a trail that leads home, and follow trails that lead to food. Food within sensing range is very attractive.</li>
              <li><b>Carrying food:</b> lay a trail that leads to food, and follow trails that lead home.</li>
              <li><b>Evaporation:</b> every trail fades each step, so old or unused routes disappear.</li>
              <li><b>Obstacles:</b> walls block movement and sensing, so trails bend around them.</li>
            </ul>
            <p>Nothing tells an ant where the nest is. Try opening the shortcut after a trail has formed and watch whether the colony switches.</p>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
