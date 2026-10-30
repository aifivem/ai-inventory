import { fail, oneArg, readId, readInt } from "@aicore-fivem/lib/shared";
import {
  onClientCallback,
  onClientEvent,
  PendingActions,
} from "@aicore-fivem/lib/server";
import { EVENTS, type ActionResult } from "common/events";
import type { ItemDef } from "common/items";
import type { PendingUse, Stack } from "common/nui";
import { content } from "./content";
import { inventories } from "./registry";
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

/** The use the player's animation is running for: checked when it reports done (before 80 % of its time = refused). */
const pending = new PendingActions<{
  slot: number;
  name: string;
  serial: unknown;
}>();

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
  if (pending.peek(source)) return fail("INV_ERR_BUSY");
  if (def.use.time <= 0) {
    finish(source, stack, def);
    return { ok: true };
  }
  const token = pending.start(
    source,
    { slot, name: def.name, serial: stack.metadata.serial },
    def.use.time,
  );
  const use: PendingUse = {
    token,
    name: def.name,
    anim: def.use.anim,
    time: def.use.time,
  };
  emitNet(EVENTS.startUse, source, use);
  return { ok: true };
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
  EVENTS.finishUse,
  { args: oneArg(readId), lock: true },
  (source, token): ActionResult => {
    const running = pending.peek(source) !== null;
    const use = pending.take(source, token);
    // A matching token ends the use even when too early; a wrong one leaves it running.
    if (!use)
      return fail(
        running && pending.peek(source) === null
          ? "INV_ERR_TOO_FAST"
          : "INV_ERR_GONE",
      );
    const stack = inventories.playerOf(source)?.stacks.get(use.slot);
    const def = content.items.get(use.name);
    if (
      !stack ||
      !def ||
      stack.name !== use.name ||
      stack.metadata.serial !== use.serial
    )
      return fail("INV_ERR_GONE");
    finish(source, stack, def);
    return { ok: true };
  },
);

/** The client cancelled the use animation (moved, got in a car). */
onClientEvent(EVENTS.cancelUse, (source) => pending.cancel(source));

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
  pending.cancel(source);
  weapons.drop(source);
}
