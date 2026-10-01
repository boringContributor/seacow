// A small authoring layer on top of the Rive binary format: artboards made of
// nodes and shapes, keyframed animations and state machines.
//
// Draw order follows the usual painter's rule: later siblings render on top.
// The Rive runtime draws the *first* drawable in the file on top, so emit()
// writes drawable siblings in reverse.

import { ByteWriter, writeHeader } from "./encoder.ts";
import { ANIMATABLE, PROP, TYPE, type Animatable, type PropName, type TypeName } from "./keys.ts";

type Value = number | string | boolean;
export type Props = Partial<Record<PropName, Value>>;

export class Obj {
  index = -1;
  readonly children: Obj[] = [];
  readonly type: TypeName;
  props: Props;
  readonly drawOrdered: boolean;
  /** Properties that point at other objects, resolved to indices on emit. */
  readonly refs: Partial<Record<PropName, Obj>> = {};
  constructor(type: TypeName, props: Props = {}, drawOrdered = false) {
    this.type = type;
    this.props = props;
    this.drawOrdered = drawOrdered;
  }
  add<T extends Obj>(child: T): T {
    this.children.push(child);
    return child;
  }
}

// ---------------------------------------------------------------- colors

/** "#rrggbb" (+ optional alpha 0..1) to Rive's ARGB uint32. */
export function color(hex: string, alpha = 1): number {
  const h = hex.replace("#", "");
  const rgb = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return ((a << 24) | rgb) >>> 0;
}

// ---------------------------------------------------------------- geometry

export type Pt = readonly [number, number];
export type VertexSpec =
  | { x: number; y: number; sharp: true; radius?: number }
  | { x: number; y: number; in: Pt; out: Pt };

/**
 * Smooth curve through points (Catmull-Rom converted to cubic beziers).
 * A point given as [x, y, 0] is a sharp corner; [x, y, k] scales the local
 * handle length by k.
 */
export function smooth(
  points: ReadonlyArray<readonly [number, number] | readonly [number, number, number]>,
  closed = true,
  tension = 1,
): VertexSpec[] {
  const n = points.length;
  return points.map((p, i) => {
    const k = (p.length === 3 ? p[2] : 1) * tension;
    if (k === 0) return { x: p[0], y: p[1], sharp: true as const };
    const prev = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = ((next[0] - prev[0]) / 6) * k;
    const ty = ((next[1] - prev[1]) / 6) * k;
    return { x: p[0], y: p[1], in: [-tx, -ty] as Pt, out: [tx, ty] as Pt };
  });
}

export type PathSpec =
  | { ellipse: readonly [cx: number, cy: number, w: number, h: number] }
  | { rect: readonly [cx: number, cy: number, w: number, h: number, r?: number] }
  | {
      star: readonly [
        cx: number,
        cy: number,
        size: number,
        points: number,
        inner: number,
        corner: number,
      ];
    }
  | { points: VertexSpec[]; closed?: boolean };

export type Gradient =
  | { linear: { from: Pt; to: Pt; stops: ReadonlyArray<readonly [number, number]> } }
  | { radial: { center: Pt; edge: Pt; stops: ReadonlyArray<readonly [number, number]> } };

export type FillSpec = { fill: number | Gradient; evenOdd?: boolean };
export type StrokeSpec = {
  stroke: number | Gradient;
  width: number;
  cap?: "butt" | "round" | "square";
  join?: "miter" | "round" | "bevel";
};
export type PaintSpec = FillSpec | StrokeSpec;

export interface Transform {
  x?: number;
  y?: number;
  rotation?: number; // degrees
  scaleX?: number;
  scaleY?: number;
  scale?: number;
  opacity?: number;
}

function transformProps(t: Transform): Props {
  const p: Props = {};
  if (t.x !== undefined) p.x = t.x;
  if (t.y !== undefined) p.y = t.y;
  if (t.rotation !== undefined) p.rotation = (t.rotation * Math.PI) / 180;
  if (t.scale !== undefined) p.scaleX = p.scaleY = t.scale;
  if (t.scaleX !== undefined) p.scaleX = t.scaleX;
  if (t.scaleY !== undefined) p.scaleY = t.scaleY;
  if (t.opacity !== undefined) p.opacity = t.opacity;
  return p;
}

