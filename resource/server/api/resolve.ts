import { isRecord, normalizePlate } from "@aicore-fivem/lib/shared";
import type { Inventory } from "../inventory/inventory";
import { inventories } from "../registry/registry";

/**
 * Finds an inventory the way scripts name one: a player source (number or numeric text), an id (`stash:x`,
 * `trunk:ABC123`), a stash name, or ox's `{ id, owner }`. Only inventories in memory are found.
 */
export function resolve(inv: unknown): Inventory | undefined {
  if (typeof inv === "number") return inventories.playerOf(inv);
  if (isRecord(inv) && typeof inv.id === "string") {
    const owner = inv.owner;
    return typeof owner === "string" || typeof owner === "number"
      ? inventories.get(`stash:${inv.id}:${owner}`)
      : resolve(inv.id);
  }
  if (typeof inv !== "string") return undefined;
  const asSource = Number(inv);
  if (Number.isInteger(asSource) && asSource > 0)
    return inventories.playerOf(asSource);
  return (
    inventories.get(inv) ??
    inventories.get(`stash:${inv}`) ??
    inventories.get(`trunk:${normalizePlate(inv)}`) ??
    inventories.get(`glovebox:${normalizePlate(inv)}`)
  );
}
