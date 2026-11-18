// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// level complete, game over and victory.
//
// ?seed=N fixes the randomness. ?shot=start|play|action|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_COLLECT,
  EVENT_CRASH,
  EVENT_LAUNCH,
  EVENT_LEVEL_DONE,
  EVENT_LOST,
  EVENT_OVER,
  createWorld,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART_ALL,
  ACTION_RETRY,
  createInput,
  dragToLaunch,
} from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_LEVEL,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, createRandom(seed + 1));
const audio = createAudio();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, seed);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  world.loadLevel(0, false);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.resetGame();
    screen = SCREEN_PLAY;
    announce('Playing. Gather every star.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Out of launches. Score ${world.state.score}. Best ${best}.`);
  }

  function finishLevel() {
    screen = SCREEN_LEVEL;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Constellation complete. Score ${world.state.score}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_LAUNCH) audio.launch();
    if (events & EVENT_COLLECT) {
      audio.collect(world.state.combo);
      announce(`${world.state.collectedCount} of ${world.state.stars.length} stars. Score ${world.state.score}.`);
    }
    if (events & EVENT_CRASH) audio.crash();
    if (events & EVENT_LOST) audio.crash();
    if (events & EVENT_LEVEL_DONE) {
      audio.levelComplete();
      finishLevel();
    }
    if (events & EVENT_OVER) {
      audio.gameOver();
      endGame();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_RETRY && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      world.retryLevel();
      screen = SCREEN_PLAY;
      announce('Retrying this constellation.');
    }
    if (actions & ACTION_RESTART_ALL && screen !== SCREEN_TITLE) {
      world.resetGame();
      screen = SCREEN_PLAY;
      announce('Starting over from the first constellation.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN) {
        audio.click();
        startGame();
      } else if (screen === SCREEN_LEVEL) {
        audio.click();
        if (world.nextLevel()) {
          screen = SCREEN_WIN;
          audio.victory();
          if (world.state.score > best) {
            best = world.state.score;
            saveBest(best);
          }
          announce(`The sky is woven. Final score ${world.state.score}.`);
        } else {
          screen = SCREEN_PLAY;
          announce(`Level ${world.state.levelIndex + 1}: ${world.state.level.name}.`);
        }
      } else if (screen === SCREEN_OVER) {
        audio.click();
        world.retryLevel();
        screen = SCREEN_PLAY;
        announce('Retrying this constellation.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  /** The aim to draw: the drag's slingshot vector, or the keyboard aim. */
  function currentAim() {
    if (screen !== SCREEN_PLAY || world.state.status !== 'aim') return { show: false, drag: null, points: [] };
    const pad = world.state.level.pad;
    const drag = input.drag();
    if (drag) {
      const vector = dragToLaunch(pad, { x: drag.x, y: drag.y });
      if (!vector) return { show: false, drag, points: [] };
      return { show: true, drag: { x: drag.x, y: drag.y }, points: world.predict(vector.angle, vector.power) };
    }
    const keyboard = input.keyboardAim();
    if (keyboard.active) {
      return { show: true, drag: null, points: world.predict(keyboard.angle, keyboard.power) };
    }
    return { show: false, drag: null, points: [] };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null);
      return;
    }
    if (screen === SCREEN_PLAY) {
      const launch = input.takeLaunch(world.state.level.pad);
      const events = world.step(STEP, launch);
      handleEvents(events);
      return;
    }
    if (screen === SCREEN_PAUSED) return;
    world.step(STEP, null);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    input.setScreen(screen);
    input.setCometReady(screen === SCREEN_PLAY && world.state.status === 'aim');
    handleActions();
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
      if (screen === SCREEN_PAUSED) {
        accumulator = 0;
        break;
      }
    }
    renderer.draw(world.state, screen, best, currentAim(), audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting a comet fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // The first gesture unlocks audio on every surface.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Starweaver. Drag back from the comet and release to fly, or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
