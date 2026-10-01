// Draws Moo the sea cow (a West Indian manatee, give or take some cuteness)
// and writes public/moo.riv: artwork, animations and the "Moo" state machine.
//
//   node scripts/moo.ts [out.riv]

import { writeFileSync } from "node:fs";
import { ARTBOARD, ORIGIN } from "../src/rig.ts";
import {
  Artboard,
  color,
  emit,
  smooth,
  type Animation,
  type Key,
  type Obj,
} from "./riv/builder.ts";

const out = process.argv[2] ?? new URL("../public/moo.riv", import.meta.url).pathname;

// ---------------------------------------------------------------- palette

const C = {
  skinTop: color("#6c7774"),
  skinMid: color("#8d9792"),
  skinLow: color("#b2b5aa"),
  belly: color("#cbc6b5"),
  outline: color("#4a5452", 0.7),
  fold: color("#4f5957", 0.28),
  farSkin: color("#6f7875"),
  muzzleTop: color("#9a9a90"),
  muzzleLow: color("#bdb6a5"),
  bristle: color("#454c49", 0.55),
  eye: color("#1f2423"),
  eyeShine: color("#ffffff", 0.95),
  nail: color("#ddd5c1"),
  algae: color("#71806a", 0.22),
  blush: color("#f29a9a"),
};

const ab = new Artboard("Moo", ARTBOARD, ARTBOARD);

// ---------------------------------------------------------------- rig

const soft = (
  name: string,
  parent: Obj,
  cx: number,
  cy: number,
  w: number,
  h: number,
  c: string,
  a: number,
) =>
  ab.shape(parent, name, {
    paths: [{ ellipse: [cx, cy, w, h] }],
    paints: [
      {
        fill: {
          radial: {
            center: [cx, cy],
            edge: [cx + w / 2, cy],
            stops: [
              [0, color(c, a)],
              [1, color(c, 0)],
            ],
          },
        },
      },
    ],
  });

const moo = ab.node(ab.root, "moo", { x: ORIGIN.x, y: ORIGIN.y, scale: ORIGIN.scale });
const bob = ab.node(moo, "bob");
const roll = ab.node(bob, "roll");
const squash = ab.node(roll, "squash");

// Far-side flipper, mostly hidden behind the body.
const farFlipper = ab.node(squash, "farFlipper", { x: 140, y: 40, rotation: 12, scale: 0.85 });
const flipperPts = [
  [-8, -12],
  [14, -8],
  [24, 18],
  [20, 50],
  [4, 68],
  [-12, 62],
  [-20, 34],
  [-18, 4],
] as const;
ab.shape(farFlipper, "farFlipperShape", {
  paths: [{ points: smooth(flipperPts) }],
  paints: [{ fill: C.farSkin }, { stroke: C.outline, width: 2.5 }],
});

// Tail paddle.
const tail = ab.node(squash, "tail", { x: -192, y: 4 });
const paddle = ab.shape(tail, "paddle", {
  paths: [
    {
      points: smooth([
        [4, -14],
        [-28, -32],
        [-76, -50],
        [-122, -44],
        [-146, -16],
        [-146, 12],
        [-124, 40],
        [-80, 56],
        [-30, 38],
        [4, 16],
      ]),
    },
  ],
  paints: [
    {
      fill: {
        linear: {
          from: [0, -50],
          to: [0, 56],
          stops: [
            [0, C.skinTop],
            [0.6, C.skinMid],
            [1, C.skinLow],
          ],
        },
      },
    },
    { stroke: C.outline, width: 3 },
  ],
});
soft("paddleShine", tail, -86, -6, 120, 70, "#ffffff", 0.12);
void paddle;

// Body.
const body = ab.shape(squash, "body", {
  paths: [
    {
      points: smooth([
        [206, -40],
        [172, -60],
        [120, -80],
        [40, -98],
        [-60, -94],
        [-140, -66],
        [-194, -28],
        [-210, -4, 0.6],
        [-196, 18],
        [-142, 56],
        [-52, 92],
        [48, 96],
        [122, 78],
        [168, 56],
        [194, 46],
        [222, 34],
        [238, 6],
        [232, -24],
      ]),
    },
  ],
  paints: [
    {
      fill: {
        linear: {
          from: [0, -94],
          to: [0, 88],
          stops: [
            [0, C.skinTop],
            [0.48, C.skinMid],
            [0.78, C.skinLow],
            [1, C.belly],
          ],
        },
      },
    },
    { stroke: C.outline, width: 3 },
  ],
});