export interface ShapeHandle {
  shape: Obj;
  paths: Obj[];
  vertices: Obj[][];
  /** The SolidColor of each paint (undefined for gradient paints). */
  colors: (Obj | undefined)[];
}

function paintMutator(paint: Obj, spec: number | Gradient): Obj | undefined {
  if (typeof spec === "number") {
    return paint.add(new Obj("SolidColor", { colorValue: spec }));
  }
  if ("linear" in spec) {
    const g = paint.add(
      new Obj("LinearGradient", {
        startX: spec.linear.from[0],
        startY: spec.linear.from[1],
        endX: spec.linear.to[0],
        endY: spec.linear.to[1],
      }),
    );
    for (const [pos, c] of spec.linear.stops)
      g.add(new Obj("GradientStop", { stopPosition: pos, stopColor: c }));
  } else {
    const g = paint.add(
      new Obj("RadialGradient", {
        startX: spec.radial.center[0],
        startY: spec.radial.center[1],
        endX: spec.radial.edge[0],
        endY: spec.radial.edge[1],
      }),
    );
    for (const [pos, c] of spec.radial.stops)
      g.add(new Obj("GradientStop", { stopPosition: pos, stopColor: c }));
  }
  return undefined;
}

// ---------------------------------------------------------------- animation

export type Ease =
  | "ease"
  | "in"
  | "out"
  | "linear"
  | "hold"
  | "back"
  | readonly [number, number, number, number];
export type Key = readonly [frame: number, value: number, ease?: Ease];

const EASES: Record<string, readonly [number, number, number, number]> = {
  ease: [0.42, 0, 0.58, 1],
  in: [0.5, 0, 0.9, 0.5],
  out: [0.15, 0.6, 0.4, 1],
  back: [0.3, 1.6, 0.6, 1],
};

export class Animation {
  readonly tracks = new Map<Obj, Map<number, { color: boolean; keys: Key[] }>>();
  readonly name: string;
  readonly frames: number;
  readonly loop: "oneShot" | "loop" | "pingPong";
  readonly fps: number;
  constructor(name: string, frames: number, loop: Animation["loop"], fps = 60) {
    this.name = name;
    this.frames = frames;
    this.loop = loop;
    this.fps = fps;
  }

  /** Rotation values are given in degrees. */
  key(target: Obj, prop: Animatable, keys: Key[]): this {
    const raw = ANIMATABLE[prop];
    const isRotation = prop === "rotation";
    const byProp = this.tracks.get(target) ?? new Map();
    byProp.set(raw, {
      color: prop === "colorValue",
      keys: keys.map(([f, v, e]) => [f, isRotation ? (v * Math.PI) / 180 : v, e] as Key),
    });
    this.tracks.set(target, byProp);
    return this;
  }

  has(target: Obj, prop: Animatable): boolean {
    return this.tracks.get(target)?.has(ANIMATABLE[prop]) ?? false;
  }

  /** Hold a property at one value for the whole animation. */
  hold(target: Obj, prop: Animatable, value: number): this {
    return this.key(target, prop, [[0, value, "hold"]]);
  }
}

// ---------------------------------------------------------------- state machine

export class Input {
  index = -1;
  readonly kind: "bool" | "trigger" | "number";
  readonly name: string;
  readonly initial: number | boolean;
  constructor(kind: Input["kind"], name: string, initial: number | boolean = 0) {
    this.kind = kind;
    this.name = name;
    this.initial = initial;
  }
}

type Condition =
  | { input: Input }
  | { input: Input; equals: boolean }
  | { input: Input; op: number; value: number };

