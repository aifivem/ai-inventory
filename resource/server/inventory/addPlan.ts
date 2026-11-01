import { footprint, Occupancy } from "common/grid";
import type { ItemDef } from "common/items";
import type { Metadata, Stack } from "common/nui";
import { metaKey } from "./stacks";

/** What planning reads of an inventory (`Inventory`). */
interface PlanSource {
  readonly stacks: ReadonlyMap<number, Stack>;
  readonly columns: number;
  readonly rows: number;
  readonly grid: Occupancy;
  weightAllows(def: ItemDef, count: number): boolean;
}

/** One item of a combined add (`fitsAll`). */
export interface AddEntry {
  def: ItemDef;
  count: number;
  metadata: Metadata;
}

/** One step of an add: top up the stack at `slot` (`fresh` false) or start a new one there. */
export interface AddStep {
  slot: number;
  add: number;
  rotated: boolean;
  fresh: boolean;
}

/**
 * Plans adding `count` of an item to an inventory: tops up equal stacks first, then new stacks at free places (on a
 * scratch copy of the grid). Returns the steps or null when it does not all fit (nothing is changed).
 */
export function planAdd(
  inv: PlanSource,
  def: ItemDef,
  count: number,
  metadata: Metadata,
  slot?: number,
): AddStep[] | null {
  if (!inv.weightAllows(def, count)) return null;
  const steps: AddStep[] = [];
  let left = count;
  const key = metaKey(metadata);
  if (def.stack > 1) {
    for (const stack of inv.stacks.values()) {
      if (left === 0) break;
      if (
        stack.name !== def.name ||
        stack.count >= def.stack ||
        metaKey(stack.metadata) !== key
      )
        continue;
      if (slot !== undefined && stack.slot !== slot) continue;
      const add = Math.min(left, def.stack - stack.count);
      steps.push({
        slot: stack.slot,
        add,
        rotated: stack.rotated,
        fresh: false,
      });
      left -= add;
    }
  }
  if (left === 0) return steps;
  const scratch = new Occupancy(inv.columns, inv.rows);
  scratch.cells.set(inv.grid.cells);
  while (left > 0) {
    let place: { slot: number; rotated: boolean } | null = null;
    if (
      slot !== undefined &&
      steps.length === 0 &&
      !inv.stacks.has(slot) &&
      scratch.fits(slot, def.size.w, def.size.h)
    )
      place = { slot, rotated: false };
    place ??= scratch.findPlace(def.size);
    if (!place) return null;
    const { w, h } = footprint(def.size, place.rotated);
    scratch.mark(place.slot, w, h, place.slot);
    const add = Math.min(left, def.stack);
    steps.push({
      slot: place.slot,
      add,
      rotated: place.rotated,
      fresh: true,
    });
    left -= add;
  }
  return steps;
}

/**
 * Whether several items fit together (one trade, one reward): their summed weight, the room of equal stacks (what an
 * earlier entry took is gone for the next) and new stacks on one scratch copy of the grid. Nothing is changed.
 */
export function fitsAll(
  inv: PlanSource & { readonly weight: number; readonly maxWeight: number },
  entries: readonly AddEntry[],
): boolean {
  let total = 0;
  for (const e of entries) total += e.def.weight * e.count;
  if (inv.maxWeight > 0 && inv.weight + total > inv.maxWeight) return false;
  const topped = new Map<number, number>();
  const scratch = new Occupancy(inv.columns, inv.rows);
  scratch.cells.set(inv.grid.cells);
  for (const { def, count, metadata } of entries) {
    let left = count;
    const key = metaKey(metadata);
    if (def.stack > 1) {
      for (const stack of inv.stacks.values()) {
        if (left === 0) break;
        if (stack.name !== def.name || metaKey(stack.metadata) !== key)
          continue;
        const room = def.stack - stack.count - (topped.get(stack.slot) ?? 0);
        if (room <= 0) continue;
        const add = Math.min(left, room);
        topped.set(stack.slot, (topped.get(stack.slot) ?? 0) + add);
        left -= add;
      }
    }
    while (left > 0) {
      const place = scratch.findPlace(def.size);
      if (!place) return false;
      const { w, h } = footprint(def.size, place.rotated);
      scratch.mark(place.slot, w, h, place.slot);
      left -= Math.min(left, def.stack);
    }
  }
  return true;
}
