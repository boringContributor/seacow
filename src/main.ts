import "./style.css";
import { config } from "./config.ts";
import * as fx from "./fx.ts";
import { Moo, type Toggle } from "./moo.ts";
import { ANCHOR, ARTBOARD, ORIGIN, regionAt, type Region } from "./rig.ts";
import { buildSeabed, isNight, specialDay, startSpecks } from "./scene.ts";
import * as sound from "./sound.ts";
import { bump, memory, save } from "./store.ts";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const now = () => performance.now() / 1000;

// ---------------------------------------------------------------- scene

const sea = $("#sea");
const wrap = $("#moo");
const canvas = wrap.querySelector("canvas")!;
const special = specialDay();
let night = isNight();
document.documentElement.classList.toggle("night", night);
setInterval(() => {
  night = isNight();
  document.documentElement.classList.toggle("night", night);
}, 60_000);

startSpecks($<HTMLCanvasElement>("#specks"), () => night);
const seabedShells = buildSeabed($("#seabed"));

memory.visits += 1;
memory.lastVisit = Date.now();
save();

// ---------------------------------------------------------------- body & screen space

let size = 0; // Moo's canvas, in CSS px (square)
let floorY = 0; // where food comes to rest
const pos = { x: 0, y: 0 }; // canvas centre, viewport px
const vel = { x: 0, y: 0 };
let facing: 1 | -1 = 1;
let flip = 1; // rendered scaleX, eases towards `facing`
let tilt = 0; // degrees

function layout(): void {
  const narrow = innerWidth < 640;
  size = narrow
    ? clamp(innerWidth * 0.82, 240, 400)
    : clamp(Math.min(innerWidth * 0.42, innerHeight * 0.75), 300, 560);
  wrap.style.width = wrap.style.height = `${size}px`;
  floorY = innerHeight - clamp(innerHeight * 0.1, 50, 110);
  moo?.resize();
}

