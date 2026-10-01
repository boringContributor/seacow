// Sound effects (generated with ElevenLabs, in public/sounds) played through
// Web Audio. Browsers only allow audio after a user gesture, so everything
// starts on the first tap or key press.

const NAMES = [
  "boop",
  "bubble",
  "bubble2",
  "bubbles",
  "chew",
  "pet",
  "plop",
  "roll",
  "snore",
  "sparkle",
  "splash",
  "water",
] as const;
export type Sound = (typeof NAMES)[number];

/** Per-sound loudness, to even out the generated files. */
const LEVEL: Record<Sound, number> = {
  boop: 0.7,
  bubble: 0.35,
  bubble2: 0.35,
  bubbles: 0.5,
  chew: 0.8,
  pet: 0.6,
  plop: 0.6,
  roll: 0.4,
  snore: 0.5,
  sparkle: 0.5,
  splash: 0.5,
  water: 0.3,
};

const MUTE_KEY = "moo:muted";
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // No storage: default to sound on.
}

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
const buffers = new Map<Sound, AudioBuffer>();
// Start downloading right away; decoding needs the AudioContext.
const files = new Map(
  NAMES.map((n) => [
    n,
    fetch(`${import.meta.env.BASE_URL}sounds/${n}.mp3`).then((r) => r.arrayBuffer()),
  ]),
);

function unlock(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  // Play even with the iPhone's silent switch on; there's a mute button.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  for (const [name, file] of files) {
    file
      .then((data) => ctx!.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(name, buffer);
        if (name === "water") startWater(buffer);
      })
      .catch((err: unknown) => console.warn(`sound ${name} failed to load`, err));
  }
}

function startWater(buffer: AudioBuffer): void {
  if (!ctx || !master) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(LEVEL.water, ctx.currentTime + 3);
  src.connect(gain).connect(master);
  src.start();
}

for (const type of ["pointerdown", "touchend", "click", "keydown"] as const)
  addEventListener(type, unlock, { capture: true });

/** Play a one-shot. `rate` shifts pitch a little for variety. */
export function play(name: Sound, volume = 1, rate = 1): void {
  const buffer = buffers.get(name);
  if (!ctx || !master || !buffer || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = LEVEL[name] * volume;
  src.connect(gain).connect(master);
  src.start();
}

/** A bubble blip with a slightly random pitch. */
export function blip(volume = 1): void {
  play(Math.random() < 0.5 ? "bubble" : "bubble2", volume, 0.85 + Math.random() * 0.4);
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Remembered for this visit only.
  }
  if (ctx && master) master.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.1);
}
