import { footprint, Occupancy } from "common/grid";
import type { ItemDef } from "common/items";
import type { Metadata } from "common/nui";
import type { Inventory } from "./inventory";
import { metaKey } from "./stacks";

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
  inv: Inventory,
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