/** Body space (see rig.ts) to viewport px. */
function toScreen(p: { x: number; y: number }): { x: number; y: number } {
  const k = size / ARTBOARD;
  const dx = (ORIGIN.x + p.x * ORIGIN.scale - ARTBOARD / 2) * k * flip;
  const dy = (ORIGIN.y + p.y * ORIGIN.scale - ARTBOARD / 2) * k;
  const r = (tilt * Math.PI) / 180;
  return {
    x: pos.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: pos.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

/** Viewport px to body space, or null while she's mid-turn. */
function toBody(x: number, y: number): { x: number; y: number } | null {
  if (Math.abs(flip) < 0.35) return null;
  const k = size / ARTBOARD;
  const r = (-tilt * Math.PI) / 180;
  const rx = x - pos.x;
  const ry = y - pos.y;
  const dx = rx * Math.cos(r) - ry * Math.sin(r);
  const dy = rx * Math.sin(r) + ry * Math.cos(r);
  return {
    x: (dx / (k * flip) + ARTBOARD / 2 - ORIGIN.x) / ORIGIN.scale,
    y: (dy / k + ARTBOARD / 2 - ORIGIN.y) / ORIGIN.scale,
  };
}

function hit(x: number, y: number): Region {
  const b = toBody(x, y);
  if (!b || !moo) return null;
  return regionAt(b.x, b.y, {
    shell: moo.is("shell"),
    starfish: moo.is("starfish"),
    flower: moo.is("flower"),
  });
}

/** Offset from canvas centre to her snout for a given facing. */
function snoutOffset(dir: 1 | -1): { x: number; y: number } {
  const k = size / ARTBOARD;
  return {
    x: (ORIGIN.x + ANCHOR.snout.x * ORIGIN.scale - ARTBOARD / 2) * k * dir,
    y: (ORIGIN.y + ANCHOR.snout.y * ORIGIN.scale - ARTBOARD / 2) * k,
  };
}

// ---------------------------------------------------------------- state

type Mode = "intro" | "free" | "tripOut" | "away" | "tripBack";
let mode: Mode = "intro";
let arrivalStart = 0;
let moo: Moo | undefined;

let lastActivity = now(); // last time she was interacted with
let lastPointerMove = -999;
const pointer = { x: -1, y: -1, inside: false };
let busyUntil = 0; // she holds still while an animation plays
let mood: { text: string; until: number } = { text: "", until: 0 };
let wander: { x: number; y: number; until: number } | undefined;
// Earliest time for her next adventure. She only goes when left alone for a
// bit, but before she'd doze off (see sleepAfter).
let nextTrip = now() + rand(15, 30);
let awayUntil = 0;
let tripSide: 1 | -1 = 1;
const homeSpot = () => ({ x: innerWidth / 2 + rand(-60, 60), y: innerHeight * rand(0.48, 0.6) });
let tripTarget = homeSpot();
let tripFinds = 0;
let rub = 0;
const sprigs: fx.Sprig[] = [];

const sleepAfter = () => (night ? 16 : 35);

function feel(text: string, seconds: number): void {
  mood = { text, until: now() + seconds };
}

function wake(): void {
  lastActivity = now();
  moo?.set("sleepy", false);
}

// ---------------------------------------------------------------- interactions

function boop(): void {
  moo?.fire("boop");
  sound.play("boop", 1, 0.9 + Math.random() * 0.2);
  setTimeout(() => sound.play("bubbles", 0.6), 120);
  busyUntil = now() + 0.8;
  feel("booped 😳", 4);
  const n = toScreen(ANCHOR.nostril);
  fx.bubbles(n.x, n.y, 7, 10);
  const boops = bump("boops");
  render();
  const milestone =
    (config.flowerAtBoops as readonly number[]).includes(boops) ||
    (boops > 50 && boops % 100 === 0);
  if (milestone && !moo?.is("flower")) {
    setTimeout(() => {
      moo?.set("flower", true);
      toast("Luisa has something for you. Tap the flower 🌸");
    }, 900);
  }
}

function rollOver(): void {
  moo?.fire("roll");
  sound.play("roll");
  busyUntil = now() + 2.6;
  feel("giggly 🤭", 5);
  bump("rolls");
  setTimeout(() => {
    const b = toScreen({ x: 0, y: 0 });
    fx.bubbles(b.x, b.y - size * 0.1, 10, size * 0.25);
    sound.play("bubbles", 0.7);
  }, 500);
}

function pet(): void {
  moo?.fire("pet");
  sound.play("pet");
  busyUntil = now() + 1.4;
  feel("loved 🥰", 6);
  bump("pets");
  const back = toScreen(ANCHOR.back);
  fx.hearts(back.x, back.y, 5);
}

function eat(sprig: fx.Sprig): void {
  sprigs.splice(sprigs.indexOf(sprig), 1);
  sprig.eaten();
  moo?.fire("chew");
  sound.play("chew");
  busyUntil = now() + 2.8;
  feel("munching 🥬", 4);
  memory.lastFed = Date.now();
  bump("seagrass");
  render();
}

let shellIndex = memory.shellsOpened;
function nextShellMessage(): string {
  const list = config.shellMessages;
  const i = shellIndex++;
  bump("shellsOpened");
  return i < list.length ? list[i] : pick(list);
}

function take(item: Extract<Toggle, "shell" | "starfish" | "flower">): void {
  moo?.set(item, false);
  if (item === "flower") {
    bump("flowers");
    note(config.flowerNote, "🌸");
  } else if (item === "shell") {
    note(nextShellMessage(), "🐚");
  } else {
    note(
      config.manateeFacts[tripFinds % config.manateeFacts.length],
      "⭐",
      "Luisa's fact of the day",
    );
  }
}

function onRegion(region: Region): void {
  switch (region) {
    case "nose":
      return boop();
    case "belly":
      return rollOver();
    case "body":
    case "tail":
      return pet();
    case "shell":
    case "starfish":
    case "flower":
      return take(region);
  }
}

function feed(): void {
  wake();
  if (mode === "away") awayUntil = 0;
  if (mode === "tripOut") {
    mode = "tripBack";
    tripTarget = homeSpot();
  }
  if (sprigs.length >= 3) return toast("Luisa's plate is full. Let her catch up 🥬");
  const margin = Math.min(160, innerWidth * 0.15);
  const x = clamp(pos.x + rand(-size * 0.7, size * 0.7), margin, innerWidth - margin);
  sprigs.push(new fx.Sprig(x, floorY - rand(0, 18)));
  setTimeout(() => sound.play("plop", 1, 0.9 + Math.random() * 0.2), 350);
}

sea.addEventListener("pointerdown", (e) => {
  if ((e.target as Element).closest("button, dialog, .card, .toolbar, a")) return;
  wake();
  // Touch has no hover: a tap in the water is where she should swim to.
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
  lastPointerMove = now();
  const region = hit(e.clientX, e.clientY);
  if (region && mode !== "intro") {
    onRegion(region);
  } else {
    fx.bubbles(e.clientX, e.clientY, 4, 8);
    sound.blip();
  }
});

sea.addEventListener("pointermove", (e) => {
  const dx = e.clientX - pointer.x;
  const dy = e.clientY - pointer.y;
  const moved = pointer.x < 0 ? 0 : Math.hypot(dx, dy);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
  lastPointerMove = now();
  if (Math.hypot(e.clientX - pos.x, e.clientY - pos.y) < size) wake();

  const region = hit(e.clientX, e.clientY);
  sea.dataset.hover = region ?? "";
  // Rubbing back and forth over her counts as petting.
  if (region === "body" || region === "belly" || region === "tail") {
    rub += moved;
    if (rub > 900 && now() > busyUntil && mode === "free") {
      rub = 0;
      pet();
    }
  }
});
sea.addEventListener("pointerleave", (e) => {
  // A lifted finger "leaves" too; keep heading for where it tapped.
  if (e.pointerType === "mouse") pointer.inside = false;
});

$("#feed").addEventListener("click", feed);

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || $<HTMLDialogElement>("#note").open || mode === "intro")
    return;
  const actions: Record<string, () => void> = { b: boop, r: rollOver, p: pet, f: feed };
  const action = actions[e.key.toLowerCase()];
  if (action) {
    wake();
    action();
  }
});

