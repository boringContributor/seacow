// Short-lived DOM effects: bubbles, hearts, z's, confetti.

const layer = document.getElementById("fx")!;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Animated with the Web Animations API and plain numbers: Safari doesn't
// reliably resolve CSS variables inside @keyframes.
function spawn(
  className: string,
  x: number,
  y: number,
  keyframes: Keyframe[],
  timing: { duration: number; delay?: number; easing?: string },
  text = "",
): HTMLElement {
  const el = document.createElement("span");
  el.className = `fx ${className}`;
  el.textContent = text;
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  layer.append(el);
  const anim = el.animate(keyframes, { fill: "both", easing: "linear", ...timing });
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
  return el;
}

const move = (dx: number, dy: number, scale = 1, rotate = 0) =>
  `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale}) rotate(${rotate}deg)`;

export function bubbles(x: number, y: number, count = 6, spread = 18): void {
  if (reducedMotion.matches) count = Math.min(count, 2);
  for (let i = 0; i < count; i++) {
    const size = Math.round(rand(7, 18));
    const rise = rand(160, 320);
    const wobble = rand(6, 14) * (Math.random() < 0.5 ? -1 : 1);
    const drift = rand(-20, 20);
    const el = spawn(
      "bubble",
      x + rand(-spread, spread),
      y + rand(-spread / 2, spread / 2),
      [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        offset: t,
        transform: move(
          drift * t + Math.sin(t * Math.PI * 3) * wobble,
          -rise * t,
          0.35 + 0.65 * Math.min(1, t * 3),
        ),
        opacity: t === 0 ? 0 : t === 1 ? 0 : t > 0.7 ? 0.6 : 1,
      })),
      { duration: rand(2200, 4000), delay: i * rand(40, 120), easing: "cubic-bezier(.3,.6,.5,1)" },
    );
    el.style.width = el.style.height = `${size}px`;
  }
}

export function hearts(x: number, y: number, count = 5): void {
  const glyphs = ["💗", "💕", "💖", "🩷", "💞"];
  for (let i = 0; i < count; i++) {
    const drift = rand(-40, 40);
    const spin = rand(-20, 20);
    const el = spawn(
      "heart",
      x + rand(-40, 40),
      y + rand(-10, 10),
      [
        { offset: 0, transform: move(0, 0, 0.2), opacity: 0 },
        { offset: 0.2, transform: move(drift * 0.2, -20, 1.1, spin), opacity: 1 },
        { offset: 1, transform: move(drift, -130, 0.9, spin), opacity: 0 },
      ],
      { duration: rand(1600, 2400), delay: i * 120, easing: "ease-out" },
      glyphs[i % glyphs.length],
    );
    el.style.fontSize = `${Math.round(rand(18, 30))}px`;
  }
}

export function snore(x: number, y: number): void {
  const drift = rand(10, 40);
  const el = spawn(
    "zzz",
    x,
    y,
    [
      { offset: 0, transform: move(0, 0, 0.4), opacity: 0 },
      { offset: 0.2, opacity: 1 },
      { offset: 1, transform: move(drift, -110, 1.4), opacity: 0 },
    ],
    { duration: 3200, easing: "ease-out" },
    "z",
  );
  el.style.fontSize = `${Math.round(rand(16, 26))}px`;
}

export function confetti(count = 60): void {
  if (reducedMotion.matches) return;
  const colors = ["#ff9fc0", "#ffe27a", "#bff0e0", "#9fd3ff", "#ffc29f"];
  for (let i = 0; i < count; i++) {
    const el = spawn(
      "confetti",
      rand(0, innerWidth),
      -20,
      [
        { transform: "translate(0, 0) rotate(0deg)" },
        {
          transform: `translate(${rand(-80, 80).toFixed(0)}px, ${innerHeight + 40}px) rotate(${rand(360, 1080).toFixed(0)}deg)`,
        },
      ],
      { duration: rand(4000, 7000), delay: rand(0, 1500) },
    );
    el.style.background = colors[i % colors.length];
    el.style.width = `${Math.round(rand(6, 10))}px`;
    el.style.height = `${Math.round(rand(10, 16))}px`;
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
