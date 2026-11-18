// Starweaver — every tuning number, colour and piece of copy in one place.
// The playfield is a fixed 1280x800 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Universal gravitation constant, tuned for this field (mass is in planet units). */
export const GRAVITY = 140000;

/** How far the comet may drift past the field edge before the launch is lost. */
export const LOST_MARGIN = 220;

/** A flight that lasts this long is called lost (a comet stuck in orbit). */
export const FLIGHT_TIMEOUT = 12;

/** Comet radius, and the launch power range (pixels per second). */
export const COMET = { radius: 9, minPower: 140, maxPower: 780, dragScale: 2.4 };

/** How close the comet must come to collect a star. */
export const STAR = { radius: 11, collectRadius: 26, points: 100 };

/** Score: each star is worth STAR.points times the combo (1st star in a flight x1, 2nd x2, ...). */
export const LEVEL_BONUS = 250;
export const LAUNCH_BONUS = 50;

export const PALETTE = {
  skyTop: '#0a0e27',
  skyBottom: '#1a1440',
  nebulaA: 'rgba(155, 93, 229, 0.16)',
  nebulaB: 'rgba(46, 196, 182, 0.12)',
  nebulaC: 'rgba(239, 71, 111, 0.10)',
  starWhite: '#e8ecff',
  starBlue: '#9db4ff',
  cometCore: '#fff3c4',
  cometGold: '#ffd166',
  cometTrail: 'rgba(255, 209, 102, 0.55)',
  starGold: '#ffd166',
  starCyan: '#7ef0e0',
  constellation: 'rgba(255, 209, 102, 0.85)',
  text: '#f4f1ea',
  muted: '#9aa3c7',
  panel: 'rgba(10, 14, 39, 0.72)',
  panelEdge: 'rgba(255, 209, 102, 0.35)',
  danger: '#ef476f',
  good: '#7ef0e0',
};

/** Planet body colours, one per planet so each level reads at a glance. */
export const PLANET_COLOURS = {
  terracotta: { base: '#e07856', dark: '#8f3d26', light: '#ffb08a' },
  teal: { base: '#2ec4b6', dark: '#14655e', light: '#8ff0e4' },
  violet: { base: '#9b5de5', dark: '#4d2a86', light: '#cfa8ff' },
  amber: { base: '#f4a261', dark: '#8a4d1d', light: '#ffd09a' },
  rose: { base: '#ef476f', dark: '#7d1f38', light: '#ff9db1' },
  slate: { base: '#6c7ba3', dark: '#39415e', light: '#aab6dd' },
};

export const FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
export const FONT_BODY = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starweaver.best';
export const MUTE_KEY = 'starweaver.muted';

/** Canvas-drawn buttons, in logical coordinates (top-right corner). */
export const BUTTONS = {
  mute: { x: 1184, y: 12, w: 40, h: 40 },
  pause: { x: 1136, y: 12, w: 40, h: 40 },
};
