export type Rect = [number, number, number, number] // x1, y1, x2, y2 (inclusive cells)

export interface Scenario {
  id: string
  name: string
  blurb: string
  walls: Rect[]
  food: [number, number][] // patch centres
  foodAmount?: number // food per cell (default 30); wall scenarios use more so the route test has time to play out
  shortcut?: Rect // gap opened by the "shorter route" test
  gateX?: number // wall column where crossings are counted
}

export const SCENARIOS: Scenario[] = [
  { id: 'gap', name: 'Wall with gaps', blurb: 'Food behind a wall. Watch a trail find its way around.', walls: [[105, 8, 105, 59]], food: [[125, 28]], foodAmount: 200, shortcut: [103, 24, 107, 32], gateX: 105 },
  { id: 'detour', name: 'Long detour', blurb: 'A long wall, then open a shortcut and see if the colony switches.', walls: [[100, 4, 100, 76]], food: [[128, 56]], foodAmount: 200, shortcut: [98, 50, 102, 58], gateX: 100 },
  { id: 'two', name: 'Two food sources', blurb: 'One near, one far. Which does the colony favor?', walls: [], food: [[130, 22], [38, 82]] },
  { id: 'open', name: 'Open field', blurb: 'No obstacles. Draw your own.', walls: [], food: [[125, 28]] },
]

/** Extra patch positions used when the "Food sources" slider asks for more than the scenario defines. */
export const EXTRA_SPOTS: [number, number][] = [[30, 20], [135, 80], [60, 90], [135, 15], [20, 60], [60, 10], [145, 50], [85, 88]]
