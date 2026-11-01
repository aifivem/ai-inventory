import { footprint, isHotbarSlot, Occupancy } from "common/grid";
import type { Metadata, Stack } from "common/nui";
import { content } from "../content";
import { metaKey, sizeOf } from "./stacks";

/**
 * The stacks of one inventory by anchor slot, their cell occupancy and weight, and the stack changes that keep the
 * three in step. `Inventory` adds who sees it and how it is stored; every change reports its slot through `touch`.
 */
export abstract class SlotGrid {
  readonly stacks = new Map<number, Stack>();
  grid: Occupancy;
  weight = 0;

  constructor(
    public columns: number,
    public rows: number,
  ) {
    this.grid = new Occupancy(columns, rows);
  }

  /** Only player inventories have quick slots. */
  abstract get hasHotbar(): boolean;

  /** A slot changed (its stack, count or metadata). */
  protected abstract touch(slot: number): void;

  /** Anchor slots of the stacks `w x h` at `slot` would cover (a quick slot covers only its own stack). */
  coveredAt(slot: number, w: number, h: number): Set<number> {
    if (!isHotbarSlot(slot)) return this.grid.covered(slot, w, h);
    return new Set(this.hasHotbar && this.stacks.has(slot) ? [slot] : []);
  }

  /** Whether a stack fits at `slot`: free cells of the grid, or an empty quick slot (`ignore` = the moving stack). */
  fitsAt(slot: number, w: number, h: number, ignore = 0): boolean {
    if (!isHotbarSlot(slot)) return this.grid.fits(slot, w, h, ignore);
    return this.hasHotbar && (!this.stacks.has(slot) || slot === ignore);
  }

  /**
   * Recomputes occupancy and weight (after load, a resize or an item definition change). A stack that no longer fits
   * at its slot (smaller grid, overlap after a column change) moves to the first free place; while there is none the
   * grid grows by a row, so no item is lost, hidden or drawn outside.
   */
  rebuild(): void {
    this.grid = new Occupancy(this.columns, this.rows);
    this.weight = 0;
    const orphans: Stack[] = [];
    for (const stack of this.stacks.values()) {
      const def = content.items.get(stack.name);
      this.weight += (def?.weight ?? 0) * stack.count;
      if (this.hasHotbar && isHotbarSlot(stack.slot)) continue;
      const { w, h } = footprint(sizeOf(def), stack.rotated);
      if (this.grid.fits(stack.slot, w, h))
        this.grid.mark(stack.slot, w, h, stack.slot);
      else orphans.push(stack);
    }
    // Out of the map first: a new place may be another orphan's old anchor slot.
    for (const stack of orphans) {
      this.stacks.delete(stack.slot);
      this.touch(stack.slot);
    }
    for (const stack of orphans) {
      const size = sizeOf(content.items.get(stack.name));
      let place: { slot: number; rotated: boolean } | null;
      if (Math.min(size.w, size.h) > this.columns) {
        // Wider than a row both ways (item larger than the column count): own new rows, marked clipped.
        place = { slot: this.rows * this.columns + 1, rotated: false };
        this.grow(size.h);
      } else {
        place = this.grid.findPlace(size);
        while (!place) {
          this.grow(1);
          place = this.grid.findPlace(size);
        }
      }
      const { w, h } = footprint(size, place.rotated);
      this.grid.mark(place.slot, w, h, place.slot);
      this.stacks.set(place.slot, {
        ...stack,
        slot: place.slot,
        rotated: place.rotated,
      });
      this.touch(place.slot);
    }
  }

  /** Adds empty rows at the bottom (cells keep their place: rows are row-major). */
  private grow(rows: number): void {
    this.rows += rows;
    const grid = new Occupancy(this.columns, this.rows);
    grid.cells.set(this.grid.cells);
    this.grid = grid;
  }

  /** Cells a stack of `name` covers at `rotated`. */
  shape(name: string, rotated: boolean): { w: number; h: number } {
    return footprint(sizeOf(content.items.get(name)), rotated);
  }

  /** Puts a stack (new or replaced) at its slot; the caller checked the place. */
  put(stack: Stack): void {
    const old = this.stacks.get(stack.slot);
    if (old) this.take(old.slot);
    const def = content.items.get(stack.name);
    const { w, h } = footprint(sizeOf(def), stack.rotated);
    this.stacks.set(stack.slot, stack);
    if (!isHotbarSlot(stack.slot)) this.grid.mark(stack.slot, w, h, stack.slot);
    this.weight += (def?.weight ?? 0) * stack.count;
    this.touch(stack.slot);
  }

  /** Removes the stack at `slot` and returns it. */
  take(slot: number): Stack | undefined {
    const stack = this.stacks.get(slot);
    if (!stack) return undefined;
    const def = content.items.get(stack.name);
    const { w, h } = footprint(sizeOf(def), stack.rotated);
    this.stacks.delete(slot);
    if (!isHotbarSlot(slot)) this.grid.mark(slot, w, h, 0);
    this.weight -= (def?.weight ?? 0) * stack.count;
    this.touch(slot);
    return stack;
  }

  /** Changes a stack's count in place (0 removes it). */
  setCount(slot: number, count: number): void {
    const stack = this.stacks.get(slot);
    if (!stack) return;
    if (count <= 0) return void this.take(slot);
    this.weight +=
      (content.items.get(stack.name)?.weight ?? 0) * (count - stack.count);
    stack.count = count;
    this.touch(slot);
  }

  /** Replaces a stack's metadata (weapon ammo, durability, script data). */
  setMetadata(slot: number, metadata: Metadata): void {
    const stack = this.stacks.get(slot);
    if (!stack) return;
    stack.metadata = metadata;
    this.touch(slot);
  }

  count(name: string, metadata?: Metadata): number {
    const key = metadata ? metaKey(metadata) : null;
    let total = 0;
    for (const stack of this.stacks.values())
      if (
        stack.name === name &&
        (key === null || metaKey(stack.metadata) === key)
      )
        total += stack.count;
    return total;
  }

  clear(): void {
    for (const slot of this.stacks.keys()) this.take(slot);
  }
}
