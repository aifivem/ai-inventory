import { isRecord } from "@aicore-fivem/lib/shared";
import type { Stack } from "common/nui";
import { content } from "../content";
import { drops } from "../drops";
import { fitsAll, type AddEntry } from "../inventory/addPlan";
import type { Inventory } from "../inventory/inventory";
import { weapons } from "../weapons";
import { resolve } from "./resolve";
import { countOf, metaOf } from "./scriptArgs";

/** The inventory API every export layer (own, ox_inventory, qb-inventory) is built on. */

export function addItem(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown,
  slot?: unknown,
): boolean {
  const inventory = resolve(inv);
  const def = content.items.get(name);
  const n = countOf(count);
  if (!inventory || !def || n === null) return false;
  return inventory.add(
    def,
    n,
    metaOf(metadata),
    typeof slot === "number" ? slot : undefined,
  );
}

export function removeItem(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown,
  slot?: unknown,
): boolean {
  const inventory = resolve(inv);
  const def = content.items.get(name);
  const n = countOf(count);
  if (!inventory || !def || n === null) return false;
  const ok = inventory.remove(
    def.name,
    n,
    isRecord(metadata) ? metadata : undefined,
    typeof slot === "number" ? slot : undefined,
  );
  if (ok && inventory.kind === "player")
    for (const viewer of inventory.viewers) weapons.check(viewer);
  drops.check(inventory);
  return ok;
}

export function countItem(
  inv: unknown,
  name: unknown,
  metadata?: unknown,
): number {
  const inventory = resolve(inv);
  const def = content.items.get(name);
  return inventory && def
    ? inventory.count(def.name, isRecord(metadata) ? metadata : undefined)
    : 0;
}

export function canCarry(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown,
): boolean {
  const inventory = resolve(inv);
  const def = content.items.get(name);
  const n = countOf(count);
  return Boolean(
    inventory &&
    def &&
    n !== null &&
    inventory.planAdd(def, n, metaOf(metadata)),
  );
}

/** Whether all the items (`{ name, count, metadata? }[]`) fit together; false for an unknown item. */
export function canCarryAll(inv: unknown, items: unknown): boolean {
  const inventory = resolve(inv);
  if (!inventory || !Array.isArray(items)) return false;
  const entries: AddEntry[] = [];
  for (const raw of items) {
    if (!isRecord(raw)) return false;
    const def = content.items.get(raw.name);
    const n = countOf(raw.count ?? raw.amount);
    if (!def || n === null) return false;
    entries.push({ def, count: n, metadata: metaOf(raw.metadata ?? raw.info) });
  }
  return fitsAll(inventory, entries);
}

/** Stacks of one item (any spelling), lowest slot first. */
export function stacksOf(
  inventory: Inventory,
  name: unknown,
  metadata?: unknown,
): Stack[] {
  const def = content.items.get(name);
  if (!def) return [];
  const want = isRecord(metadata) ? metadata : null;
  return [...inventory.stacks.values()]
    .filter(
      (s) =>
        s.name === def.name &&
        (!want || Object.entries(want).every(([k, v]) => s.metadata[k] === v)),
    )
    .sort((a, b) => a.slot - b.slot);
}

export function setMetadata(
  inv: unknown,
  slot: unknown,
  metadata: unknown,
): boolean {
  const inventory = resolve(inv);
  if (!inventory || typeof slot !== "number" || !inventory.stacks.has(slot))
    return false;
  inventory.setMetadata(slot, metaOf(metadata));
  return true;
}

/** Sets a loaded inventory's weight limit (grams) until it loads again or the panel re-lays it; viewers see it at once. */
export function setMaxWeight(inv: unknown, grams: unknown): boolean {
  const inventory = resolve(inv);
  if (!inventory || typeof grams !== "number" || !Number.isFinite(grams))
    return false;
  inventory.relayout(
    inventory.columns,
    inventory.rows,
    Math.max(0, Math.floor(grams)),
  );
  return true;
}
