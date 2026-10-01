// Geometry shared by the artwork generator (scripts/moo.ts) and the page, so
// clicks on the canvas can be mapped back onto Moo's body.

export const ARTBOARD = 640;
/** Where Moo's body origin sits on the artboard, and how much she's scaled. */
export const ORIGIN = { x: 340, y: 320, scale: 0.86 } as const;

/** Points of interest in body space (facing right, y down). */
export const ANCHOR = {
  snout: { x: 238, y: 6 },
  nostril: { x: 218, y: -27 },
  mouth: { x: 214, y: 38 },
  back: { x: -20, y: -86 },
  shell: { x: 116, y: -118 },
  starfish: { x: -40, y: -84 },
  flower: { x: 281, y: 1 },
} as const;

export type Region = "nose" | "belly" | "body" | "tail" | "shell" | "starfish" | "flower" | null;

/** Rough hit regions in body space. */
export function regionAt(
  x: number,
  y: number,
  wearing: { shell: boolean; starfish: boolean; flower: boolean },
): Region {
  const near = (p: { x: number; y: number }, r: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < r * r;
  if (wearing.flower && near(ANCHOR.flower, 42)) return "flower";
  if (wearing.shell && near(ANCHOR.shell, 46)) return "shell";
  if (wearing.starfish && near(ANCHOR.starfish, 40)) return "starfish";
  if (near({ x: 214, y: 4 }, 56)) return "nose";
  // Body: an ellipse from tail stock to snout.
  const inBody = ((x - 10) / 230) ** 2 + (y / 100) ** 2 < 1;
  if (inBody) return y > 28 && x > -170 && x < 170 ? "belly" : "body";
  if (x < -180 && x > -350 && Math.abs(y) < 60) return "tail";
  return null;
}
