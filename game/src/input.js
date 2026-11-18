// Mouse and keyboard, in logical (1280x800) coordinates. The pointer drags back
// from the comet like a slingshot; the arrow keys aim instead and Space launches.
// Buttons (mute, pause) are hit-tested in logical coordinates. The game tells the
// input the current screen and whether the comet is ready, so a click means the
// right thing on each screen.

import { BUTTONS, COMET, FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RETRY = 8;
export const ACTION_RESTART_ALL = 16;

/** A drag shorter than this is a click, not a launch. */
const MIN_DRAG = 14;

/**
 * Turn a drag point into a slingshot launch: the comet flies away from where
 * the player pulled, harder the further they pulled. Null for a mere click.
 */
export function dragToLaunch(pad, point) {
  const dx = pad.x - point.x;
  const dy = pad.y - point.y;
  const distance = Math.hypot(dx, dy);
  if (distance < MIN_DRAG) return null;
  const power = Math.min(COMET.maxPower, Math.max(COMET.minPower, distance * COMET.dragScale));
  return { angle: Math.atan2(dy, dx), power };
}

export function createInput(canvas) {
  let actions = 0;
  let screen = 'title';
  let cometReady = false;
  let drag = null;
  let launch = null;
  let keyAim = { active: false, angle: -Math.PI / 3, power: 420 };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  function hitButton(point, button) {
    return (
      point.x >= button.x &&
      point.x <= button.x + button.w &&
      point.y >= button.y &&
      point.y <= button.y + button.h
    );
  }

  function onPointerDown(event) {
    const point = toLogical(event.clientX, event.clientY);
    if (hitButton(point, BUTTONS.mute)) {
      actions |= ACTION_MUTE;
      return;
    }
    if (hitButton(point, BUTTONS.pause)) {
      actions |= ACTION_PAUSE;
      return;
    }
    if (screen === 'play' && cometReady) {
      drag = { x: point.x, y: point.y, moved: false };
      keyAim.active = false;
    } else if (screen === 'title' || screen === 'over' || screen === 'level' || screen === 'win') {
      actions |= ACTION_CONFIRM;
    }
  }

  function onPointerMove(event) {
    if (!drag) return;
    const point = toLogical(event.clientX, event.clientY);
    drag.x = point.x;
    drag.y = point.y;
    drag.moved = true;
  }

  function onPointerUp(event) {
    if (!drag) return;
    const point = toLogical(event.clientX, event.clientY);
    drag = null;
    // The launch is queued for the game to take; it is only valid on the play screen.
    if (screen === 'play' && cometReady) {
      launch = { x: point.x, y: point.y };
    }
  }

  function onKeyDown(event) {
    const key = event.key;
    if (key === ' ' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
    }
    if (event.repeat) return;
    if (key === ' ' || key === 'Enter') {
      if (screen === 'play' && cometReady && keyAim.active) launch = { keyboard: true };
      else actions |= ACTION_CONFIRM;
    } else if (key === 'p' || key === 'P' || key === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (key === 'm' || key === 'M') {
      actions |= ACTION_MUTE;
    } else if (key === 'r' || key === 'R') {
      actions |= ACTION_RETRY;
    } else if (key === 't' || key === 'T') {
      actions |= ACTION_RESTART_ALL;
    } else if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      if (screen === 'play' && cometReady) {
        keyAim.active = true;
        drag = null;
        if (key === 'ArrowLeft') keyAim.angle -= 0.06;
        if (key === 'ArrowRight') keyAim.angle += 0.06;
        if (key === 'ArrowUp') keyAim.power = Math.min(COMET.maxPower, keyAim.power + 24);
        if (key === 'ArrowDown') keyAim.power = Math.max(COMET.minPower, keyAim.power - 24);
      }
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  return {
    setScreen(next) {
      screen = next;
      if (next !== 'play') {
        drag = null;
        keyAim.active = false;
      }
    },
    setCometReady(ready) {
      cometReady = ready;
      if (!ready) drag = null;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The drag in progress, in logical coordinates, or null. */
    drag() {
      return drag;
    },
    /** The keyboard aim (angle in radians, power in px/s), active when the arrows were used. */
    keyboardAim() {
      return keyAim;
    },
    /**
     * A launch the player queued (a released drag, or Space with a keyboard aim),
     * or null. The pad position is passed in so the drag can be turned into a
     * slingshot vector: pull back, release, and the comet flies the other way.
     */
    takeLaunch(pad) {
      if (!launch) return null;
      const queued = launch;
      launch = null;
      if (queued.keyboard) {
        return { angle: keyAim.angle, power: keyAim.power };
      }
      return dragToLaunch(pad, { x: queued.x, y: queued.y });
    },
  };
}
