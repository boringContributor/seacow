// Short-lived DOM effects: bubbles, hearts, z's, confetti.

const layer = document.getElementById("fx")!;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function spawn(
  className: string,
  x: number,
  y: number,
  vars: Record<string, string | number>,
  text = "",
): HTMLElement {
  const el = document.createElement("span");
  el.className = `fx ${className}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, String(v));
  el.addEventListener("animationend", () => el.remove(), { once: true });
  layer.append(el);
  return el;
}

export function bubbles(x: number, y: number, count = 6, spread = 18): void {
  if (reducedMotion.matches) count = Math.min(count, 2);
  for (let i = 0; i < count; i++) {
    spawn("bubble", x + rand(-spread, spread), y + rand(-spread / 2, spread / 2), {
      size: `${rand(6, 18).toFixed(1)}px`,
      dur: `${rand(2.2, 4).toFixed(2)}s`,
      delay: `${(i * rand(0.04, 0.12)).toFixed(2)}s`,
      drift: `${rand(-30, 30).toFixed(0)}px`,
      rise: `${rand(160, 320).toFixed(0)}px`,
    });
  }
}

export function hearts(x: number, y: number, count = 5): void {
  const glyphs = ["💗", "💕", "💖", "🩷", "💞"];
  for (let i = 0; i < count; i++) {
    spawn(
      "heart",
      x + rand(-40, 40),
      y + rand(-10, 10),
      {
        size: `${rand(18, 30).toFixed(0)}px`,
        dur: `${rand(1.6, 2.4).toFixed(2)}s`,
        delay: `${(i * 0.12).toFixed(2)}s`,
        drift: `${rand(-40, 40).toFixed(0)}px`,
        spin: `${rand(-20, 20).toFixed(0)}deg`,
      },
      glyphs[i % glyphs.length],
    );
  }
}

export function snore(x: number, y: number): void {
  spawn(
    "zzz",
    x,
    y,
    { drift: `${rand(10, 40).toFixed(0)}px`, size: `${rand(16, 26).toFixed(0)}px` },
    "z",
  );
}

export function confetti(count = 60): void {
  if (reducedMotion.matches) return;
  const colors = ["#ff9fc0", "#ffe27a", "#bff0e0", "#9fd3ff", "#ffc29f"];
  for (let i = 0; i < count; i++) {
    const el = spawn("confetti", rand(0, innerWidth), -20, {
      color: colors[i % colors.length],
      dur: `${rand(4, 7).toFixed(2)}s`,
      delay: `${rand(0, 1.5).toFixed(2)}s`,
      drift: `${rand(-80, 80).toFixed(0)}px`,
      spin: `${rand(360, 1080).toFixed(0)}deg`,
      fall: `${innerHeight + 40}px`,
    });
    el.style.width = `${rand(6, 10).toFixed(0)}px`;
    el.style.height = `${rand(10, 16).toFixed(0)}px`;
  }
}

/** A sprig of seagrass that sinks to the sea floor and waits to be eaten. */
export class Sprig {
  readonly el: HTMLElement;
  x: number;
  y: number;
  private vy = 0;
  private t = Math.random() * 10;
  private readonly floor: number;

  constructor(x: number, floor: number) {
    this.x = x;
    this.y = -40;
    this.floor = floor;
    this.el = document.createElement("span");
    this.el.className = "sprig";
    this.el.innerHTML = `<svg viewBox="0 0 40 60" aria-hidden="true">
      <path d="M20 58 C18 40 10 30 8 6 C16 20 22 34 22 58Z" fill="#79b25f"/>
      <path d="M21 58 C24 40 30 28 34 10 C28 24 24 36 24 58Z" fill="#5b9a4c"/>
      <path d="M20 58 C20 44 18 30 20 2 C24 26 23 44 23 58Z" fill="#8fc46d"/>
    </svg>`;
    layer.append(this.el);
    this.render();
  }

  get landed(): boolean {
    return this.y >= this.floor;
  }

  step(dt: number): void {
    this.t += dt;
    if (!this.landed) {
      this.vy = Math.min(this.vy + 60 * dt, 70);
      this.y = Math.min(this.floor, this.y + this.vy * dt);
      this.x += Math.sin(this.t * 1.6) * 12 * dt;
    }
    this.render();
  }

  private render(): void {
    const sway = this.landed ? Math.sin(this.t * 1.4) * 4 : Math.sin(this.t * 1.6) * 14;
    this.el.style.transform = `translate(${this.x - 20}px, ${this.y - 30}px) rotate(${sway}deg)`;
  }

  eaten(): void {
    this.el.classList.add("gone");
    setTimeout(() => this.el.remove(), 300);
  }
}
