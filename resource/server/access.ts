import { online, PlayerMap } from "@aicore-fivem/lib/server";
import { inventories } from "./registry";
import type { Inventory } from "./inventory";

export const charIdOf = (source: number): number | null =>
  online.character(source)?.id ?? null;

/** Per player: how to re-check that the open second inventory is still in reach (distance to its point or vehicle). */
const reach = new PlayerMap<() => boolean>();

export function setReach(source: number, check: () => boolean): void {
  reach.set(source, check);
}

/**
 * The inventory a client action may touch: the player's own, or the second one he has open and still reaches.
 * Anything else (an id from a stale screen, a stash left behind) is refused.
 */
export function reachable(source: number, id: string): Inventory | null {
  const own = inventories.playerOf(source);
  if (own?.id === id) return own;
  const open = inventories.openOf(source);
  if (!open || open.id !== id) return null;
  if (reach.get(source)?.() === false) {
    inventories.close(source);
    return null;
  }
  return open;
}
