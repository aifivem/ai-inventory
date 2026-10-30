import { useSyncExternalStore } from "react";
import { fetchNui } from "fivem-nui-react";
import { NUI } from "../../../../resource/common/nui";
import { CELL_VH, vh } from "../../lib/cell";

export interface DragState {
  from: string;
  slot: number;
  name: string;
  count: number;
  /** The whole stack moves (not a split). */
  whole: boolean;
  rotated: boolean;
  /** Where the pointer grabbed the item, in px from its top-left corner. */
  grabX: number;
  grabY: number;
  target: { inv: string; slot: number } | null;
  ground: boolean;
}

type Listener = () => void;

/**
 * The item being dragged. Kept outside Redux: the pointer moves many times a second; only target changes re-render
 * (the highlight), the ghost follows the pointer through `onMove` without React.
 */
class DragStore {
  state: DragState | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly movers = new Set<(x: number, y: number) => void>();
  private x = 0;
  private y = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  onMove(mover: (x: number, y: number) => void): () => void {
    this.movers.add(mover);
    mover(this.x, this.y);
    return () => this.movers.delete(mover);
  }

  private set(next: DragState | null): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  start(
    drag: Omit<DragState, "target" | "ground">,
    x: number,
    y: number,
  ): void {
    this.x = x;
    this.y = y;
    this.set({ ...drag, target: null, ground: false });
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.end);
    window.addEventListener("keydown", this.key);
  }

  /** Finds the grid cell under the ghost's top-left cell (rounded to the nearest cell). */
  private move = (event: PointerEvent): void => {
    this.x = event.clientX;
    this.y = event.clientY;
    for (const mover of this.movers) mover(this.x, this.y);
    const drag = this.state;
    if (!drag) return;
    const el = document.elementFromPoint(this.x, this.y);
    const grid = el?.closest<HTMLElement>("[data-grid]");
    const quick = el?.closest<HTMLElement>("[data-hotbar]");
    const ground = Boolean(el?.closest("[data-ground]"));
    let target: DragState["target"] = null;
    if (quick?.dataset.inv && quick.dataset.slot) {
      // A quick slot under the pointer itself (it holds one stack of any size).
      target = { inv: quick.dataset.inv, slot: Number(quick.dataset.slot) };
    } else if (grid?.dataset.grid) {
      const rect = grid.getBoundingClientRect();
      const cell = vh(CELL_VH);
      const columns = Number(grid.dataset.columns);
      const rows = Number(grid.dataset.rows);
      const col = Math.min(
        columns - 1,
        Math.max(0, Math.round((this.x - drag.grabX - rect.left) / cell)),
      );
      const row = Math.min(
        rows - 1,
        Math.max(0, Math.round((this.y - drag.grabY - rect.top) / cell)),
      );
      target = { inv: grid.dataset.grid, slot: row * columns + col + 1 };
    }
    if (
      target?.inv !== drag.target?.inv ||
      target?.slot !== drag.target?.slot ||
      ground !== drag.ground
    )
      this.set({ ...drag, target, ground });
  };

  private key = (event: KeyboardEvent): void => {
    const drag = this.state;
    if (!drag || event.code !== "KeyR") return;
    // Turning keeps the grab point at the same corner distance, swapped.
    this.set({
      ...drag,
      rotated: !drag.rotated,
      grabX: drag.grabY,
      grabY: drag.grabX,
    });
  };

  private end = (): void => {
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.end);
    window.removeEventListener("keydown", this.key);
    const drag = this.state;
    this.set(null);
    if (!drag) return;
    if (drag.ground) {
      void fetchNui(
        NUI.drop,
        { from: drag.from, slot: drag.slot, count: drag.count },
        { mockData: { ok: true } },
      );
    } else if (drag.target) {
      const move = {
        from: drag.from,
        fromSlot: drag.slot,
        to: drag.target.inv,
        toSlot: drag.target.slot,
        count: drag.count,
        rotated: drag.rotated,
      };
      void fetchNui(NUI.move, move, { mockData: { ok: true } });
    }
  };
}

export const drag = new DragStore();

export function useDrag(): DragState | null {
  return useSyncExternalStore(drag.subscribe, () => drag.state);
}
