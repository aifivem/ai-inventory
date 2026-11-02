import { resolve } from "../api/resolve";
import { content } from "../content";
import type { Inventory } from "../inventory/inventory";
import { weapons } from "../weapons";
import { durabilityOf, repairsOf, wearKind } from "./wear";

/** The durability API every export layer (own, ox_inventory) uses: metadata `durability` 0-100 and `repairs`. */

const percent = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : null;

function stackAt(inv: unknown, slot: unknown) {
  const inventory = resolve(inv);
  const stack =
    typeof slot === "number" ? inventory?.stacks.get(slot) : undefined;
  return inventory && stack ? { inventory, stack } : null;
}

/** A held weapon that wore out is put away (its owner is a viewer of the player inventory). */
function recheck(inventory: Inventory): void {
  if (inventory.kind === "player")
    for (const viewer of inventory.viewers) weapons.check(viewer);
}

/** A stack's durability: a weapon without the key is new (100); another item only when it has the key, else null. */
export function getDurability(inv: unknown, slot: unknown): number | null {
  const found = stackAt(inv, slot);
  if (!found) return null;
  const { metadata, name } = found.stack;
  return wearKind(content.items.get(name)) !== null
    ? durabilityOf(metadata)
    : percent(metadata.durability);
}

/** Sets a stack's `durability` (kept within 0-100); a held weapon set to 0 is put away. */
export function setDurability(
  inv: unknown,
  slot: unknown,
  value: unknown,
): boolean {
  const found = stackAt(inv, slot);
  const durability = percent(value);
  if (!found || durability === null) return false;
  const { inventory, stack } = found;
  inventory.setMetadata(stack.slot, { ...stack.metadata, durability });
  recheck(inventory);
  return true;
}

/** Sets a weapon's durability to `to` (default the panel's repair percent) and counts the repair; false for no weapon. */
export function repairWeapon(
  inv: unknown,
  slot: unknown,
  to?: unknown,
): boolean {
  const found = stackAt(inv, slot);
  if (!found || wearKind(content.items.get(found.stack.name)) === null)
    return false;
  const { inventory, stack } = found;
  inventory.setMetadata(stack.slot, {
    ...stack.metadata,
    durability: percent(to) ?? content.settings.durability.repairPercent,
    repairs: repairsOf(stack.metadata) + 1,
  });
  return true;
}
