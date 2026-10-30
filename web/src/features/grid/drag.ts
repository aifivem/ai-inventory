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
  /** Size in cells as turned now; the ghost hangs from its centre. */
  w: number;
  h: number;
  target: { inv: string; slot: number } | null;
  ground: boolean;
  /** The pointer is near the quick slots: the ghost shrinks to a slot's size. */
  small: boolean;
}

type Listener = () => void;

/** How far around the quick slots row the ghost already shrinks, in vh. */
const QUICK_MARGIN_VH = 5;
/** Edge band of a scrolling grid that scrolls it while dragging, in vh, and the top speed in vh per frame. */
const EDGE_VH = 6;
const EDGE_SPEED_VH = 1.6;

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
  /** The quick slots row grown by the margin (it does not move during a drag). */
  private quick: DOMRect | null = null;
  private scroller: HTMLElement | null = null;
  private speed = 0;
  private frame = 0;

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
    drag: Omit<DragState, "target" | "ground" | "small">,
    x: number,
    y: number,
  ): void {
    this.x = x;
    this.y = y;
    const row = document.querySelector("[data-quick-slots]");
    const m = vh(QUICK_MARGIN_VH);
    const r = row?.getBoundingClientRect();
    this.quick = r
      ? new DOMRect(r.left - m, r.top - m, r.width + 2 * m, r.height + 2 * m)
      : null;
    this.set({ ...drag, target: null, ground: false, small: false });
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.end);
    window.addEventListener("keydown", this.key);
    // A grid scrolled under a still pointer (wheel, edge scroll) changes the cell under it.
    window.addEventListener("scroll", this.update, true);
    this.update();
  }

  private move = (event: PointerEvent): void => {
    this.x = event.clientX;
    this.y = event.clientY;
    for (const mover of this.movers) mover(this.x, this.y);
    this.update();
  };

  /** Finds the target under the pointer: a quick slot, or the grid cell under the ghost's top-left cell (rounded). */
  private update = (): void => {
    const drag = this.state;
    if (!drag) return;
    const el = document.elementFromPoint(this.x, this.y);
    const grid = el?.closest<HTMLElement>("[data-grid]");
    const quick = el?.closest<HTMLElement>("[data-hotbar]");
    const ground = Boolean(el?.closest("[data-ground]"));
    const q = this.quick;
    const small =
      q !== null &&
      this.x >= q.left &&
      this.x <= q.right &&
      this.y >= q.top &&
      this.y <= q.bottom;
    let target: DragState["target"] = null;
    if (quick?.dataset.inv && quick.dataset.slot) {
      // A quick slot under the pointer itself (it holds one stack of any size).
      target = { inv: quick.dataset.inv, slot: Number(quick.dataset.slot) };
    } else if (grid?.dataset.grid) {
      const rect = grid.getBoundingClientRect();
      const cell = vh(CELL_VH);
      const columns = Number(grid.dataset.columns);
      const rows = Number(grid.dataset.rows);
      // The pointer holds the ghost's centre: its top-left corner is half its size up and left.
      const left = this.x - (drag.w * cell) / 2 - rect.left;
      const top = this.y - (drag.h * cell) / 2 - rect.top;
      const col = Math.min(columns - 1, Math.max(0, Math.round(left / cell)));
      const row = Math.min(rows - 1, Math.max(0, Math.round(top / cell)));
      target = { inv: grid.dataset.grid, slot: row * columns + col + 1 };
    }
    this.edgeScroll(el);
    if (
      target?.inv !== drag.target?.inv ||
      target?.slot !== drag.target?.slot ||
      ground !== drag.ground ||
      small !== drag.small
    )
      this.set({ ...drag, target, ground, small });
  };

  /** Near the top or bottom edge of a scrolling grid the grid scrolls, faster closer to the edge. */
  private edgeScroll(el: Element | null): void {
    const viewport = el?.closest<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );
    let speed = 0;
    if (viewport && viewport.scrollHeight > viewport.clientHeight) {
      const r = viewport.getBoundingClientRect();
      const band = Math.min(vh(EDGE_VH), r.height / 3);
      const max = vh(EDGE_SPEED_VH);
      if (this.y < r.top + band) speed = -max * (1 - (this.y - r.top) / band);
      else if (this.y > r.bottom - band)
        speed = max * (1 - (r.bottom - this.y) / band);
    }
    this.scroller = speed !== 0 ? (viewport ?? null) : null;
    this.speed = speed;
    if (speed !== 0 && this.frame === 0)
      this.frame = requestAnimationFrame(this.scrollStep);
  }

  private scrollStep = (): void => {
    this.frame = 0;
    if (!this.scroller || this.speed === 0) return;
    this.scroller.scrollTop += this.speed;
    // The scroll event runs `update`, which keeps the speed or stops it.
    this.frame = requestAnimationFrame(this.scrollStep);
  };

  private key = (event: KeyboardEvent): void => {
    const drag = this.state;
    if (!drag || event.code !== "KeyR") return;
    this.set({ ...drag, rotated: !drag.rotated, w: drag.h, h: drag.w });
    this.update();
  };

  private end = (): void => {
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.end);
    window.removeEventListener("keydown", this.key);
    window.removeEventListener("scroll", this.update, true);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.scroller = null;
    this.speed = 0;
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
