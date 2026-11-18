// Every sound is synthesised with WebAudio: no audio files, nothing to load.
// The context is created lazily on the first user gesture (browsers block audio
// before one), and mute is remembered in localStorage.

import { MUTE_KEY } from './config.js';

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function createAudio() {
  let context = null;
  let muted = readMuted();
  let master = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** Call from any user gesture so the browser lets audio start. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone({ frequency, endFrequency, type, at, duration, volume }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + (at ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type ?? 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume ?? 0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ at, duration, volume, fromFrequency, toFrequency }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + (at ?? 0);
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(fromFrequency ?? 1200, start);
    if (toFrequency) filter.frequency.exponentialRampToValueAtTime(toFrequency, start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume ?? 0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock,
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: mute then lasts this visit only.
      }
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** The slingshot release: a short airy sweep. */
    launch() {
      noise({ duration: 0.35, volume: 0.3, fromFrequency: 2400, toFrequency: 300 });
      tone({ frequency: 320, endFrequency: 90, type: 'triangle', duration: 0.3, volume: 0.16 });
    },
    /** A star collected: a chime that climbs the pentatonic scale with the combo. */
    collect(combo) {
      const index = Math.min(PENTATONIC.length - 1, Math.max(0, combo - 1));
      tone({ frequency: PENTATONIC[index], type: 'sine', duration: 0.5, volume: 0.22 });
      tone({ frequency: PENTATONIC[index] * 2, type: 'sine', at: 0.05, duration: 0.4, volume: 0.08 });
    },
    /** The comet hitting a planet or the void: a low thud. */
    crash() {
      tone({ frequency: 110, endFrequency: 38, type: 'sine', duration: 0.45, volume: 0.4 });
      noise({ duration: 0.25, volume: 0.2, fromFrequency: 500, toFrequency: 120 });
    },
    /** A level finished: a rising four-note fanfare. */
    levelComplete() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
        tone({ frequency, type: 'triangle', at: i * 0.09, duration: 0.45, volume: 0.18 });
      });
    },
    /** The whole sky woven: a longer fanfare. */
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((frequency, i) => {
        tone({ frequency, type: 'triangle', at: i * 0.11, duration: 0.6, volume: 0.18 });
      });
    },
    /** Out of launches: a short descending phrase. */
    gameOver() {
      [392.0, 329.63, 261.63].forEach((frequency, i) => {
        tone({ frequency, type: 'triangle', at: i * 0.16, duration: 0.4, volume: 0.16 });
      });
    },
    /** A UI tap: a single soft blip. */
    click() {
      tone({ frequency: 880, type: 'sine', duration: 0.07, volume: 0.1 });
    },
  };
}
