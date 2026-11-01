import { EVENTS } from "common/events";
import type { Panel } from "common/nui";
import { inventories } from "../registry/registry";
import { resolve } from "./resolve";

/** Opens an inventory (or a shop) on the player's screen, from a script, without range checks. */
export function forceOpen(
  source: number,
  inv: unknown,
  panel: Panel | null = null,
): boolean {
  if (!inventories.playerOf(source)) return false;
  if (panel) {
    inventories.close(source);
    emitNet(EVENTS.forceOpen, source, null, panel);
    return true;
  }
  const inventory = resolve(inv);
  if (!inventory || inventory === inventories.playerOf(source)) return false;
  inventories.watch(source, inventory);
  emitNet(EVENTS.forceOpen, source, inventory.view(), null);
  return true;
}