// Shading, spots and folds, clipped to the body.
const skin = ab.node(squash, "skin");
ab.clip(skin, body);
soft("bellyGlow", skin, 10, 92, 420, 120, "#e6dfcc", 0.55);
soft("backShine", skin, -20, -74, 300, 70, "#ffffff", 0.18);
for (const [x, y, w] of [
  [-90, -58, 26],
  [-60, -40, 14],
  [-130, -30, 18],
  [20, -66, 16],
  [-20, -50, 10],
]) {
  ab.shape(skin, "algae", {
    paths: [{ ellipse: [x, y, w, w * 0.7] }],
    paints: [{ fill: C.algae }],
  });
}
// Neck folds.
for (const [x, top, bottom, bend] of [
  [92, -60, 56, 14],
  [76, -48, 62, 10],
]) {
  ab.shape(skin, "fold", {
    paths: [
      {
        closed: false,
        points: smooth(
          [
            [x, top],
            [x + bend, (top + bottom) / 2],
            [x, bottom],
          ],
          false,
        ),
      },
    ],
    paints: [{ stroke: C.fold, width: 3 }],
  });
}

// Face.
const face = ab.node(squash, "face");
const eye = ab.node(face, "eye", { x: 140, y: -40 });
ab.shape(eye, "eyeWrinkle", {
  paths: [{ ellipse: [0, 1, 30, 24] }],
  paints: [{ stroke: C.fold, width: 2 }],
});
const eyeOpen = ab.node(eye, "eyeOpen");
ab.shape(eyeOpen, "eyeBall", {
  paths: [{ ellipse: [0, 0, 18, 19] }],
  paints: [{ fill: C.eye }],
});
ab.shape(eyeOpen, "eyeShine", {
  paths: [{ ellipse: [3, -3.5, 6, 6] }, { ellipse: [-3, 4, 2.5, 2.5] }],
  paints: [{ fill: C.eyeShine }],
});
const eyeHappy = ab.node(eye, "eyeHappy", { opacity: 0 });
ab.shape(eyeHappy, "eyeHappyArc", {
  paths: [
    {
      closed: false,
      points: smooth(
        [
          [-8, 3],
          [0, -6],
          [8, 3],
        ],
        false,
      ),
    },
  ],
  paints: [{ stroke: C.eye, width: 3.5 }],
});
const eyeSleep = ab.node(eye, "eyeSleep", { opacity: 0 });
ab.shape(eyeSleep, "eyeSleepArc", {
  paths: [
    {
      closed: false,
      points: smooth(
        [
          [-8, -1],
          [0, 5],
          [8, -1],
        ],
        false,
      ),
    },
  ],
  paints: [{ stroke: C.eye, width: 3 }],
});

const blush = ab.node(face, "blush", { x: 160, y: -8, opacity: 0.5 });
soft("blushGlow", blush, 0, 0, 40, 22, "#f29a9a", 0.9);

// Muzzle: the big bristly upper lip.
const muzzle = ab.node(face, "muzzle", { x: 206, y: 4 });
const muzzleSkin = ab.node(muzzle, "muzzleSkin");
ab.clip(muzzleSkin, body);
soft("muzzleGlow", muzzleSkin, 8, 6, 96, 84, "#d6cfbd", 0.75);
ab.shape(muzzle, "lipCrease", {
  paths: [
    {
      closed: false,
      points: smooth(
        [
          [-30, -34],
          [-40, -4],
          [-30, 24],
          [-12, 36],
        ],
        false,
      ),
    },
  ],
  paints: [{ stroke: C.fold, width: 2.5 }],
});
ab.shape(muzzle, "nostril", {
  paths: [{ ellipse: [12, -31, 11, 5] }],
  paints: [{ fill: color("#3b4341", 0.75) }],
});
const bristleDots: [number, number][] = [
  [4, -12],
  [14, -8],
  [24, -4],
  [-2, -2],
  [8, 2],
  [18, 6],
  [27, 10],
  [-4, 10],
  [6, 14],
  [16, 18],
  [24, 22],
  [-8, 20],
];
ab.shape(muzzle, "bristles", {
  paths: bristleDots.map(([x, y]) => ({ ellipse: [x, y, 3.2, 3.2] as const })),
  paints: [{ fill: C.bristle }],
});
ab.shape(muzzle, "whiskers", {
  paths: [
    [
      [28, 14],
      [44, 18],
    ],
    [
      [24, 22],
      [38, 32],
    ],
    [
      [30, 4],
      [46, 2],
    ],
  ].map((seg) => ({
    closed: false,
    points: smooth(seg as [number, number][], false),
  })),
  paints: [{ stroke: color("#e8e2d2", 0.9), width: 1.6 }],
});
const mouth = ab.shape(muzzle, "mouth", {
  paths: [
    {
      closed: false,
      points: smooth(
        [
          [-10, 31],
          [1, 36],
          [13, 32],
        ],
        false,
      ),
    },
  ],
  paints: [{ stroke: color("#3b4341", 0.7), width: 3 }],
});
void mouth;

