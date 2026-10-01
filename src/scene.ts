// The sea around Moo: floating specks, the sandy floor, swaying seagrass and
// a couple of shells worth tapping.

import { config } from "./config.ts";

const params = new URLSearchParams(location.search);

export function isNight(now = new Date()): boolean {
  const forced = params.get("night");
  if (forced !== null) return forced !== "0";
  const h = now.getHours();
  const { from, to } = config.night;
  return from > to ? h >= from || h < to : h >= from && h < to;
}

/** "MM-DD" for today, overridable with ?date=MM-DD for testing. */
export function today(now = new Date()): string {
  const forced = params.get("date");
  if (forced && /^\d{2}-\d{2}$/.test(forced)) return forced;
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function specialDay(): { date: string; message: string } | undefined {
  return config.specialDays.find((d) => d.date === today());
}

// ---------------------------------------------------------------- specks

export function startSpecks(canvas: HTMLCanvasElement, night: () => boolean): void {
  const ctx = canvas.getContext("2d")!;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const specks = Array.from({ length: 70 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + Math.random() * 1.8,
    s: 0.004 + Math.random() * 0.01,
    p: Math.random() * Math.PI * 2,
    glow: Math.random() < 0.35,
  }));
  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener("resize", resize);
  resize();
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    const dark = night();
    for (const p of specks) {
      if (!still) {
        p.y -= p.s * dt * (dark ? 0.6 : 1);
        p.p += dt * 0.6;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
      }
      const x = (p.x + Math.sin(p.p) * 0.006) * w;
      const y = p.y * h;
      if (dark && p.glow) {
        const pulse = 0.5 + 0.5 * Math.sin(p.p * 1.7);
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 7);
        g.addColorStop(0, `rgba(150, 255, 235, ${0.55 * pulse + 0.2})`);
        g.addColorStop(1, "rgba(150, 255, 235, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, p.r * 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = dark ? "rgba(180, 210, 255, 0.25)" : "rgba(255, 255, 255, 0.45)";
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- sea floor

const SHELL_SVG = `<svg viewBox="0 0 64 56" aria-hidden="true">
  <path d="M26 50 L22 55 L42 55 L38 50Z" fill="#f2a48f" stroke="#b8665a" stroke-width="2" stroke-linejoin="round"/>
  <path d="M28 51 C14 46 6 36 6 24 C6 10 18 2 32 2 C46 2 58 10 58 24 C58 36 50 46 36 51Z" fill="url(#shellGrad)" stroke="#b8665a" stroke-width="2"/>
  <g stroke="#d27e6f" stroke-width="1.8" fill="none" stroke-linecap="round">
    <path d="M32 50 L32 4"/><path d="M31 50 C24 34 18 20 14 10"/><path d="M33 50 C40 34 46 20 50 10"/>
    <path d="M30 50 C18 40 12 32 8 22"/><path d="M34 50 C46 40 52 32 56 22"/>
  </g>
</svg>`;

/** Builds the sea floor and returns its shells so they can be wired up. */
export function buildSeabed(root: HTMLElement): HTMLButtonElement[] {
  root.innerHTML = `
    <svg class="sand" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--sand-top)"/>
          <stop offset="1" stop-color="var(--sand-low)"/>
        </linearGradient>
        <linearGradient id="shellGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe0cc"/><stop offset="1" stop-color="#f3a08c"/>
        </linearGradient>
      </defs>
      <path d="M0 120 C180 80 320 110 480 96 C660 80 760 60 960 88 C1140 112 1280 76 1440 92 L1440 200 L0 200Z" fill="var(--sand-far)"/>
      <path d="M0 150 C200 120 380 150 560 134 C760 116 900 140 1080 128 C1240 118 1340 136 1440 126 L1440 200 L0 200Z" fill="url(#sandGrad)"/>
    </svg>
    <div class="grass"></div>
    <div class="rocks">
      <span class="rock" style="left:14%;--s:1"></span>
      <span class="rock" style="left:16.5%;--s:.6"></span>
      <span class="rock" style="left:71%;--s:.8"></span>
    </div>`;

  const grass = root.querySelector<HTMLElement>(".grass")!;
  const clumps = [4, 9, 22, 30, 38, 55, 63, 78, 86, 94];
  for (const left of clumps) {
    const clump = document.createElement("div");
    clump.className = "clump";
    clump.style.left = `${left + Math.random() * 2}%`;
    const blades = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < blades; i++) {
      const blade = document.createElement("span");
      blade.className = "blade";
      blade.style.setProperty("--h", `${(60 + Math.random() * 110).toFixed(0)}px`);
      blade.style.setProperty("--x", `${(i - blades / 2) * 7}px`);
      blade.style.setProperty("--tilt", `${(Math.random() * 16 - 8).toFixed(1)}deg`);
      blade.style.setProperty("--delay", `${(-Math.random() * 6).toFixed(2)}s`);
      blade.style.setProperty("--dur", `${(4 + Math.random() * 3).toFixed(2)}s`);
      blade.style.setProperty("--hue", `${(Math.random() * 18 - 9).toFixed(0)}`);
      clump.append(blade);
    }
    grass.append(clump);
  }

  const shells: HTMLButtonElement[] = [];
  for (const [left, rot] of [
    [27, -12],
    [82, 9],
  ]) {
    const b = document.createElement("button");
    b.className = "shell";
    b.type = "button";
    b.setAttribute("aria-label", "A shell. Something's tucked inside.");
    b.style.left = `${left}%`;
    b.style.setProperty("--rot", `${rot}deg`);
    b.innerHTML = SHELL_SVG;
    root.append(b);
    shells.push(b);
  }
  return shells;
}
