import { footprint, Occupancy } from "common/grid";
import type { ItemDef } from "common/items";
import type { InventoryKind, InventoryView, Metadata, Stack } from "common/nui";
import { EVENTS } from "common/events";
import { content } from "./content";

/** Stable text of metadata for "same stack" checks (key order does not matter). */
export function metaKey(metadata: Metadata): string {
  const keys = Object.keys(metadata).sort();
  return keys.length === 0 ? "" : JSON.stringify(metadata, keys);
}

/** A serial ties the held weapon to its stack while it moves around the grid. */
export function ensureSerial(def: ItemDef, metadata: Record<string, unknown>): void {
  if (def.type === "weapon" && !def.weapon?.throwable && typeof metadata.serial !== "string") {
    metadata.serial = Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}

const sizeOf = (def: ItemDef | undefined): { w: number; h: number } => def?.size ?? { w: 1, h: 1 };

/**
 * One inventory in server memory: stacks by anchor slot, the cell occupancy, the weight and who sees it. Every change
 * marks its slots; one delta per tick goes to the viewers (the push lives here, callers never send).
 */
export class Inventory {
  readonly stacks = new Map<number, Stack>();
  readonly viewers = new Set<number>();
  grid: Occupancy;
  weight = 0;
  dirty = false;
  /** Kept in memory while idle (stashes a script registered: its exports must find them). */
  pinned = false;
  lastUsed = Date.now();
  private readonly touched = new Set<number>();
  private flushQueued = false;

  constructor(
    readonly id: string,
    readonly kind: InventoryKind,
    public label: string,
    public columns: number,
    public rows: number,
    public maxWeight: number,
    /** Written to the database (player, stash, owned trunk); drops and temporary stashes are not. */
    readonly persistent: boolean,
    stacks: Stack[],
  ) {
    for (const stack of stacks) this.stacks.set(stack.slot, stack);
    this.grid = new Occupancy(columns, rows);
    this.rebuild();
  }

  get slots(): number {
    return this.columns * this.rows;
  }

  /** Recomputes occupancy and weight (after load, a resize or an item definition change). */
  rebuild(): void {
    this.grid = new Occupancy(this.columns, this.rows);
    this.weight = 0;
    for (const stack of this.stacks.values()) {
      const def = content.items.get(stack.name);
      const { w, h } = footprint(sizeOf(def), stack.rotated);
      if (this.grid.fits(stack.slot, w, h)) this.grid.mark(stack.slot, w, h, stack.slot);
      this.weight += (def?.weight ?? 0) * stack.count;
    }
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
    this.grid.mark(stack.slot, w, h, stack.slot);
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
    this.grid.mark(slot, w, h, 0);
    this.weight -= (def?.weight ?? 0) * stack.count;
    this.touch(slot);
    return stack;
  }

  /** Changes a stack's count in place (0 removes it). */
  setCount(slot: number, count: number): void {
    const stack = this.stacks.get(slot);
    if (!stack) return;
    if (count <= 0) return void this.take(slot);
    this.weight += (content.items.get(stack.name)?.weight ?? 0) * (count - stack.count);
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
    for (const stack of this.stacks.values()) if (stack.name === name && (key === null || metaKey(stack.metadata) === key)) total += stack.count;
    return total;
  }

  /** Whether `count` more of an item stays inside the weight limit. */
  weightAllows(def: ItemDef, count: number): boolean {
    return this.maxWeight <= 0 || this.weight + def.weight * count <= this.maxWeight;
  }

  /**
   * Plans adding `count` of an item: tops up equal stacks first, then new stacks at free places. Returns the steps or
   * null when it does not all fit (nothing is changed).
   */
  planAdd(def: ItemDef, count: number, metadata: Metadata, slot?: number): Array<{ slot: number; add: number; rotated: boolean; fresh: boolean }> | null {
    if (!this.weightAllows(def, count)) return null;
    const steps: Array<{ slot: number; add: number; rotated: boolean; fresh: boolean }> = [];
    let left = count;
    const key = metaKey(metadata);
    if (def.stack > 1) {
      for (const stack of this.stacks.values()) {
        if (left === 0) break;
        if (stack.name !== def.name || stack.count >= def.stack || metaKey(stack.metadata) !== key) continue;
        if (slot !== undefined && stack.slot !== slot) continue;
        const add = Math.min(left, def.stack - stack.count);
        steps.push({ slot: stack.slot, add, rotated: stack.rotated, fresh: false });
        left -= add;
      }
    }
    if (left === 0) return steps;
    const scratch = new Occupancy(this.columns, this.rows);
    scratch.cells.set(this.grid.cells);
    while (left > 0) {
      let place: { slot: number; rotated: boolean } | null = null;
      if (slot !== undefined && steps.length === 0 && !this.stacks.has(slot) && scratch.fits(slot, def.size.w, def.size.h)) place = { slot, rotated: false };
      place ??= scratch.findPlace(def.size);
      if (!place) return null;
      const { w, h } = footprint(def.size, place.rotated);
      scratch.mark(place.slot, w, h, place.slot);
      const add = Math.min(left, def.stack);
      steps.push({ slot: place.slot, add, rotated: place.rotated, fresh: true });
      left -= add;
    }
    return steps;
  }

  /** Adds an item all-or-nothing; false when it does not fit. */
  add(def: ItemDef, count: number, metadata: Metadata = {}, slot?: number): boolean {
    const plan = this.planAdd(def, count, metadata, slot);
    if (!plan) return false;
    for (const step of plan) {
      const existing = this.stacks.get(step.slot);
      if (existing && !step.fresh) this.setCount(step.slot, existing.count + step.add);
      else {
        const meta = structuredClone(metadata);
        ensureSerial(def, meta);
        this.put({ slot: step.slot, name: def.name, count: step.add, metadata: meta, rotated: step.rotated });
      }
    }
    return true;
  }

  /** Removes `count` of an item (from `slot` only when given) all-or-nothing; false when there is not enough. */
  remove(name: string, count: number, metadata?: Metadata, slot?: number): boolean {
    const key = metadata ? metaKey(metadata) : null;
    const from = [...this.stacks.values()].filter(
      (stack) => stack.name === name && (slot === undefined || stack.slot === slot) && (key === null || metaKey(stack.metadata) === key),
    );
    if (from.reduce((sum, stack) => sum + stack.count, 0) < count) return false;
    let left = count;
    for (const stack of from.sort((a, b) => a.count - b.count)) {
      const take = Math.min(left, stack.count);
      this.setCount(stack.slot, stack.count - take);
      left -= take;
      if (left === 0) break;
    }
    return true;
  }

  clear(): void {
    for (const slot of this.stacks.keys()) this.take(slot);
  }

  view(): InventoryView {
    return { id: this.id, kind: this.kind, label: this.label, columns: this.columns, rows: this.rows, maxWeight: this.maxWeight, stacks: [...this.stacks.values()] };
  }

  private touch(slot: number): void {
    this.touched.add(slot);
    this.dirty = true;
    this.lastUsed = Date.now();
    if (this.flushQueued) return;
    this.flushQueued = true;
    queueMicrotask(() => this.flush());
  }

  /** One delta of every slot touched since the last one, to the viewers only. */
  private flush(): void {
    this.flushQueued = false;
    if (this.touched.size === 0) return;
    const put: Stack[] = [];
    const remove: number[] = [];
    for (const slot of this.touched) {
      const stack = this.stacks.get(slot);
      if (stack) put.push(stack);
      else remove.push(slot);
    }
    this.touched.clear();
    for (const viewer of this.viewers) emitNet(EVENTS.delta, viewer, this.id, put, remove, this.maxWeight);
  }
}