// Near flipper, with the little nails real manatees have.
const nearFlipper = ab.node(squash, "nearFlipper", { x: 108, y: 38, rotation: 22 });
ab.shape(nearFlipper, "flipperShape", {
  paths: [{ points: smooth(flipperPts) }],
  paints: [
    {
      fill: {
        linear: {
          from: [0, -10],
          to: [0, 66],
          stops: [
            [0, C.skinMid],
            [1, C.skinLow],
          ],
        },
      },
    },
    { stroke: C.outline, width: 3 },
  ],
});
ab.shape(nearFlipper, "nails", {
  paths: [{ ellipse: [-8, 56, 6, 5] }, { ellipse: [1, 60, 6, 5] }, { ellipse: [10, 55, 6, 5] }],
  paints: [{ fill: C.nail }, { stroke: color("#8f8a7c", 0.6), width: 1 }],
});

// ---------------------------------------------------------------- props

// A mouthful of seagrass, shown while chewing.
const seagrass = ab.node(face, "seagrass", { x: 212, y: 38, opacity: 0 });
const seagrassArt = ab.node(seagrass, "seagrassArt", { scale: 1.5 });
for (const [len, bend, rot, c] of [
  [52, 10, 30, "#6fa35a"],
  [44, -8, 62, "#88b86a"],
  [38, 6, 8, "#5b8f4c"],
] as const) {
  ab.shape(seagrassArt, "blade", {
    rotation: rot,
    paths: [
      {
        points: smooth([
          [0, -3],
          [len * 0.5, -4 + bend],
          [len, bend * 1.4, 0.4],
          [len * 0.5, 4 + bend],
          [0, 3],
        ]),
      },
    ],
    paints: [{ fill: color(c) }, { stroke: color("#3f6b37", 0.6), width: 1.5 }],
  });
}

// A flower she brings back after enough boops.
const flower = ab.node(face, "flower", { x: 222, y: 36, opacity: 0 });
const flowerArt = ab.node(flower, "flowerArt", { scale: 1.35 });
ab.shape(flowerArt, "stem", {
  paths: [
    {
      closed: false,
      points: smooth(
        [
          [-6, 0],
          [18, -6],
          [40, -22],
        ],
        false,
      ),
    },
  ],
  paints: [{ stroke: color("#5f9a4e"), width: 4 }],
});
ab.shape(flowerArt, "leaf", {
  x: 16,
  y: -6,
  rotation: -40,
  paths: [
    {
      points: smooth([
        [0, 0],
        [10, -7],
        [22, 0, 0],
        [10, 6],
      ]),
    },
  ],
  paints: [{ fill: color("#79b25f") }],
});
const bloom = ab.node(flowerArt, "bloom", { x: 44, y: -26 });
for (let i = 0; i < 6; i++) {
  ab.shape(bloom, "petal", {
    rotation: i * 60,
    paths: [{ ellipse: [0, -11, 12, 18] }],
    paints: [
      { fill: color(i % 2 ? "#f9b4c8" : "#f7a1bb") },
      { stroke: color("#d9779a", 0.6), width: 1.2 },
    ],
  });
}
ab.shape(bloom, "bloomCenter", {
  paths: [{ ellipse: [0, 0, 11, 11] }],
  paints: [{ fill: color("#ffd76a") }, { stroke: color("#e0a93c"), width: 1.2 }],
});

