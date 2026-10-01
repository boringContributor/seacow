import type { FieldType } from "./encoder.ts";

// Core type keys, taken from rive-runtime/include/rive/generated/**/*_base.hpp.
export const TYPE = {
  Backboard: 23,
  Artboard: 1,
  Node: 2,
  Shape: 3,
  Ellipse: 4,
  Rectangle: 7,
  Star: 52,
  PointsPath: 16,
  StraightVertex: 5,
  CubicDetachedVertex: 6,
  Fill: 20,
  Stroke: 24,
  SolidColor: 18,
  LinearGradient: 22,
  RadialGradient: 17,
  GradientStop: 19,
  CubicEaseInterpolator: 28,
  LinearAnimation: 31,
  KeyedObject: 25,
  KeyedProperty: 26,
  KeyFrameDouble: 30,
  KeyFrameColor: 37,
  StateMachine: 53,
  StateMachineNumber: 56,
  StateMachineBool: 59,
  StateMachineTrigger: 58,
  StateMachineLayer: 57,
  EntryState: 63,
  AnyState: 62,
  ExitState: 64,
  AnimationState: 61,
  StateTransition: 65,
  TransitionTriggerCondition: 68,
  TransitionBoolCondition: 71,
  TransitionNumberCondition: 70,
  ClippingShape: 42,
} as const;

export type TypeName = keyof typeof TYPE;

// Property keys and their wire types.
export const PROP = {
  // Component
  name: [4, "string"],
  parentId: [5, "uint"],
  // Artboard / LayoutComponent
  width: [7, "double"],
  height: [8, "double"],
  originX: [11, "double"],
  originY: [12, "double"],
  clip: [196, "bool"],
  // Node / TransformComponent
  x: [13, "double"],
  y: [14, "double"],
  rotation: [15, "double"],
  scaleX: [16, "double"],
  scaleY: [17, "double"],
  opacity: [18, "double"],
  // ParametricPath
  pathWidth: [20, "double"],
  pathHeight: [21, "double"],
  pathOriginX: [123, "double"],
  pathOriginY: [124, "double"],
  cornerRadiusTL: [31, "double"],
  starPoints: [125, "uint"],
  starCornerRadius: [126, "double"],
  starInnerRadius: [127, "double"],
  // PointsPath
  isClosed: [32, "bool"],
  // Vertex
  vertexX: [24, "double"],
  vertexY: [25, "double"],
  radius: [26, "double"],
  inRotation: [84, "double"],
  inDistance: [85, "double"],
  outRotation: [86, "double"],
  outDistance: [87, "double"],
  // Paints
  isVisible: [41, "bool"],
  fillRule: [40, "uint"],
  thickness: [47, "double"],
  cap: [48, "uint"],
  join: [49, "uint"],
  colorValue: [37, "color"],
  // Gradients
  startX: [42, "double"],
  startY: [33, "double"],
  endX: [34, "double"],
  endY: [35, "double"],
  gradientOpacity: [46, "double"],
  stopColor: [38, "color"],
  stopPosition: [39, "double"],
  // ClippingShape
  clipSourceId: [92, "uint"],
  clipFillRule: [93, "uint"],
  clipIsVisible: [94, "bool"],
  // Interpolator
  x1: [63, "double"],
  y1: [64, "double"],
  x2: [65, "double"],
  y2: [66, "double"],
  // Animation
  animationName: [55, "string"],
  fps: [56, "uint"],
  duration: [57, "uint"],
  speed: [58, "double"],
  loopValue: [59, "uint"],
  objectId: [51, "uint"],
  propertyKey: [53, "uint"],
  frame: [67, "uint"],
  interpolationType: [68, "uint"],
  interpolatorId: [69, "uint"],
  keyValue: [70, "double"],
  keyColor: [88, "color"],
  // State machine
  smName: [138, "string"],
  numberValue: [140, "double"],
  boolValue: [141, "bool"],
  animationId: [149, "uint"],
  stateToId: [151, "uint"],
  transitionFlags: [152, "uint"],
  transitionDuration: [158, "uint"],
  exitTime: [160, "uint"],
  inputId: [155, "uint"],
  opValue: [156, "uint"],
  conditionValue: [157, "double"],
} as const satisfies Record<string, readonly [number, FieldType]>;

export type PropName = keyof typeof PROP;

// Properties that can be keyed in an animation, mapped to their raw keys.
export const ANIMATABLE = {
  x: PROP.x[0],
  y: PROP.y[0],
  rotation: PROP.rotation[0],
  scaleX: PROP.scaleX[0],
  scaleY: PROP.scaleY[0],
  opacity: PROP.opacity[0],
  pathWidth: PROP.pathWidth[0],
  pathHeight: PROP.pathHeight[0],
  vertexX: PROP.vertexX[0],
  vertexY: PROP.vertexY[0],
  thickness: PROP.thickness[0],
  colorValue: PROP.colorValue[0],
} as const;

export type Animatable = keyof typeof ANIMATABLE;
