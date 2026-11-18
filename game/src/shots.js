// The screenshot scenes behind ?shot=start|play|action|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, so the frame
// is what a short game really looks like and the same seed always gives the same
// frame. The autopilot picks launches by trying candidates in a scratch world
// and keeping the one that gathers a star.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_COLLECT, EVENT_LEVEL_DONE } from './world.js';
import { SCREEN_LEVEL, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const LOOKAHEAD_SECONDS = 4;
const FLIGHT_CAP_SECONDS = 12;
const POWERS = [300, 420, 540, 660];
const ANGLE_SPREAD = [-0.3, -0.15, 0, 0.15, 0.3];

/** A scratch world in exactly the real world's state, for trying launches. */
function makeScratch(seed, real) {
  const scratch = createWorld(createRandom(seed));
  scratch.loadLevel(real.state.levelIndex, true);
  const target = scratch.state;
  const source = real.state;
  target.score = source.score;
  target.levelStartScore = source.levelStartScore;
  target.launchesLeft = source.launchesLeft;
  target.time = source.time;
  target.collectedCount = source.collectedCount;
  target.combo = source.combo;
  target.stars.forEach((star, index) => {
    star.collected = source.stars[index].collected;
    star.order = source.stars[index].order;
  });
  return scratch;
}

/**
 * Try candidate launches in a scratch world and return the best one: the first
 * that gathers a star, else the one that comes closest to one.
 */
export function pickLaunch(world, seed) {
  const state = world.state;
  const remaining = state.stars.filter((star) => !star.collected);
  if (remaining.length === 0) return null;
  const pad = state.level.pad;
  let nearest = remaining[0];
  for (const star of remaining) {
    if (Math.hypot(star.x - pad.x, star.y - pad.y) < Math.hypot(nearest.x - pad.x, nearest.y - pad.y)) {
      nearest = star;
    }
  }
  const direct = Math.atan2(nearest.y - pad.y, nearest.x - pad.x);
  let best = null;
  let bestScore = -Infinity;
  for (const spread of ANGLE_SPREAD) {
    for (const power of POWERS) {
      const candidate = { angle: direct + spread, power };
      const scratch = makeScratch(seed, world);
      let gathered = 0;
      let closest = Infinity;
      let launched = false;
      for (let step = 0; step < LOOKAHEAD_SECONDS * 60; step += 1) {
        const events = scratch.step(STEP, launched ? null : candidate);
        launched = true;
        if (events & EVENT_COLLECT) gathered += 1;
        if (events & EVENT_LEVEL_DONE) break;
        const comet = scratch.state.comet;
        if (!comet.flying) break;
        for (const star of scratch.state.stars) {
          if (star.collected) continue;
          closest = Math.min(closest, Math.hypot(comet.x - star.x, comet.y - star.y));
        }
      }
      // A flight that gathers more stars wins; among equals, the one that
      // comes closest to a star wins. Every candidate is tried, so the best
      // flight is the one that gathers the most, not the first that gathers.
      const score = gathered * 1000 - closest;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  return best;
}

/** A launch straight at the nearest world: the way a hurried player loses. */
function pickBadLaunch(world) {
  const state = world.state;
  const pad = state.level.pad;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const planet of state.level.planets) {
    const distance = Math.hypot(planet.x - pad.x, planet.y - pad.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { x: planet.x, y: planet.y };
    }
  }
  if (!nearest) return { angle: 0, power: 500 };
  return { angle: Math.atan2(nearest.y - pad.y, nearest.x - pad.x), power: 520 };
}

/** Step one launch to its end (a star, a crash, or the void). */
export function flyLaunch(world, launch) {
  let launched = false;
  for (let step = 0; step < FLIGHT_CAP_SECONDS * 60; step += 1) {
    world.step(STEP, launched ? null : launch);
    launched = true;
    if (world.state.status !== 'flying') return;
  }
}

/** Fly a launch for a fixed time and leave the comet in the air. */
function flyPartial(world, launch, seconds) {
  let launched = false;
  for (let step = 0; step < seconds * 60; step += 1) {
    world.step(STEP, launched ? null : launch);
    launched = true;
    if (world.state.status !== 'flying') return;
  }
}

/**
 * Set `world` to the named scene (start, play, action, level or end; any other
 * name is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world, seed) {
  if (name === 'level') {
    world.loadLevel(0, false);
    let tries = 0;
    while (world.state.status === 'aim' && tries < 6) {
      const launch = pickLaunch(world, seed);
      if (!launch) break;
      flyLaunch(world, launch);
      tries += 1;
    }
    if (world.state.status !== 'levelDone') {
      // Fall back to the end scene if the autopilot could not finish the level.
      while (world.state.status === 'aim') flyLaunch(world, pickBadLaunch(world));
      return { screen: SCREEN_OVER, best: world.state.score };
    }
    return { screen: SCREEN_LEVEL, best: world.state.score };
  }

  if (name !== 'play' && name !== 'action' && name !== 'end') {
    world.loadLevel(0, false);
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'end') {
    world.loadLevel(0, false);
    const first = pickLaunch(world, seed);
    if (first) flyLaunch(world, first);
    // A lucky first flight can finish the level outright; then start over
    // and lose the honest way, so the scene is always a game over.
    if (world.state.status === 'levelDone') world.loadLevel(0, false);
    while (world.state.status === 'aim') flyLaunch(world, pickBadLaunch(world));
    return { screen: SCREEN_OVER, best: world.state.score };
  }

  const levelIndex = name === 'action' ? 2 : 0;
  const wantGathered = name === 'action' ? 2 : 1;
  world.loadLevel(levelIndex, false);
  let gathered = 0;
  let tries = 0;
  while (gathered < wantGathered && tries < 4 && world.state.status === 'aim') {
    const launch = pickLaunch(world, seed);
    if (!launch) break;
    const before = world.state.collectedCount;
    flyLaunch(world, launch);
    gathered += world.state.collectedCount - before;
    tries += 1;
  }
  if (world.state.status === 'aim') {
    const launch = pickLaunch(world, seed);
    if (launch) flyPartial(world, launch, name === 'action' ? 0.9 : 1.2);
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