const muteButton = $<HTMLButtonElement>("#sound");
function showMute(): void {
  const muted = sound.isMuted();
  muteButton.textContent = muted ? "🔇" : "🔊";
  muteButton.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
  muteButton.setAttribute("aria-pressed", String(muted));
}
muteButton.addEventListener("click", () => {
  sound.setMuted(!sound.isMuted());
  showMute();
});
showMute();

for (const shell of seabedShells) {
  shell.addEventListener("click", () => {
    wake();
    shell.classList.add("opened");
    setTimeout(() => shell.classList.remove("opened"), 1200);
    note(nextShellMessage(), "🐚");
  });
}

// ---------------------------------------------------------------- notes & toasts

const dialog = $<HTMLDialogElement>("#note");
function note(text: string, icon: string, heading = "A tiny note"): void {
  $("#note-icon").textContent = icon;
  $("#note-heading").textContent = heading;
  $("#note-text").textContent = text;
  $("#note-sign").textContent = icon === "⭐" ? "— Luisa" : `— ${config.from}`;
  dialog.showModal();
  sound.play("sparkle");
  noteOpenedAt = now();
}
let noteOpenedAt = 0;
dialog.addEventListener("click", (e) => {
  // The tap that opened the note also ends with a click on the backdrop.
  if (e.target === dialog && now() - noteOpenedAt > 0.5) dialog.close();
});

let toastTimer = 0;
function toast(text: string, seconds = 5): void {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), seconds * 1000);
}

// ---------------------------------------------------------------- HUD

function currentMood(t: number): string {
  if (mode === "tripOut" || mode === "away") return "off on an adventure 🧭";
  if (moo?.is("sleepy")) return "sleepy 😴";
  if (t < mood.until) return mood.text;
  if (moo?.is("flower")) return "a little shy 🌸";
  if (moo?.is("shell")) return "very proud of her shell 🐚";
  if (moo?.is("starfish")) return "fashionable ⭐";
  if (special) return "in a party mood 🥳";
  if (t - lastActivity > sleepAfter() * 0.6) return "drowsy 🥱";
  if (sprigs.length) return "hungry! 🥬";
  const hoursSinceFed = (Date.now() - memory.lastFed) / 3_600_000;
  if (hoursSinceFed > 6 && t > 40) return "a bit peckish 🥺";
  if (t - lastPointerMove < 3) return "curious 👀";
  return night ? "cosy 🌙" : "happy 💙";
}

