import {
  Alignment,
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
  type StateMachineInput,
} from "@rive-app/canvas";
import wasmUrl from "@rive-app/canvas/rive.wasm?url";
import wasmFallbackUrl from "@rive-app/canvas/rive_fallback.wasm?url";

// Serve the runtime ourselves instead of from a CDN.
RuntimeLoader.setWasmUrl(wasmUrl);
RuntimeLoader.setWasmFallbackUrl(wasmFallbackUrl);
// moo.riv is generated without view models, so state machine inputs it is.
Rive.suppressDeprecationWarnings = ["state-machine-inputs"];

export type Trigger = "boop" | "roll" | "chew" | "pet";
export type Toggle = "swimming" | "sleepy" | "shell" | "party" | "flower" | "starfish";

/** Thin wrapper around the Rive instance and Moo's state machine. */
export class Moo {
  private readonly rive: Rive;
  private readonly inputs = new Map<string, StateMachineInput>();
  private readonly toggles = new Map<Toggle, boolean>();

  private constructor(rive: Rive) {
    this.rive = rive;
    for (const input of rive.stateMachineInputs("Moo") ?? []) this.inputs.set(input.name, input);
  }

  static load(canvas: HTMLCanvasElement): Promise<Moo> {
    return new Promise((resolve, reject) => {
      const rive: Rive = new Rive({
        src: `${import.meta.env.BASE_URL}moo.riv`,
        canvas,
        stateMachine: "Moo",
        autoplay: true,
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        shouldDisableRiveListeners: true,
        onLoad: () => {
          rive.resizeDrawingSurfaceToCanvas();
          resolve(new Moo(rive));
        },
        onLoadError: (e) => reject(new Error(`Could not load moo.riv: ${JSON.stringify(e.data)}`)),
      });
    });
  }

  fire(name: Trigger): void {
    this.inputs.get(name)?.fire();
  }

  set(name: Toggle, value: boolean): void {
    if (this.toggles.get(name) === value) return;
    this.toggles.set(name, value);
    const input = this.inputs.get(name);
    if (input) input.value = value;
  }

  is(name: Toggle): boolean {
    return this.toggles.get(name) ?? false;
  }

  resize(): void {
    this.rive.resizeDrawingSurfaceToCanvas();
  }
}