export interface TransitionOpts {
  /** Conditions: a trigger input, `[boolInput, value]`, or a number comparison. */
  when?: Array<
    Input | readonly [Input, boolean] | { input: Input; op: "<" | ">" | "==" | "!="; value: number }
  >;
  /** Blend duration in ms. */
  duration?: number;
  /** Leave only after this fraction (0..1) of the source animation has played. */
  exitAt?: number;
}

export class State {
  index = -1;
  readonly transitions: {
    to: State;
    conditions: Condition[];
    duration: number;
    exitAt?: number;
  }[] = [];
  readonly kind: "entry" | "any" | "exit" | "animation";
  readonly animation?: Animation;
  constructor(kind: State["kind"], animation?: Animation) {
    this.kind = kind;
    this.animation = animation;
  }

  to(target: State, opts: TransitionOpts = {}): this {
    const conditions: Condition[] = (opts.when ?? []).map((c) => {
      if (c instanceof Input) return { input: c };
      if (Array.isArray(c)) return { input: c[0] as Input, equals: c[1] as boolean };
      const cmp = c as { input: Input; op: "<" | ">" | "==" | "!="; value: number };
      const op = { "==": 0, "!=": 1, "<": 4, ">": 5 }[cmp.op];
      return { input: cmp.input, op, value: cmp.value };
    });
    this.transitions.push({
      to: target,
      conditions,
      duration: opts.duration ?? 0,
      exitAt: opts.exitAt,
    });
    return this;
  }
}

export class Layer {
  readonly entry = new State("entry");
  readonly any = new State("any");
  readonly exit = new State("exit");
  readonly states: State[] = [this.entry, this.any, this.exit];
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  state(animation: Animation): State {
    const s = new State("animation", animation);
    this.states.push(s);
    return s;
  }
}

export class StateMachine {
  readonly inputs: Input[] = [];
  readonly layers: Layer[] = [];
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  private input(i: Input): Input {
    i.index = this.inputs.length;
    this.inputs.push(i);
    return i;
  }
  bool(name: string, initial = false): Input {
    return this.input(new Input("bool", name, initial));
  }
  trigger(name: string): Input {
    return this.input(new Input("trigger", name));
  }
  number(name: string, initial = 0): Input {
    return this.input(new Input("number", name, initial));
  }
  layer(name: string): Layer {
    const l = new Layer(name);
    this.layers.push(l);
    return l;
  }
}

// ---------------------------------------------------------------- artboard

export class Artboard {
  readonly root: Obj;
  readonly animations: Animation[] = [];
  readonly stateMachines: StateMachine[] = [];

  constructor(name: string, width: number, height: number) {
    this.root = new Obj("Artboard", { name, width, height, clip: false });
  }

  node(parent: Obj, name: string, t: Transform = {}): Obj {
    return parent.add(new Obj("Node", { name, ...transformProps(t) }, true));
  }