// A scallop shell she sometimes comes back wearing.
const shell = ab.node(squash, "shell", { x: 116, y: -86, rotation: 14, opacity: 0 });
const shellArt = ab.node(shell, "shellArt", { scale: 0.8 });
ab.shape(shellArt, "shellEars", {
  paths: [
    {
      points: [
        { x: -13, y: -2, sharp: true, radius: 2 },
        { x: -17, y: 7, sharp: true, radius: 2 },
        { x: 17, y: 7, sharp: true, radius: 2 },
        { x: 13, y: -2, sharp: true, radius: 2 },
      ],
    },
  ],
  paints: [{ fill: color("#f2a48f") }, { stroke: color("#b8665a"), width: 2 }],
});
ab.shape(shellArt, "shellFan", {
  paths: [
    {
      points: smooth([
        [-5, 0, 0],
        [-28, -12],
        [-36, -32],
        [-25, -50],
        [0, -58],
        [25, -50],
        [36, -32],
        [28, -12],
        [5, 0, 0],
      ]),
    },
  ],
  paints: [
    {
      fill: {
        linear: {
          from: [0, -58],
          to: [0, 0],
          stops: [
            [0, color("#ffe0cc")],
            [1, color("#f3a08c")],
          ],
        },
      },
    },
    { stroke: color("#b8665a"), width: 2 },
  ],
});
ab.shape(shellArt, "shellRidges", {
  paths: [-28, -15, 0, 15, 28].map((x) => ({
    closed: false,
    points: smooth(
      [
        [0, -2],
        [x * 0.55, -28],
        [x, -50 + Math.abs(x) * 0.35],
      ],
      false,
    ),
  })),
  paints: [{ stroke: color("#d27e6f", 0.75), width: 1.8 }],
});

// A starfish that hitched a ride on her back.
const starfish = ab.node(squash, "starfish", { x: -40, y: -84, rotation: -12, opacity: 0 });
ab.shape(starfish, "starfishBody", {
  paths: [{ star: [0, 0, 68, 5, 0.42, 8] }],
  paints: [
    {
      fill: {
        radial: {
          center: [0, 0],
          edge: [27, 0],
          stops: [
            [0, color("#ffb86b")],
            [1, color("#f0784a")],
          ],
        },
      },
    },
    { stroke: color("#b9502e"), width: 2 },
  ],
});
ab.shape(starfish, "starfishDots", {
  paths: [0, 72, 144, 216, 288].flatMap((deg) => {
    const r = (deg - 90) * (Math.PI / 180);
    return [10, 17].map((d) => ({
      ellipse: [Math.cos(r) * d, Math.sin(r) * d, 3.4, 3.4] as const,
    }));
  }),
  paints: [{ fill: color("#fff1d6", 0.85) }],
});

// Party hat for special days.
const partyHat = ab.node(squash, "partyHat", { x: 108, y: -86, rotation: 16, opacity: 0 });
const cone = ab.shape(partyHat, "cone", {
  paths: [
    {
      points: [
        { x: -26, y: 0, in: [0, 0], out: [0, 0] },
        { x: 0, y: -74, sharp: true, radius: 3 },
        { x: 26, y: 0, in: [0, 0], out: [-10, 6] },
        { x: 0, y: 4, in: [10, 0], out: [-10, 0] },
        { x: -26, y: 0, in: [10, 6], out: [0, 0] },
      ],
    },
  ],
  paints: [
    {
      fill: {
        linear: {
          from: [-26, 0],
          to: [26, 0],
          stops: [
            [0, color("#ff9fc0")],
            [1, color("#ff7aa6")],
          ],
        },
      },
    },
    { stroke: color("#c94f7c"), width: 2 },
  ],
});
const dots = ab.node(partyHat, "hatDots");
ab.clip(dots, cone);
for (const [x, y, c] of [
  [-10, -14, "#fff3a3"],
  [8, -26, "#bff0e0"],
  [-4, -42, "#fff3a3"],
  [12, -6, "#bff0e0"],
  [2, -58, "#bff0e0"],
] as const) {
  ab.shape(dots, "hatDot", { paths: [{ ellipse: [x, y, 9, 9] }], paints: [{ fill: color(c) }] });
}
ab.shape(partyHat, "pompom", {
  paths: [{ ellipse: [0, -76, 16, 16] }],
  paints: [{ fill: color("#ffe27a") }, { stroke: color("#d9a93a"), width: 1.5 }],
});