const days = Math.max(1, Math.ceil((Date.now() - memory.firstVisit) / 86_400_000));
function show(sel: string, text: string): void {
  const el = $(sel);
  if (el.textContent !== text) el.textContent = text;
}
function render(): void {
  show("#mood", currentMood(now()));
  show("#seagrass", String(memory.seagrass));
  show("#boops", String(memory.boops));
  show(
    "#days",
    days === 1 ? "Luisa has been yours since today." : `Luisa has been yours for ${days} days.`,
  );
}
setInterval(render, 400);

// ---------------------------------------------------------------- swimming

function steer(dt: number, t: number): void {
  if (!moo) return;
  const sleepy = moo.is("sleepy");
  let target: { x: number; y: number } | undefined;
  let speed = night ? 125 : 150;
  let wantFacing: 1 | -1 | undefined;

  // On phones the stats card spans the top, so keep her below it.
  const topY = innerWidth < 640 ? 150 + size * 0.05 : size * 0.18 + 40;
  const lowY = floorY - size * 0.1;
  // She fills ~80% of her canvas, so this keeps all of her on screen.
  const margin = Math.min(size * 0.42, innerWidth / 2);
  const keepIn = (p: { x: number; y: number }) => ({
    x: clamp(p.x, margin, innerWidth - margin),
    y: clamp(p.y, topY, lowY),
  });
  // Aim her snout (not her middle) at a point.
  const snoutTo = (p: { x: number; y: number }, dir: 1 | -1) => {
    const o = snoutOffset(dir);
    return { x: p.x - o.x, y: clamp(p.y - o.y, topY, floorY) };
  };
  const dirTo = (x: number): 1 | -1 =>
    Math.abs(x - pos.x) < size * 0.2 ? facing : x > pos.x ? 1 : -1;

  const food = sprigs.length
    ? sprigs.reduce((a, b) =>
        Math.hypot(a.x - pos.x, a.y - pos.y) < Math.hypot(b.x - pos.x, b.y - pos.y) ? a : b,
      )
    : undefined;

  if (mode === "intro") {
    target = { x: innerWidth / 2, y: innerHeight * 0.56 };
    speed = 190;
  } else if (mode === "tripOut") {
    target = { x: tripSide > 0 ? innerWidth + size : -size, y: pos.y };
    speed = 210;
  } else if (mode === "away") {
    target = { ...pos };
    vel.x = vel.y = 0;
  } else if (mode === "tripBack") {
    target = tripTarget;
    speed = 200;
  } else if (t < busyUntil) {
    target = { ...pos };
  } else if (food && food.y > 0) {
    wake();
    wantFacing = dirTo(food.x);
    target = snoutTo(food, wantFacing);
    speed = 175;
    const s = toScreen(ANCHOR.mouth);
    if (Math.hypot(s.x - food.x, s.y - food.y) < Math.max(40, size * 0.08) && Math.abs(flip) > 0.8)
      eat(food);
  } else if (sleepy) {
    target = { x: pos.x + Math.sin(t * 0.1) * 30, y: lowY - size * 0.05 };
    speed = 14;
  } else if (pointer.inside && t - lastPointerMove < 8) {
    const over = hit(pointer.x, pointer.y);
    if (over) {
      target = { ...pos };
    } else {
      wantFacing = dirTo(pointer.x);
      target = keepIn(snoutTo({ x: pointer.x + wantFacing * -24, y: pointer.y }, wantFacing));
    }
  } else {
    if (!wander || t > wander.until) {
      wander = {
        x: rand(innerWidth * 0.2, innerWidth * 0.8),
        y: rand(innerHeight * 0.3, innerHeight * 0.7),
        until: t + rand(7, 12),
      };
    }
    target = keepIn(wander);
    speed = 55;
  }

  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  const want = dist < 6 ? 0 : speed * Math.min(1, dist / 160);
  const ease = Math.min(1, dt * 1.6);
  vel.x += ((dist ? (dx / dist) * want : 0) - vel.x) * ease;
  vel.y += ((dist ? (dy / dist) * want : 0) - vel.y) * ease;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  // Turn around when the movement (or what she wants) clearly points the other way.
  const desired = wantFacing ?? (Math.abs(vel.x) > 30 ? (Math.sign(vel.x) as 1 | -1) : facing);
  if (desired !== facing && t > busyUntil) facing = desired;
  flip += (facing - flip) * Math.min(1, dt * 5);
  tilt += (clamp((vel.y / 150) * 12, -14, 14) * Math.sign(flip || 1) - tilt) * Math.min(1, dt * 3);

  moo.set("swimming", Math.hypot(vel.x, vel.y) > 45 && !sleepy);
  wrap.style.transform = `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px) rotate(${tilt}deg) scaleX(${flip})`;

  // Mode transitions.
  if (mode === "intro" && (dist < 60 || t - arrivalStart > 7)) settle();
  if (mode === "tripOut" && (pos.x < -size * 0.6 || pos.x > innerWidth + size * 0.6)) {
    mode = "away";
    awayUntil = t + rand(5, 9);
  }
  if (mode === "away" && t > awayUntil) {
    mode = "tripBack";
    tripTarget = homeSpot();
    pos.x = tripSide > 0 ? innerWidth + size * 0.6 : -size * 0.6;
    pos.y = innerHeight * rand(0.4, 0.6);
    const find = tripFinds % 2 === 0 ? "shell" : "starfish";
    moo.set(find, true);
    tripFinds += 1;
  }
  if (mode === "tripBack" && dist < 40) {
    mode = "free";
    lastActivity = t; // stay awake to show off the find
    nextTrip = t + rand(100, 200);
    if (moo.is("shell")) toast("Luisa found a shell. I think it's for you — tap it 🐚");
    else if (moo.is("starfish")) toast("Luisa came back with a starfish on her back. Tap it ⭐");
  }
}

