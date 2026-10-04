# Antoria

An interactive ant colony simulation that runs entirely in the browser.
Nobody tells the ants where to go: they wander, find food, lay pheromone trails, and the colony discovers short routes on its own.

**Live demo:** https://antoria.vercel.app/

<!-- Add a screenshot or GIF here, e.g. ![Antoria](./preview.png) -->

## How it works

- Every ant is a small state machine: **searching** or **carrying food**.
- There are two pheromone grids. Searching ants lay a trail that leads *home* and follow trails that lead to *food*. Ants carrying food do the opposite.
- Each step an ant senses three cells ahead, steers toward the strongest trail, and adds a little randomness.
- Trails fade over time, so unused routes disappear and busy ones strengthen. Shorter routes get travelled more often, so they win.
- Ants never know where the nest is. They only follow trails, or sense it from a short distance.

## Features

- Scenarios: wall with gaps, long detour, two food sources, open field
- Paint food and walls, inspect food piles and the colony
- Shorter-route experiment: open a shortcut and watch the colony relearn (opening it fades most of the old trail memory)
- Live stats and a food-collected graph
- Food styles, ant paths, random events (rain, rocks, lost ants, depleted food)

## Run it

```bash
npm install
npm run dev     # development
npm run build   # type-check and production build
```

No backend, database, or API keys are needed.

## Project structure

```
src/
  simulation/   Engine.ts (world, stepping, rendering), Ant.ts, AntSprite.ts,
                PheromoneGrid.ts, scenarios.ts
  components/   Home, SimScreen, ControlPanel, Toolbar, StatsStrip, FoodGraph, HelpPanel
```

To add a new ant behaviour, start in `Ant.ts` (`update`). To add a scenario, add an entry in `scenarios.ts`.

## Performance notes

- Simulation state lives in the engine, not in React state, so hundreds of ants never trigger re-renders. React polls a few stats four times a second.
- Pheromones are typed arrays. Ants and food are drawn in batched canvas paths.
- The simulation runs on a fixed 60 steps per second, independent of screen refresh rate.