  shape(
    parent: Obj,
    name: string,
    spec: Transform & { paths: PathSpec[]; paints: PaintSpec[] },
  ): ShapeHandle {
    const shape = parent.add(new Obj("Shape", { name, ...transformProps(spec) }, true));
    const paths: Obj[] = [];
    const vertices: Obj[][] = [];
    for (const p of spec.paths) {
      if ("ellipse" in p) {
        const [cx, cy, w, h] = p.ellipse;
        paths.push(shape.add(new Obj("Ellipse", { x: cx, y: cy, pathWidth: w, pathHeight: h })));
        vertices.push([]);
      } else if ("star" in p) {
        const [cx, cy, size, points, inner, corner] = p.star;
        paths.push(
          shape.add(
            new Obj("Star", {
              x: cx,
              y: cy,
              pathWidth: size,
              pathHeight: size,
              starPoints: points,
              starInnerRadius: inner,
              starCornerRadius: corner,
            }),
          ),
        );
        vertices.push([]);
      } else if ("rect" in p) {
        const [cx, cy, w, h, r] = p.rect;
        paths.push(
          shape.add(
            new Obj("Rectangle", {
              x: cx,
              y: cy,
              pathWidth: w,
              pathHeight: h,
              cornerRadiusTL: r ?? 0,
            }),
          ),
        );
        vertices.push([]);
      } else {
        const path = shape.add(new Obj("PointsPath", { isClosed: p.closed ?? true }));
        paths.push(path);
        vertices.push(
          p.points.map((v) =>
            path.add(
              "sharp" in v
                ? new Obj("StraightVertex", { vertexX: v.x, vertexY: v.y, radius: v.radius ?? 0 })
                : new Obj("CubicDetachedVertex", {
                    vertexX: v.x,
                    vertexY: v.y,
                    inRotation: Math.atan2(v.in[1], v.in[0]),
                    inDistance: Math.hypot(v.in[0], v.in[1]),
                    outRotation: Math.atan2(v.out[1], v.out[0]),
                    outDistance: Math.hypot(v.out[0], v.out[1]),
                  }),
            ),
          ),
        );
      }
    }
    const colors: (Obj | undefined)[] = [];
    for (const paint of spec.paints) {
      if ("fill" in paint) {
        const fill = shape.add(new Obj("Fill", { fillRule: paint.evenOdd ? 1 : 0 }));
        colors.push(paintMutator(fill, paint.fill));
      } else {
        const stroke = shape.add(
          new Obj("Stroke", {
            thickness: paint.width,
            cap: { butt: 0, round: 1, square: 2 }[paint.cap ?? "round"],
            join: { miter: 0, round: 1, bevel: 2 }[paint.join ?? "round"],
          }),
        );
        colors.push(paintMutator(stroke, paint.stroke));
      }
    }
    return { shape, paths, vertices, colors };
  }

  /** Clip everything under `target` to the geometry of `source`. */
  clip(target: Obj, source: ShapeHandle): void {
    const c = target.add(new Obj("ClippingShape", { clipFillRule: 0, clipIsVisible: true }));
    c.refs.clipSourceId = source.shape;
  }

  animation(
    name: string,
    frames: number,
    loop: Animation["loop"] = "oneShot",
    fps = 60,
  ): Animation {
    const a = new Animation(name, frames, loop, fps);
    this.animations.push(a);
    return a;
  }

  stateMachine(name: string): StateMachine {
    const sm = new StateMachine(name);
    this.stateMachines.push(sm);
    return sm;
  }
}

// ---------------------------------------------------------------- emit

function writeObject(w: ByteWriter, type: TypeName, props: Props): void {
  w.varUint(TYPE[type]);
  for (const [name, value] of Object.entries(props) as [PropName, Value][]) {
    if (value === undefined) continue;
    const [key, fieldType] = PROP[name];
    w.varUint(key);
    w.field(fieldType, value);
  }
  w.varUint(0);
}