function startTripIfBored(t: number): void {
  if (mode !== "free" || !moo || t < nextTrip) return;
  const quiet = t - lastActivity > 18 && t > busyUntil && !sprigs.length;
  const wearing = moo.is("shell") || moo.is("starfish") || moo.is("flower");
  if (!quiet || wearing || moo.is("sleepy")) return;
  mode = "tripOut";
  sound.play("splash", 0.8);
  tripSide = pos.x > innerWidth / 2 ? 1 : -1;
}

function settle(): void {
  mode = "free";
  lastActivity = now();
  document.body.classList.add("settled");
  const s = toScreen(ANCHOR.nostril);
  fx.bubbles(s.x, s.y, 8, 12);
  sound.play("bubbles", 0.5);
  if (special) {
    moo?.set("party", true);
    fx.confetti();
    setTimeout(() => toast(special.message, 7), 600);
  } else if (night) {
    setTimeout(() => toast("It's late. Luisa waited up for you 🌙", 6), 600);
  }
}

let lastFrame = now();
let lastBubble = now();
let lastSnore = now();
function frame(): void {
  const t = now();
  const dt = Math.min(0.05, t - lastFrame);
  lastFrame = t;
  if (moo) {
    if (mode === "free" && !moo.is("sleepy") && t - lastActivity > sleepAfter() && !sprigs.length)
      moo.set("sleepy", true);
    startTripIfBored(t);
    steer(dt, t);
    for (const s of sprigs) s.step(dt);
    rub = Math.max(0, rub - dt * 250);

    const visible = mode !== "away";
    if (visible && moo.is("sleepy") && t - lastSnore > 1.5) {
      lastSnore = t;
      const n = toScreen(ANCHOR.nostril);
      fx.snore(n.x, n.y - 10);
      if (Math.round(t / 1.5) % 2 === 0) sound.play("snore", 0.8, 0.95 + Math.random() * 0.1);
    } else if (visible && !moo.is("sleepy") && t - lastBubble > rand(5, 9)) {
      lastBubble = t;
      const n = toScreen(ANCHOR.nostril);
      fx.bubbles(n.x, n.y, 3, 4);
      sound.blip(0.5);
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- go

layout();
addEventListener("resize", layout);
pos.x = -size * 0.7;
pos.y = innerHeight * 0.6;
wrap.style.transform = `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`;
render();

Moo.load(canvas)
  .then((m) => {
    moo = m;
    layout();
    // A beat of empty sea, then she swims in.
    setTimeout(() => {
      lastFrame = arrivalStart = now();
      requestAnimationFrame(frame);
    }, 800);
  })
  .catch((err: unknown) => {
    console.error(err);
    toast("Luisa got stuck on her way here. Try reloading?", 30);
  });
