# ANTORIA - phased build prompt

**Project:** ANTORIA, a browser ant-colony simulator. React + TypeScript + Vite, Canvas for the sim, plain CSS. No backend, no external APIs. `npm install && npm run dev` must work.

**Rules for every phase**
- Behavior must emerge from local rules. Never draw ants along predefined routes.
- Simulation state lives in the engine (`src/simulation`), not React state. React only polls stats a few times per second.
- Keep 500 ants smooth. Use typed arrays for grids and avoid avoidable per-frame allocations.
- Each phase ends with: a working build, a short explanation of what changed, and the exact files touched.

**Colony behavior**
- The colony starts with a small number of ants (20) and grows over time up to a user-set maximum.
- Ant movement speed is slow by default and user-adjustable, separate from overall simulation speed.

**Ant model (fixed, do not change)**
- Two pheromone grids. Searching ants lay `toHome` and follow `toFood`. Carrying ants lay `toFood` and follow `toHome`.
- Ants sense 3 cells ahead (left/front/right), steer toward the strongest, plus random jitter.
- Deposit strength fades with time since the ant last touched the nest/food. Trails evaporate every step.
- Walls block movement and sensing. Ants never know where the nest is; they only follow trails or sense it within a short radius.

## Phase 1 - Core sim (COMPLETE)
Ants, two trails, food, nest, walls, speed/count/evaporation/wander/follow sliders, pause/reset/clear, click-to-place food, drag-to-draw walls, basic stats.

## Phase 2 - Inspection and route learning (COMPLETE)
- Click a food patch: show amount, ants nearby, distance from nest. Click the nest: show ants out, food stored.
- "Strongest trail" stat (defined as the max combined pheromone value on the grid) and "pheromone level" (mean over non-zero cells, as %).
- Test scenario button: opens a shorter gap in the wall and shows whether traffic shifts to it within ~60 seconds. Fix trail lock-in if it does not.

## Phase 3 - Stats and graph (COMPLETE)
- Average distance per round trip, food collected over time as a live line graph (canvas, sampled once per second).
- Define "colony food" as the total delivered, and drop the duplicate counter.

## Phase 4 - Atmosphere and events (COMPLETE)
- Decorations, soft particles, nicer ant rendering (heading, legs/wobble), vignette.
- Optional events, each toggleable: new food appears, rain weakens trails, a wall appears, a few ants get lost, a patch runs out.
- "How it works" panel: plain-language explanation plus the rules above.
- Decision: `energy` is left out. It only matters if ants can tire and head home, which needs a return rule beyond trails.
