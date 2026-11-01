import { fail, oneArg, readInt } from "@aicore-fivem/lib/shared";
import {
  notify,
  onClientCallback,
  onClientEvent,
  PlayerMap,
  progressFor,
} from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { EVENTS, type ActionResult } from "common/events";
import { USE_ANIMS, type ItemDef } from "common/items";
import type { Stack } from "common/nui";
import { content } from "./content";
import { inventories } from "./registry/registry";
import { weapons } from "./weapons";

/** Server local event every use fires: (source, name, slot, metadata, status) (ai-hud applies `status`). */
export const USED_EVENT = "ai-inventory:usedItem";

/** A script's handler for an item (`RegisterUsableItem`, QB `CreateUseableItem`); returning false keeps the item. */
export type UseHandler = (
  source: number,
  item: {
    name: string;
    slot: number;
    count: number;
    metadata: Record<string, unknown>;
  },
) => unknown;
const handlers = new Map<string, UseHandler>();

export function registerUsable(name: string, handler: UseHandler): void {
  handlers.set(name.toLowerCase(), handler);
}

/** Players whose use animation runs (one at a time). */
const using = new PlayerMap<true>();

/** Consumes the item and tells scripts (after the animation, or at once when the item has none). */
function finish(source: number, stack: Stack, def: ItemDef): void {
  const inventory = inventories.playerOf(source);
  if (!inventory) return;
  const handler = handlers.get(def.name);
  const item = {
    name: def.name,
    slot: stack.slot,
    count: stack.count,
    metadata: stack.metadata,
  };
  const keep = handler ? handler(source, item) === false : false;
  if (!keep && def.consume > 0)
    inventory.setCount(
      stack.slot,
      stack.count - Math.min(def.consume, stack.count),
    );
  emit(
    USED_EVENT,
    source,
    def.name,
    stack.slot,
    stack.metadata,
    def.use.status,
  );
}

/** Uses a stack of the player's own inventory: weapons are held, attachments put on, the rest consumed. */
export function useSlot(
  source: number,
  slot: number,
  hash?: string,
): ActionResult {
  const inventory = inventories.playerOf(source);
  const stack = inventory?.stacks.get(slot);
  const def = stack ? content.items.get(stack.name) : undefined;
  if (!inventory || !stack || !def) return fail("INV_ERR_GONE");
  if (def.type === "weapon") {
    weapons.toggle(source, stack);
    return { ok: true };
  }
  if (def.type === "component")
    return hash ? weapons.attach(source, stack, hash) : fail("INV_ERR_NOT_FIT");
  if (def.type === "ammo") return weapons.reload(source, 250);
  if (!def.usable && !handlers.has(def.name)) return fail("INV_ERR_NOT_USABLE");
  if (using.has(source)) return fail("INV_ERR_BUSY");
  if (def.use.time <= 0) {
    finish(source, stack, def);
    return { ok: true };
  }
  void playUse(source, slot, stack.metadata.serial, def);
  return { ok: true };
}

/** Runs the use animation (server-timed progress bar), then consumes the stack if it is still the same item. */
async function playUse(
  source: number,
  slot: number,
  serial: unknown,
  def: ItemDef,
): Promise<void> {
  using.set(source, true);
  const done = await progressFor(source, {
    label: Locale("UI_USING", def.label),
    duration: def.use.time,
    anim: USE_ANIMS[def.use.anim],
  });
  using.delete(source);
  if (!done) return;
  const stack = inventories.playerOf(source)?.stacks.get(slot);
  if (!stack || stack.name !== def.name || stack.metadata.serial !== serial)
    return notify(source, Locale("INV_ERR_GONE"), "error");
  finish(source, stack, def);
}

onClientCallback(
  EVENTS.use,
  {
    args: ([slot, hash]) => {
      const s = readInt(slot, 1, 10_000);
      if (s === null) return null;
      return [
        s,
        typeof hash === "string" && /^[A-Z0-9_]{2,64}$/.test(hash)
          ? hash
          : undefined,
      ] as const;
    },
    lock: true,
  },
  (source, slot, hash) => useSlot(source, slot, hash),
);

onClientCallback(
  EVENTS.reload,
  { args: oneArg((v) => readInt(v, 1, 1000)), lock: true },
  (source, want) => weapons.reload(source, want),
);

onClientCallback(
  EVENTS.detach,
  {
    args: ([slot, hash]) => {
      const s = readInt(slot, 1, 10_000);
      return s !== null && typeof hash === "string" ? [s, hash] : null;
    },
    lock: true,
  },
  (source, slot, hash) => weapons.detach(source, slot, hash),
);

onClientEvent(
  EVENTS.ammo,
  {
    args: ([slot, ammo]) => {
      const s = readInt(slot, 1, 10_000);
      const a = readInt(ammo, 0, 100_000);
      return s !== null && a !== null ? [s, a] : null;
    },
  },
  (source, slot, ammo) => weapons.reportAmmo(source, slot, ammo),
);

export function dropPlayer(source: number): void {
  weapons.drop(source);
}