// ---------------------------------------------------------------- animations

const F = 60; // fps

// Pose every body-layer animation returns to. Each body animation holds these
// for anything it doesn't key itself, so states never leak into each other.
const rest = [
  [bob, "x", 0],
  [bob, "y", 0],
  [roll, "rotation", 0],
  [roll, "scaleY", 1],
  [squash, "scaleX", 1],
  [squash, "scaleY", 1],
  [squash, "rotation", 0],
  [tail, "rotation", 0],
  [tail, "scaleY", 1],
  [nearFlipper, "rotation", 22],
  [farFlipper, "rotation", 12],
  [eyeOpen, "opacity", 1],
  [eyeHappy, "opacity", 0],
  [eyeSleep, "opacity", 0],
  [blush, "opacity", 0.5],
  [muzzle, "scaleX", 1],
  [muzzle, "scaleY", 1],
  [seagrass, "opacity", 0],
  [seagrass, "scaleX", 1],
  [seagrass, "scaleY", 1],
] as const;

function bodyAnim(
  name: string,
  frames: number,
  loop: "oneShot" | "loop",
  keys: (a: Animation) => void,
) {
  const a = ab.animation(name, frames, loop, F);
  keys(a);
  for (const [target, prop, value] of rest) if (!a.has(target, prop)) a.hold(target, prop, value);
  return a;
}

/** Repeating wave: value alternates around `mid` by `amp`, `count` times over `frames`. */
function wave(
  mid: number,
  amp: number,
  frames: number,
  count: number,
  start = 0,
  phase = 1,
): Key[] {
  const keys: Key[] = [];
  const step = frames / (count * 2);
  for (let i = 0; i <= count * 2; i++)
    keys.push([Math.round(start + i * step), mid + (i % 2 ? amp : -amp) * phase]);
  return keys;
}

const idle = bodyAnim("idle", 240, "loop", (a) => {
  a.key(bob, "y", [
    [0, 0],
    [120, -9],
    [240, 0],
  ]);
  a.key(squash, "rotation", [
    [0, 0],
    [120, -1.5],
    [240, 0],
  ]);
  a.key(tail, "rotation", wave(0, 8, 240, 2));
  a.key(tail, "scaleY", wave(0.95, 0.05, 240, 2));
  a.key(nearFlipper, "rotation", wave(26, 6, 240, 1));
  a.key(farFlipper, "rotation", wave(16, 5, 240, 1, 0, -1));
  a.key(muzzle, "scaleX", [
    [0, 1],
    [150, 1],
    [160, 1.05],
    [170, 0.98],
    [180, 1.04],
    [192, 1],
  ]);
});

const swim = bodyAnim("swim", 90, "loop", (a) => {
  a.key(tail, "rotation", wave(0, 16, 90, 1));
  a.key(tail, "scaleY", wave(0.9, 0.1, 90, 1));
  a.key(bob, "y", wave(-2, 3, 90, 1, 0, -1));
  a.key(squash, "rotation", wave(0, 1.2, 90, 1, 0, -1));
  a.key(nearFlipper, "rotation", wave(44, 4, 90, 1));
  a.key(farFlipper, "rotation", wave(34, 4, 90, 1));
});

const sleep = bodyAnim("sleep", 360, "loop", (a) => {
  a.key(bob, "y", [
    [0, 14],
    [180, 20],
    [360, 14],
  ]);
  a.key(squash, "scaleY", [
    [0, 1],
    [180, 1.025],
    [360, 1],
  ]);
  a.key(squash, "rotation", [
    [0, 3],
    [180, 4],
    [360, 3],
  ]);
  a.key(tail, "rotation", wave(4, 3, 360, 1));
  a.hold(nearFlipper, "rotation", 34);
  a.hold(eyeOpen, "opacity", 0);
  a.hold(eyeSleep, "opacity", 1);
  a.hold(blush, "opacity", 0.35);
});

