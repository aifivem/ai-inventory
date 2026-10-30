import { fail } from "@aicore-fivem/lib/shared";
import type { ActionResult } from "common/events";
import type { MoveInput, Stack } from "common/nui";
import { isHotbarSlot } from "common/grid";
import { content } from "./content";
import type { Inventory } from "./inventory";
import { metaKey } from "./stacks";

const OK: ActionResult = { ok: true };

const weightFits = (inv: Inventory, extra: number): boolean =>
  inv.maxWeight <= 0 || inv.weight + extra <= inv.maxWeight;

/**
 * Moves (part of) a stack from `a` to `b` (they may be the same inventory). In order: onto an equal stack (merge),
 * onto free cells (move or split), onto exactly one other stack (swap, whole stacks only). Synchronous, so nothing
 * else can change either inventory between the checks and the writes.
 */
export function moveStack(
  a: Inventory,
  b: Inventory,
  m: MoveInput,
): ActionResult {
  const stack = a.stacks.get(m.fromSlot);
  if (!stack || m.count > stack.count) return fail("INV_ERR_GONE");
  const def = content.items.get(stack.name);
  if (!def) return fail("INV_ERR_GONE");
  const same = a === b;
  const whole = m.count === stack.count;
  if (same && whole && m.toSlot === m.fromSlot && m.rotated === stack.rotated)
    return OK;
  const { w, h } = b.shape(stack.name, m.rotated);
  const movedWeight = def.weight * m.count;

  const covered = b.coveredAt(m.toSlot, w, h);
  if (same && whole) covered.delete(m.fromSlot);

  // Merge onto an equal stack under the cursor.
  if (covered.size === 1) {
    const target = b.stacks.get([...covered][0] ?? 0);
    if (
      target &&
      target.slot !== m.fromSlot &&
      target.name === stack.name &&
      def.stack > 1 &&
      metaKey(target.metadata) === metaKey(stack.metadata)
    ) {
      const add = Math.min(m.count, def.stack - target.count);
      if (add <= 0) return fail("INV_ERR_FULL_STACK");
      if (!same && !weightFits(b, def.weight * add))
        return fail("INV_ERR_HEAVY");
      a.setCount(stack.slot, stack.count - add);
      b.setCount(target.slot, target.count + add);
      return OK;
    }
  }

  // Free cells.
  if (b.fitsAt(m.toSlot, w, h, same && whole ? m.fromSlot : 0)) {
    if (!same && !weightFits(b, movedWeight)) return fail("INV_ERR_HEAVY");
    if (whole) {
      a.take(stack.slot);
      b.put({ ...stack, slot: m.toSlot, rotated: m.rotated });
    } else {
      a.setCount(stack.slot, stack.count - m.count);
      b.put({
        slot: m.toSlot,
        name: stack.name,
        count: m.count,
        metadata: structuredClone(stack.metadata),
        rotated: m.rotated,
      });
    }
    return OK;
  }

  // Swap with exactly one other stack (whole stacks).
  if (!whole || covered.size !== 1) return fail("INV_ERR_NO_SPACE");
  const other = b.stacks.get([...covered][0] ?? 0);
  if (!other) return fail("INV_ERR_NO_SPACE");
  return swap(a, b, stack, other, m);
}

function swap(
  a: Inventory,
  b: Inventory,
  stack: Stack,
  other: Stack,
  m: MoveInput,
): ActionResult {
  const defA = content.items.get(stack.name);
  const defB = content.items.get(other.name);
  if (!defA || !defB) return fail("INV_ERR_GONE");
  if (a !== b) {
    const delta = defB.weight * other.count - defA.weight * stack.count;
    if (!weightFits(a, delta) || !weightFits(b, -delta))
      return fail("INV_ERR_HEAVY");
  }
  a.take(stack.slot);
  b.take(other.slot);
  const mine = b.shape(stack.name, m.rotated);
  const placeMine = b.fitsAt(m.toSlot, mine.w, mine.h);
  // Reserve the cells while the other stack looks for a place (a quick slot covers no cells).
  const reserve = placeMine && !isHotbarSlot(m.toSlot);
  if (reserve) b.grid.mark(m.toSlot, mine.w, mine.h, m.toSlot);
  // The other stack goes where the moved one was, as it was turned or turned the other way.
  const theirs = [other.rotated, !other.rotated].find((rot) => {
    const s = a.shape(other.name, rot);
    return a.fitsAt(stack.slot, s.w, s.h);
  });
  if (reserve) b.grid.mark(m.toSlot, mine.w, mine.h, 0);
  if (!placeMine || theirs === undefined) {
    a.put(stack);
    b.put(other);
    return fail("INV_ERR_NO_SPACE");
  }
  b.put({ ...stack, slot: m.toSlot, rotated: m.rotated });
  a.put({ ...other, slot: stack.slot, rotated: theirs });
  return OK;
}
