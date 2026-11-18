// The rules of Starweaver: a comet, gravity wells, stars to gather, launches to
// spend. The world advances in fixed steps; the same seed and the same launches
// always give the same flight, which is what makes the screenshots reproducible.

import {
  COMET,
  FIELD,
  FLIGHT_TIMEOUT,
  GRAVITY,
  LAUNCH_BONUS,
  LEVEL_BONUS,
  LOST_MARGIN,
  STAR,
  STEP,
} from './config.js';
import { getLevel, levelCount } from './levels.js';

export const EVENT_LAUNCH = 1;
export const EVENT_COLLECT = 2;
export const EVENT_CRASH = 4;
export const EVENT_LOST = 8;
export const EVENT_LEVEL_DONE = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;

/** Gravity is softened inside this squared distance so a close pass never explodes. */
const SOFTENING = 900;

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: getLevel(0),
    score: 0,
    levelStartScore: 0,
    launchesLeft: 0,
    stars: [],
    comet: { x: 0, y: 0, vx: 0, vy: 0, flying: false, flightTime: 0 },
    trail: [],
    particles: [],
    time: 0,
    combo: 0,
    collectedCount: 0,
    status: 'aim',
    message: '',
    messageUntil: 0,
  };

  /** Where a planet is at a given time (orbiting planets move). */
  function planetPosition(planet, time) {
    if (planet.orbitRadius === undefined) return { x: planet.x, y: planet.y };
    const angle = planet.phase + planet.orbitSpeed * time;
    return {
      x: planet.cx + Math.cos(angle) * planet.orbitRadius,
      y: planet.cy + Math.sin(angle) * planet.orbitRadius,
    };
  }

  /** The gravity acceleration at a point and time, from every well. */
  function gravityAt(x, y, time) {
    let ax = 0;
    let ay = 0;
    for (const planet of state.level.planets) {
      const position = planetPosition(planet, time);
      const dx = position.x - x;
      const dy = position.y - y;
      const pull = (GRAVITY * planet.mass) / (dx * dx + dy * dy + SOFTENING);
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      ax += (dx / distance) * pull;
      ay += (dy / distance) * pull;
    }
    for (const hole of state.level.holes) {
      const dx = hole.x - x;
      const dy = hole.y - y;
      const pull = (GRAVITY * hole.mass) / (dx * dx + dy * dy + SOFTENING);
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      ax += (dx / distance) * pull;
      ay += (dy / distance) * pull;
    }
    return { ax, ay };
  }

  /** True when a point would hit a planet or a black hole at a given time. */
  function hitsWell(x, y, time) {
    for (const planet of state.level.planets) {
      const position = planetPosition(planet, time);
      if (Math.hypot(x - position.x, y - position.y) < planet.r + COMET.radius - 2) return true;
    }
    for (const hole of state.level.holes) {
      if (Math.hypot(x - hole.x, y - hole.y) < hole.r + COMET.radius - 2) return true;
    }
    return false;
  }

  function offField(x, y) {
    return (
      x < -LOST_MARGIN || x > FIELD.width + LOST_MARGIN || y < -LOST_MARGIN || y > FIELD.height + LOST_MARGIN
    );
  }

  function burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.next() * Math.PI * 2;
      const velocity = speed * (0.3 + random.next() * 0.7);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.5 + random.next() * 0.5,
        maxLife: 1,
        size: 2 + random.next() * 3,
        colour,
      });
    }
  }

  function say(message) {
    state.message = message;
    state.messageUntil = state.time + 1.8;
  }

  function endFlight(events) {
    state.comet.flying = false;
    state.comet.x = state.level.pad.x;
    state.comet.y = state.level.pad.y;
    state.comet.vx = 0;
    state.comet.vy = 0;
    state.trail.length = 0;
    if (state.collectedCount === state.stars.length) return events;
    if (state.launchesLeft <= 0) {
      state.status = 'over';
      return events | EVENT_OVER;
    }
    state.status = 'aim';
    return events;
  }

  function loadLevel(index, keepScore) {
    const level = getLevel(index);
    state.levelIndex = index;
    state.level = level;
    state.stars = level.stars.map((star) => ({ x: star.x, y: star.y, collected: false, order: -1 }));
    state.launchesLeft = level.launches;
    state.comet.x = level.pad.x;
    state.comet.y = level.pad.y;
    state.comet.vx = 0;
    state.comet.vy = 0;
    state.comet.flying = false;
    state.comet.flightTime = 0;
    state.trail.length = 0;
    state.particles.length = 0;
    state.time = 0;
    state.combo = 0;
    state.collectedCount = 0;
    state.status = 'aim';
    state.message = level.hint;
    state.messageUntil = 4;
    if (!keepScore) {
      state.score = 0;
      state.levelStartScore = 0;
    } else {
      state.levelStartScore = state.score;
    }
  }

  return {
    state,

    loadLevel,
    planetPosition,

    /** Start over from the first constellation with no score. */
    resetGame() {
      loadLevel(0, false);
    },

    /** Replay the current constellation, the score as it was when it began. */
    retryLevel() {
      state.score = state.levelStartScore;
      loadLevel(state.levelIndex, true);
    },

    /** Move on after a finished constellation; true when the last one is woven. */
    nextLevel() {
      if (state.levelIndex + 1 >= levelCount()) {
        state.status = 'win';
        return true;
      }
      loadLevel(state.levelIndex + 1, true);
      return false;
    },

    /**
     * Advance the world one fixed step. `launch` is {angle, power} when the player
     * lets a comet fly, otherwise null. Returns a bitmask of EVENT_*.
     */
    step(dt, launch) {
      let events = 0;
      state.time += dt;

      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const particle = state.particles[i];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life -= dt;
        if (particle.life <= 0) state.particles.splice(i, 1);
      }

      if (state.status === 'aim' && launch) {
        const comet = state.comet;
        comet.vx = Math.cos(launch.angle) * launch.power;
        comet.vy = Math.sin(launch.angle) * launch.power;
        comet.flying = true;
        comet.flightTime = 0;
        state.combo = 0;
        state.launchesLeft -= 1;
        state.status = 'flying';
        state.message = '';
        return EVENT_LAUNCH;
      }

      if (state.status !== 'flying') return events;

      const comet = state.comet;
      comet.flightTime += dt;
      const gravity = gravityAt(comet.x, comet.y, state.time);
      comet.vx += gravity.ax * dt;
      comet.vy += gravity.ay * dt;
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      state.trail.push({ x: comet.x, y: comet.y });
      if (state.trail.length > 42) state.trail.shift();

      for (const star of state.stars) {
        if (star.collected) continue;
        if (Math.hypot(comet.x - star.x, comet.y - star.y) < STAR.collectRadius) {
          star.collected = true;
          star.order = state.collectedCount;
          state.collectedCount += 1;
          state.combo += 1;
          const gained = STAR.points * state.combo;
          state.score += gained;
          burst(star.x, star.y, '#7ef0e0', 22, 260);
          say(`Star gathered  +${gained}`);
          events |= EVENT_COLLECT;
          if (state.collectedCount === state.stars.length) {
            const bonus = LEVEL_BONUS + state.launchesLeft * LAUNCH_BONUS;
            state.score += bonus;
            burst(comet.x, comet.y, '#ffd166', 40, 340);
            state.comet.flying = false;
            state.trail.length = 0;
            state.status = 'levelDone';
            say(`Constellation complete  +${bonus}`);
            return events | EVENT_LEVEL_DONE;
          }
        }
      }

      if (hitsWell(comet.x, comet.y, state.time)) {
        burst(comet.x, comet.y, '#ef476f', 34, 320);
        say('The comet broke on a world');
        return endFlight(events | EVENT_CRASH);
      }

      if (offField(comet.x, comet.y) || comet.flightTime > FLIGHT_TIMEOUT) {
        say(comet.flightTime > FLIGHT_TIMEOUT ? 'The comet drifted away' : 'The comet flew off the sky');
        return endFlight(events | EVENT_LOST);
      }

      return events;
    },

    /**
     * The dotted path a launch would take, simulated with the same gravity the
     * flight uses. Points stop at a crash, at the field edge, or after 2.5 s.
     */
    predict(angle, power) {
      const points = [];
      let x = state.level.pad.x;
      let y = state.level.pad.y;
      let vx = Math.cos(angle) * power;
      let vy = Math.sin(angle) * power;
      let time = state.time;
      const steps = Math.floor(2.5 / STEP);
      for (let i = 0; i < steps; i += 1) {
        time += STEP;
        const gravity = gravityAt(x, y, time);
        vx += gravity.ax * STEP;
        vy += gravity.ay * STEP;
        x += vx * STEP;
        y += vy * STEP;
        if (i % 5 === 0) points.push({ x, y });
        if (hitsWell(x, y, time) || offField(x, y)) break;
      }
      return points;
    },
  };
}