export function emit(artboards: Artboard[]): Uint8Array {
  const w = new ByteWriter();
  writeHeader(w);
  writeObject(w, "Backboard", {});

  for (const ab of artboards) {
    // Components, depth first, parents before children.
    const ordered: { obj: Obj; parent?: Obj }[] = [];
    const visit = (obj: Obj, parent?: Obj) => {
      obj.index = ordered.length;
      ordered.push({ obj, parent });
      const plain = obj.children.filter((c) => !c.drawOrdered);
      const drawn = obj.children.filter((c) => c.drawOrdered).reverse();
      for (const c of [...plain, ...drawn]) visit(c, obj);
    };
    visit(ab.root);
    for (const { obj, parent } of ordered) {
      const props: Props = { ...obj.props };
      if (parent) props.parentId = parent.index;
      for (const [name, ref] of Object.entries(obj.refs) as [PropName, Obj][]) {
        if (ref.index < 0) throw new Error(`${obj.type}.${name} points outside the artboard`);
        props[name] = ref.index;
      }
      writeObject(w, obj.type, props);
    }

    // Shared cubic interpolators live in the artboard's object list.
    let nextIndex = ordered.length;
    const interpolators = new Map<string, number>();
    const interpolatorFor = (curve: readonly [number, number, number, number]): number => {
      const id = curve.join(",");
      let index = interpolators.get(id);
      if (index === undefined) {
        index = nextIndex++;
        interpolators.set(id, index);
        writeObject(w, "CubicEaseInterpolator", {
          x1: curve[0],
          y1: curve[1],
          x2: curve[2],
          y2: curve[3],
        });
      }
      return index;
    };
    const easeProps = (ease: Ease | undefined): Props => {
      if (ease === "linear") return { interpolationType: 1 };
      if (ease === "hold") return { interpolationType: 0 };
      const curve = typeof ease === "object" ? ease : EASES[ease ?? "ease"];
      return { interpolationType: 2, interpolatorId: interpolatorFor(curve) };
    };
    // Interpolators must exist before the keyframes that reference them.
    for (const anim of ab.animations)
      for (const byProp of anim.tracks.values())
        for (const track of byProp.values())
          for (const [, , e] of track.keys) if (e !== "linear" && e !== "hold") easeProps(e);

    for (const anim of ab.animations) {
      writeObject(w, "LinearAnimation", {
        animationName: anim.name,
        fps: anim.fps,
        duration: anim.frames,
        loopValue: { oneShot: 0, loop: 1, pingPong: 2 }[anim.loop],
      });
      for (const [target, byProp] of anim.tracks) {
        if (target.index < 0)
          throw new Error(`animation ${anim.name} keys an object outside the artboard`);
        writeObject(w, "KeyedObject", { objectId: target.index });
        for (const [propertyKey, track] of byProp) {
          writeObject(w, "KeyedProperty", { propertyKey });
          for (const [frame, value, ease] of track.keys) {
            writeObject(
              w,
              track.color ? "KeyFrameColor" : "KeyFrameDouble",
              track.color
                ? { frame, keyColor: value, ...easeProps(ease) }
                : { frame, keyValue: value, ...easeProps(ease) },
            );
          }
        }
      }
    }

    for (const sm of ab.stateMachines) {
      writeObject(w, "StateMachine", { animationName: sm.name });
      for (const input of sm.inputs) {
        if (input.kind === "bool")
          writeObject(w, "StateMachineBool", {
            smName: input.name,
            boolValue: Boolean(input.initial),
          });
        else if (input.kind === "number")
          writeObject(w, "StateMachineNumber", {
            smName: input.name,
            numberValue: Number(input.initial),
          });
        else writeObject(w, "StateMachineTrigger", { smName: input.name });
      }
      for (const layer of sm.layers) {
        layer.states.forEach((s, i) => (s.index = i));
        writeObject(w, "StateMachineLayer", { smName: layer.name });
        for (const state of layer.states) {
          if (state.kind === "animation") {
            const animationId = ab.animations.indexOf(state.animation!);
            writeObject(w, "AnimationState", { animationId });
          } else {
            writeObject(
              w,
              ({ entry: "EntryState", any: "AnyState", exit: "ExitState" } as const)[state.kind],
              {},
            );
          }
          for (const t of state.transitions) {
            // Flags: 4 = exit time enabled, 8 = exit time is a percentage.
            const flags = t.exitAt !== undefined ? 4 | 8 : 0;
            writeObject(w, "StateTransition", {
              stateToId: t.to.index,
              transitionFlags: flags,
              transitionDuration: t.duration,
              exitTime: t.exitAt !== undefined ? Math.round(t.exitAt * 100) : 0,
            });
            for (const c of t.conditions) {
              if ("equals" in c)
                writeObject(w, "TransitionBoolCondition", {
                  inputId: c.input.index,
                  opValue: c.equals ? 0 : 1,
                });
              else if ("op" in c)
                writeObject(w, "TransitionNumberCondition", {
                  inputId: c.input.index,
                  opValue: c.op,
                  conditionValue: c.value,
                });
              else writeObject(w, "TransitionTriggerCondition", { inputId: c.input.index });
            }
          }
        }
      }
    }
  }
  return w.bytes();
}