const boop = bodyAnim("boop", 60, "oneShot", (a) => {
  a.key(squash, "scaleX", [
    [0, 1],
    [6, 0.9, "out"],
    [20, 1.05],
    [34, 0.98],
    [48, 1],
  ]);
  a.key(squash, "scaleY", [
    [0, 1],
    [6, 1.08, "out"],
    [20, 0.96],
    [34, 1.02],
    [48, 1],
  ]);
  a.key(bob, "x", [
    [0, 0],
    [6, -12, "out"],
    [44, 0],
  ]);
  a.key(muzzle, "scaleX", [
    [0, 1],
    [6, 0.82, "out"],
    [22, 1.08],
    [38, 1],
  ]);
  a.key(eyeOpen, "opacity", [
    [0, 1, "hold"],
    [3, 0, "hold"],
    [50, 1],
  ]);
  a.key(eyeHappy, "opacity", [
    [0, 0, "hold"],
    [3, 1, "hold"],
    [50, 0],
  ]);
  a.key(blush, "opacity", [
    [0, 0.5],
    [10, 1],
    [50, 0.6],
  ]);
  a.key(tail, "rotation", wave(0, 12, 48, 2, 4));
});

const rollOver = bodyAnim("roll", 160, "oneShot", (a) => {
  // Rolling around the long axis reads as a vertical flip from the side.
  a.key(roll, "scaleY", [
    [0, 1],
    [40, -1, "out"],
    [116, -1],
    [156, 1, "out"],
  ]);
  a.key(roll, "rotation", [
    [0, 0],
    [40, -6],
    [64, 4],
    [88, -4],
    [116, 2],
    [156, 0],
  ]);
  a.key(bob, "y", [
    [0, 0],
    [48, -16],
    [110, -16],
    [160, 0],
  ]);
  a.key(nearFlipper, "rotation", [[0, 22], ...wave(10, 30, 60, 3, 50).slice(1), [160, 22]]);
  a.key(farFlipper, "rotation", [[0, 12], ...wave(4, 26, 60, 3, 50, -1).slice(1), [160, 12]]);
  a.key(tail, "rotation", wave(0, 14, 160, 4));
  a.key(eyeOpen, "opacity", [
    [0, 1, "hold"],
    [20, 0, "hold"],
    [140, 1],
  ]);
  a.key(eyeHappy, "opacity", [
    [0, 0, "hold"],
    [20, 1, "hold"],
    [140, 0],
  ]);
  a.key(blush, "opacity", [
    [0, 0.5],
    [40, 0.9],
    [150, 0.5],
  ]);
});

const chewFrames = 170;
const chew = bodyAnim("chew", chewFrames, "oneShot", (a) => {
  a.key(seagrass, "opacity", [
    [0, 1, "hold"],
    [150, 1],
    [158, 0],
  ]);
  const shrink: Key[] = [[0, 1]];
  const scale: Key[] = [[0, 1]];
  const lip: Key[] = [[0, 1]];
  for (let i = 0; i < 7; i++) {
    const f = 10 + i * 20;
    lip.push([f, 0.9], [f + 10, 1.05]);
    shrink.push([f + 10, 1 - (i + 1) * 0.13]);
    scale.push([f, 1 - i * 0.13 - 0.05], [f + 10, 1 - (i + 1) * 0.13]);
  }
  lip.push([chewFrames, 1]);
  a.key(muzzle, "scaleY", lip);
  a.key(seagrass, "scaleX", shrink);
  a.key(seagrass, "scaleY", scale);
  a.key(eyeOpen, "opacity", [
    [0, 1, "hold"],
    [10, 0, "hold"],
    [150, 1],
  ]);
  a.key(eyeHappy, "opacity", [
    [0, 0, "hold"],
    [10, 1, "hold"],
    [150, 0],
  ]);
  a.key(blush, "opacity", [
    [0, 0.5],
    [30, 0.85],
    [160, 0.5],
  ]);
  a.key(bob, "y", wave(-3, 3, chewFrames, 7));
  a.key(tail, "rotation", wave(0, 6, chewFrames, 3));
});

const pet = bodyAnim("pet", 110, "oneShot", (a) => {
  a.key(squash, "rotation", [[0, 0], ...wave(0, 3, 80, 3, 8).slice(1), [110, 0]]);
  a.key(squash, "scaleY", [
    [0, 1],
    [12, 1.04],
    [90, 1.02],
    [110, 1],
  ]);
  a.key(tail, "rotation", wave(0, 16, 100, 4, 4));
  a.key(nearFlipper, "rotation", [[0, 22], ...wave(14, 14, 80, 3, 10).slice(1), [110, 22]]);
  a.key(eyeOpen, "opacity", [
    [0, 1, "hold"],
    [4, 0, "hold"],
    [100, 1],
  ]);
  a.key(eyeHappy, "opacity", [
    [0, 0, "hold"],
    [4, 1, "hold"],
    [100, 0],
  ]);
  a.key(blush, "opacity", [
    [0, 0.5],
    [12, 1],
    [100, 0.6],
  ]);
});

