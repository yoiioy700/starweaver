# Starweaver

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/yoiioy700/starweaver/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/yoiioy700/starweaver/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Starweaver is a gravity-slingshot constellation game: drag back from a comet and release to fling it through the gravity of strange worlds, gathering every star to weave a constellation. 8 hand-designed levels, a dotted trajectory preview, combos, black holes, a drifting world, WebAudio synth sound, and a full start → play → level-complete / game-over → restart loop.

## How to play

- **Mouse:** drag back from the comet (a slingshot) and release to launch. The dotted path shows exactly where the comet will fly, bending around planets.
- **Keyboard:** arrow keys aim (left/right angle, up/down power), Space launches. Space also starts/confirms, P or Esc pauses, M mutes, R retries the level, T restarts from level 1.
- **Goal:** gather every star in a level before the launches run out. A flight that gathers two stars pays a combo (second star ×2). Finishing a level pays a bonus (250 + 50 per unused launch). Complete all 8 constellations to win; run out of launches and it is game over.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The game is pure static files under `game/` — no network requests, no build step.

## The eight constellations

1. First Light — one world, 3 stars, 4 launches.
2. Twin Suns — two wells, 4 stars.
3. The Long Arc — one great ringed world, 5 stars.
4. Slingshot — combo play, 4 stars.
5. The Dark Heart — a black hole, 5 stars.
6. Drift — an orbiting world, 4 stars.
7. The Gauntlet — three worlds and a black hole, 6 stars.
8. Grand Weave — everything at once, 6 stars.

Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ajg91agp&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
