// Everything the eye sees: a pre-rendered nebula sky, twinkling background stars,
// glowing worlds, the comet and its trail, the predicted flight path, the HUD,
// and the title, pause, level-complete, game-over and victory screens.
// The playfield is 1280x800 logical units, letterboxed into the window.

import { BUTTONS, FIELD, FONT_BODY, FONT_DISPLAY, PALETTE, PLANET_COLOURS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';

const BACKGROUND_STARS = 150;

function numberWithCommas(value) {
  return value.toLocaleString('en-US');
}

export function createRenderer(canvas, random) {
  const context = canvas.getContext('2d');

  // The sky: a gradient and three soft nebula clouds, painted once to an offscreen
  // canvas so the frame only pays for the twinkling stars.
  const sky = document.createElement('canvas');
  sky.width = FIELD.width;
  sky.height = FIELD.height;
  const skyContext = sky.getContext('2d');
  const gradient = skyContext.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(1, PALETTE.skyBottom);
  skyContext.fillStyle = gradient;
  skyContext.fillRect(0, 0, FIELD.width, FIELD.height);
  const clouds = [
    { x: 260, y: 220, r: 300, colour: PALETTE.nebulaA },
    { x: 1020, y: 180, r: 260, colour: PALETTE.nebulaB },
    { x: 700, y: 640, r: 320, colour: PALETTE.nebulaC },
  ];
  for (const cloud of clouds) {
    const glow = skyContext.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
    glow.addColorStop(0, cloud.colour);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    skyContext.fillStyle = glow;
    skyContext.fillRect(cloud.x - cloud.r, cloud.y - cloud.r, cloud.r * 2, cloud.r * 2);
  }

  const backgroundStars = [];
  for (let i = 0; i < BACKGROUND_STARS; i += 1) {
    backgroundStars.push({
      x: random.next() * FIELD.width,
      y: random.next() * FIELD.height,
      radius: 0.6 + random.next() * 1.6,
      phase: random.next() * Math.PI * 2,
      speed: 0.4 + random.next() * 1.6,
      colour: random.next() < 0.75 ? PALETTE.starWhite : PALETTE.starBlue,
    });
  }

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return dpr;
  }

  /** Where a planet is at a given time (orbiting planets move); mirrors world.js. */
  function planetPosition(planet, time) {
    if (planet.orbitRadius === undefined) return { x: planet.x, y: planet.y };
    const angle = planet.phase + planet.orbitSpeed * time;
    return {
      x: planet.cx + Math.cos(angle) * planet.orbitRadius,
      y: planet.cy + Math.sin(angle) * planet.orbitRadius,
    };
  }

  function drawBackground(time) {
    context.drawImage(sky, 0, 0);
    for (const star of backgroundStars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * star.speed + star.phase));
      context.globalAlpha = alpha;
      context.fillStyle = star.colour;
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawConstellation(state) {
    const collected = state.stars.filter((star) => star.collected).sort((a, b) => a.order - b.order);
    if (collected.length < 2) return;
    context.strokeStyle = PALETTE.constellation;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(collected[0].x, collected[0].y);
    for (let i = 1; i < collected.length; i += 1) context.lineTo(collected[i].x, collected[i].y);
    context.stroke();
    for (const star of collected) {
      context.fillStyle = PALETTE.starGold;
      context.beginPath();
      context.arc(star.x, star.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawStarShape(x, y, radius, time, phase) {
    const pulse = 1 + 0.08 * Math.sin(time * 3 + phase);
    const r = radius * pulse;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, 'rgba(126, 240, 224, 0.5)');
    glow.addColorStop(1, 'rgba(126, 240, 224, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, r * 3, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = '#eafffb';
    context.beginPath();
    context.arc(x, y, r * 0.45, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.starCyan;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x - r, y);
    context.lineTo(x + r, y);
    context.moveTo(x, y - r);
    context.lineTo(x, y + r);
    context.stroke();
  }

  function drawPlanet(planet, position, time) {
    const colours = PLANET_COLOURS[planet.colour] ?? PLANET_COLOURS.slate;
    if (planet.orbitRadius !== undefined) {
      context.strokeStyle = 'rgba(154, 163, 199, 0.18)';
      context.setLineDash([4, 10]);
      context.lineWidth = 1;
      context.beginPath();
      context.arc(planet.cx, planet.cy, planet.orbitRadius, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    const { x, y } = position;
    const r = planet.r;
    const shade = context.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    shade.addColorStop(0, colours.light);
    shade.addColorStop(0.45, colours.base);
    shade.addColorStop(1, colours.dark);
    context.fillStyle = shade;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(244, 241, 234, 0.25)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.7);
    context.stroke();
    if (planet.ring) {
      context.save();
      context.translate(x, y);
      context.rotate(-0.35);
      context.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(0, 0, r * 1.7, r * 0.45, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  function drawHole(hole, time) {
    const { x, y, r } = hole;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
    glow.addColorStop(0, 'rgba(155, 93, 229, 0.4)');
    glow.addColorStop(1, 'rgba(155, 93, 229, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, r * 3.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = '#05030f';
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#cfa8ff';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, r + 4, time * 0.8, time * 0.8 + Math.PI * 1.2);
    context.stroke();
    context.strokeStyle = 'rgba(207, 168, 255, 0.5)';
    context.beginPath();
    context.arc(x, y, r + 9, time * 0.8 + Math.PI, time * 0.8 + Math.PI * 2.1);
    context.stroke();
  }

  function drawPad(pad) {
    context.strokeStyle = 'rgba(255, 209, 102, 0.7)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = 'rgba(255, 209, 102, 0.25)';
    context.beginPath();
    context.arc(pad.x, pad.y, 34, 0, Math.PI * 2);
    context.stroke();
  }

  function drawComet(state) {
    const comet = state.comet;
    const trail = state.trail;
    if (trail.length > 1) {
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (let i = 1; i < trail.length; i += 1) {
        const fraction = i / trail.length;
        context.strokeStyle = `rgba(255, 209, 102, ${0.55 * fraction})`;
        context.lineWidth = 1 + 7 * fraction;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(trail[i - 1].x, trail[i - 1].y);
        context.lineTo(trail[i].x, trail[i].y);
        context.stroke();
      }
      context.restore();
    }
    const glow = context.createRadialGradient(comet.x, comet.y, 0, comet.x, comet.y, 30);
    glow.addColorStop(0, 'rgba(255, 243, 196, 0.9)');
    glow.addColorStop(0.35, 'rgba(255, 209, 102, 0.45)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = glow;
    context.beginPath();
    context.arc(comet.x, comet.y, 30, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = PALETTE.cometCore;
    context.beginPath();
    context.arc(comet.x, comet.y, 8, 0, Math.PI * 2);
    context.fill();
  }

  function drawParticles(state) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.colour;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
  }

  function drawAim(aim, state) {
    if (!aim || !aim.show) return;
    if (aim.drag) {
      context.strokeStyle = 'rgba(255, 209, 102, 0.8)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(state.level.pad.x, state.level.pad.y);
      context.lineTo(aim.drag.x, aim.drag.y);
      context.stroke();
      context.fillStyle = PALETTE.cometGold;
      context.beginPath();
      context.arc(aim.drag.x, aim.drag.y, 6, 0, Math.PI * 2);
      context.fill();
    }
    if (aim.points.length > 1) {
      for (let i = 0; i < aim.points.length; i += 1) {
        const point = aim.points[i];
        const fade = 1 - i / aim.points.length;
        context.fillStyle = `rgba(255, 209, 102, ${0.25 + 0.55 * fade})`;
        context.beginPath();
        context.arc(point.x, point.y, 2.5 + 1.5 * fade, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawStarPips(state) {
    const total = state.stars.length;
    const startX = FIELD.width / 2 - ((total - 1) * 30) / 2;
    for (let i = 0; i < total; i += 1) {
      const x = startX + i * 30;
      const y = 32;
      const star = state.stars[i];
      if (star.collected) {
        context.fillStyle = PALETTE.starGold;
        context.beginPath();
        context.arc(x, y, 7, 0, Math.PI * 2);
        context.fill();
      } else {
        context.strokeStyle = 'rgba(244, 241, 234, 0.5)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(x, y, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }

  function drawButton(button, label, active) {
    context.fillStyle = active ? 'rgba(255, 209, 102, 0.2)' : PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(button.x, button.y, button.w, button.h, 8);
    context.fill();
    context.stroke();
    context.fillStyle = PALETTE.text;
    context.font = `16px ${FONT_BODY}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, button.x + button.w / 2, button.y + button.h / 2 + 1);
  }

  function drawHud(state, best, muted, paused) {
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillStyle = PALETTE.muted;
    context.font = `600 13px ${FONT_BODY}`;
    context.fillText(`LEVEL ${state.levelIndex + 1} OF 8`, 24, 30);
    context.fillStyle = PALETTE.text;
    context.font = `600 20px ${FONT_BODY}`;
    context.fillText(state.level.name, 24, 54);
    drawStarPips(state);

    context.textAlign = 'right';
    context.fillStyle = PALETTE.text;
    context.font = `700 22px ${FONT_BODY}`;
    context.fillText(`SCORE ${numberWithCommas(state.score)}`, 1120, 34);
    context.fillStyle = PALETTE.muted;
    context.font = `600 12px ${FONT_BODY}`;
    context.fillText(`BEST ${numberWithCommas(Math.max(best, state.score))}`, 1120, 56);

    drawButton(BUTTONS.pause, paused ? '▶' : '❚❚', false);
    drawButton(BUTTONS.mute, muted ? '✕' : '♪', false);

    // Launches left, bottom left.
    context.textAlign = 'left';
    context.fillStyle = PALETTE.muted;
    context.font = `600 12px ${FONT_BODY}`;
    context.fillText('LAUNCHES', 24, 762);
    for (let i = 0; i < state.level.launches; i += 1) {
      const x = 100 + i * 22;
      const y = 758;
      if (i < state.launchesLeft) {
        context.fillStyle = PALETTE.cometGold;
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.fill();
      } else {
        context.strokeStyle = 'rgba(154, 163, 199, 0.5)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.stroke();
      }
    }

    // The hint or the latest news, bottom centre.
    if (state.message && state.time < state.messageUntil) {
      context.textAlign = 'center';
      context.fillStyle = PALETTE.text;
      context.font = `15px ${FONT_BODY}`;
      context.fillText(state.message, FIELD.width / 2, 766);
    }

    context.textAlign = 'right';
    context.fillStyle = PALETTE.muted;
    context.font = `12px ${FONT_BODY}`;
    context.fillText('Drag to aim · P pause · M mute · R retry', FIELD.width - 24, 766);
  }

  function dim() {
    context.fillStyle = 'rgba(5, 7, 20, 0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, width, height) {
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x, y, width, height, 14);
    context.fill();
    context.stroke();
  }

  function drawTitle(state, best) {
    dim();
    context.textAlign = 'center';
    context.fillStyle = PALETTE.cometGold;
    try {
      context.letterSpacing = '14px';
    } catch {
      // Older browsers ignore letter spacing; the title still reads.
    }
    context.font = `700 84px ${FONT_DISPLAY}`;
    context.fillText('STARWEAVER', FIELD.width / 2, 300);
    try {
      context.letterSpacing = '0px';
    } catch {
      // Ignore.
    }
    context.fillStyle = PALETTE.text;
    context.font = `20px ${FONT_BODY}`;
    context.fillText('Weave the constellations. Mind the gravity.', FIELD.width / 2, 344);
    context.fillStyle = PALETTE.muted;
    context.font = `15px ${FONT_BODY}`;
    context.fillText('Drag back from the comet and release to fly. Gather every star before the launches run out.', FIELD.width / 2, 382);
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 22px ${FONT_BODY}`;
    context.fillText('Press Space or click to begin', FIELD.width / 2, 452);
    if (best > 0) {
      context.fillStyle = PALETTE.muted;
      context.font = `15px ${FONT_BODY}`;
      context.fillText(`Best score ${numberWithCommas(best)}`, FIELD.width / 2, 486);
    }
    context.fillStyle = PALETTE.muted;
    context.font = `13px ${FONT_BODY}`;
    context.fillText('Arrows aim, Space launches · P pause · M mute · R retry level', FIELD.width / 2, 540);
  }

  function drawPaused() {
    dim();
    panel(FIELD.width / 2 - 220, 300, 440, 190);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = `700 40px ${FONT_DISPLAY}`;
    context.fillText('Paused', FIELD.width / 2, 372);
    context.fillStyle = PALETTE.muted;
    context.font = `15px ${FONT_BODY}`;
    context.fillText('P or Space to keep playing', FIELD.width / 2, 414);
    context.fillText('R retry this level · M mute', FIELD.width / 2, 442);
  }

  function drawLevelComplete(state, best) {
    dim();
    panel(FIELD.width / 2 - 260, 270, 520, 240);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 40px ${FONT_DISPLAY}`;
    context.fillText('Constellation complete', FIELD.width / 2, 346);
    context.fillStyle = PALETTE.text;
    context.font = `20px ${FONT_BODY}`;
    context.fillText(`${state.level.name} woven into the sky`, FIELD.width / 2, 388);
    context.fillStyle = PALETTE.muted;
    context.font = `16px ${FONT_BODY}`;
    context.fillText(`Score ${numberWithCommas(state.score)} · Best ${numberWithCommas(Math.max(best, state.score))}`, FIELD.width / 2, 424);
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 18px ${FONT_BODY}`;
    context.fillText('Press Space for the next constellation', FIELD.width / 2, 466);
  }

  function drawOver(state, best) {
    dim();
    panel(FIELD.width / 2 - 260, 260, 520, 280);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.danger;
    context.font = `700 44px ${FONT_DISPLAY}`;
    context.fillText('Out of launches', FIELD.width / 2, 340);
    context.fillStyle = PALETTE.text;
    context.font = `20px ${FONT_BODY}`;
    context.fillText(`${state.collectedCount} of ${state.stars.length} stars gathered on ${state.level.name}`, FIELD.width / 2, 384);
    context.fillStyle = PALETTE.muted;
    context.font = `16px ${FONT_BODY}`;
    context.fillText(`Score ${numberWithCommas(state.score)} · Best ${numberWithCommas(Math.max(best, state.score))}`, FIELD.width / 2, 418);
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 18px ${FONT_BODY}`;
    context.fillText('R or Space — retry this constellation', FIELD.width / 2, 466);
    context.fillStyle = PALETTE.muted;
    context.font = `15px ${FONT_BODY}`;
    context.fillText('T — start over from the first', FIELD.width / 2, 496);
  }

  function drawWin(state, best) {
    dim();
    panel(FIELD.width / 2 - 280, 250, 560, 300);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 46px ${FONT_DISPLAY}`;
    context.fillText('The sky is woven', FIELD.width / 2, 336);
    context.fillStyle = PALETTE.text;
    context.font = `20px ${FONT_BODY}`;
    context.fillText('All eight constellations shine tonight.', FIELD.width / 2, 380);
    context.fillStyle = PALETTE.muted;
    context.font = `16px ${FONT_BODY}`;
    context.fillText(`Final score ${numberWithCommas(state.score)} · Best ${numberWithCommas(Math.max(best, state.score))}`, FIELD.width / 2, 416);
    context.fillStyle = PALETTE.cometGold;
    context.font = `700 18px ${FONT_BODY}`;
    context.fillText('Press Space to weave it again', FIELD.width / 2, 466);
  }

  return {
    draw(state, screen, best, aim, muted) {
      const dpr = fitCanvas();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const scale = Math.min(width / FIELD.width, height / FIELD.height);
      const offsetX = (width - FIELD.width * scale) / 2;
      const offsetY = (height - FIELD.height * scale) / 2;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = PALETTE.skyTop;
      context.fillRect(0, 0, width, height);
      context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);

      drawBackground(state.time);
      drawConstellation(state);
      for (const star of state.stars) {
        if (!star.collected) drawStarShape(star.x, star.y, 11, state.time, star.x);
      }
      for (const planet of state.level.planets) {
        drawPlanet(planet, planetPosition(planet, state.time), state.time);
      }
      for (const hole of state.level.holes) drawHole(hole, state.time);
      if (screen === SCREEN_PLAY && !state.comet.flying) drawPad(state.level.pad);
      drawAim(aim, state);
      drawComet(state);
      drawParticles(state);
      drawHud(state, best, muted, screen === SCREEN_PAUSED);

      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_LEVEL) drawLevelComplete(state, best);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_WIN) drawWin(state, best);
    },
  };
}