// Blinking runs on its own layer and only touches the open eye's height.
const blink = ab.animation("blink", 300, "loop", F);
blink.key(eyeOpen, "scaleY", [
  [0, 1, "hold"],
  [276, 1],
  [282, 0.1],
  [288, 1, "hold"],
  [300, 1],
]);

// Accessories pop on and off.
function popOn(target: Obj, name: string, rotation: number) {
  const on = ab.animation(`${name}On`, 36, "oneShot", F);
  on.key(target, "opacity", [
    [0, 0],
    [8, 1],
  ]);
  on.key(target, "scaleX", [
    [0, 0.4],
    [18, 1.12, "out"],
    [30, 1],
  ]);
  on.key(target, "scaleY", [
    [0, 0.4],
    [18, 1.12, "out"],
    [30, 1],
  ]);
  on.key(target, "rotation", [
    [0, rotation - 25],
    [22, rotation + 6],
    [36, rotation],
  ]);
  const off = ab.animation(`${name}Off`, 18, "oneShot", F);
  off.key(target, "opacity", [
    [0, 1],
    [18, 0],
  ]);
  off.key(target, "scaleX", [
    [0, 1],
    [18, 0.6],
  ]);
  off.key(target, "scaleY", [
    [0, 1],
    [18, 0.6],
  ]);
  return { on, off };
}
const shellAnims = popOn(shell, "shell", 14);
const partyAnims = popOn(partyHat, "party", 16);
const flowerAnims = popOn(flower, "flower", 0);
const starfishAnims = popOn(starfish, "starfish", -12);

// ---------------------------------------------------------------- state machine

const sm = ab.stateMachine("Moo");
const inBoop = sm.trigger("boop");
const inRoll = sm.trigger("roll");
const inChew = sm.trigger("chew");
const inPet = sm.trigger("pet");
const inSwimming = sm.bool("swimming");
const inSleepy = sm.bool("sleepy");
const inShell = sm.bool("shell");
const inParty = sm.bool("party");
const inFlower = sm.bool("flower");
const inStarfish = sm.bool("starfish");

const blinkLayer = sm.layer("blink");
blinkLayer.entry.to(blinkLayer.state(blink));

const bodyLayer = sm.layer("body");
const sIdle = bodyLayer.state(idle);
const sSwim = bodyLayer.state(swim);
const sSleep = bodyLayer.state(sleep);
bodyLayer.entry.to(sIdle);
sIdle.to(sSwim, { when: [[inSwimming, true]], duration: 350 });
sSwim.to(sIdle, { when: [[inSwimming, false]], duration: 500 });
sIdle.to(sSleep, { when: [[inSleepy, true]], duration: 900 });
sSleep.to(sIdle, { when: [[inSleepy, false]], duration: 400 });
for (const [trigger, anim, duration] of [
  [inBoop, boop, 80],
  [inRoll, rollOver, 160],
  [inChew, chew, 200],
  [inPet, pet, 140],
] as const) {
  const s = bodyLayer.state(anim);
  bodyLayer.any.to(s, { when: [trigger], duration });
  s.to(sIdle, { exitAt: 1, duration: 260 });
}

for (const [name, input, target, anims] of [
  ["shell", inShell, shell, shellAnims],
  ["party", inParty, partyHat, partyAnims],
  ["flower", inFlower, flower, flowerAnims],
  ["starfish", inStarfish, starfish, starfishAnims],
] as const) {
  const layer = sm.layer(name);
  // Start hidden without playing the shrink-out.
  const hidden = layer.state(
    ab.animation(`${name}Hidden`, 1, "oneShot", F).hold(target, "opacity", 0),
  );
  const on = layer.state(anims.on);
  const off = layer.state(anims.off);
  layer.entry.to(hidden);
  hidden.to(on, { when: [[input, true]] });
  off.to(on, { when: [[input, true]] });
  on.to(off, { when: [[input, false]] });
}

writeFileSync(out, emit([ab]));
console.log(`wrote ${out}`);
