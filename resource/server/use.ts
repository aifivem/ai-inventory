import { onClientCallback, onClientEvent } from "@aicore-fivem/lib/server";
import { EVENTS, type ActionResult } from "common/events";
import type { ItemDef } from "common/items";
import type { PendingUse, Stack } from "common/nui";
import { content } from "./content";
import { inventories } from "./registry";
import { weapons } from "./weapons";

/** Server local event every use fires: (source, name, slot, metadata, status) (ai-hud applies `status`). */
export const USED_EVENT = "ai-inventory:usedItem";

const fail = (error: string): ActionResult => ({ ok: false, error });
const int = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

/** A script's handler for an item (`RegisterUsableItem`, QB `CreateUseableItem`); returning false keeps the item. */
export type UseHandler = (source: number, item: { name: string; slot: number; count: number; metadata: Record<string, unknown> }) => unknown;
const handlers = new Map<string, UseHandler>();

export function registerUsable(name: string, handler: UseHandler): void {
  handlers.set(name.toLowerCase(), handler);
}

/** The use the player's animation is running for: checked when it reports done (too early = refused). */
const pending = new Map<number, { token: number; slot: number; name: string; serial: unknown; startedAt: number; time: number }>();
let nextToken = 0;

/** Consumes the item and tells scripts (after the animation, or at once when the item has none). */
function finish(source: number, stack: Stack, def: ItemDef): void {
  const inventory = inventories.playerOf(source);
  if (!inventory) return;
  const handler = handlers.get(def.name);
  const item = { name: def.name, slot: stack.slot, count: stack.count, metadata: stack.metadata };
  const keep = handler ? handler(source, item) === false : false;
  if (!keep && def.consume > 0) inventory.setCount(stack.slot, stack.count - Math.min(def.consume, stack.count));
  emit(USED_EVENT, source, def.name, stack.slot, stack.metadata, def.use.status);
}

/** Uses a stack of the player's own inventory: weapons are held, attachments put on, the rest consumed. */
export function useSlot(source: number, slot: number, hash?: string): ActionResult {
  const inventory = inventories.playerOf(source);
  const stack = inventory?.stacks.get(slot);
  const def = stack ? content.items.get(stack.name) : undefined;
  if (!inventory || !stack || !def) return fail("INV_ERR_GONE");
  if (def.type === "weapon") {
    weapons.toggle(source, stack);
    return { ok: true };
  }
  if (def.type === "component") return hash ? weapons.attach(source, stack, hash) : fail("INV_ERR_NOT_FIT");
  if (def.type === "ammo") return weapons.reload(source, 250);
  if (!def.usable && !handlers.has(def.name)) return fail("INV_ERR_NOT_USABLE");
  if (pending.has(source)) return fail("INV_ERR_BUSY");
  if (def.use.time <= 0) {
    finish(source, stack, def);
    return { ok: true };
  }
  const token = ++nextToken;
  pending.set(source, { token, slot, name: def.name, serial: stack.metadata.serial, startedAt: Date.now(), time: def.use.time });
  const use: PendingUse = { token, name: def.name, anim: def.use.anim, time: def.use.time };
  emitNet(EVENTS.startUse, source, use);
  return { ok: true };
}

onClientCallback(
  EVENTS.use,
  {
    args: ([slot, hash]) => {
      const s = int(slot, 1, 10_000);
      if (s === null) return null;
      return [s, typeof hash === "string" && /^[A-Z0-9_]{2,64}$/.test(hash) ? hash : undefined] as const;
    },
    lock: true,
  },
  (source, slot, hash) => useSlot(source, slot, hash),
);

onClientCallback(EVENTS.finishUse, { args: ([token]) => (int(token, 1, 2 ** 31) === null ? null : [token as number]), lock: true }, (source, token): ActionResult => {
  const use = pending.get(source);
  if (!use || use.token !== token) return fail("INV_ERR_GONE");
  pending.delete(source);
  // The animation runs on the client clock; allow a little drift.
  if (Date.now() - use.startedAt < use.time * 0.8) return fail("INV_ERR_TOO_FAST");
  const stack = inventories.playerOf(source)?.stacks.get(use.slot);
  const def = content.items.get(use.name);
  if (!stack || !def || stack.name !== use.name || stack.metadata.serial !== use.serial) return fail("INV_ERR_GONE");
  finish(source, stack, def);
  return { ok: true };
});

/** The client cancelled the use animation (moved, got in a car). */
onClientEvent(EVENTS.cancelUse, (source) => pending.delete(source));

onClientCallback(EVENTS.reload, { args: ([want]) => (int(want, 1, 1000) === null ? null : [want as number]), lock: true }, (source, want) =>
  weapons.reload(source, want),
);

onClientCallback(
  EVENTS.detach,
  { args: ([slot, hash]) => (int(slot, 1, 10_000) !== null && typeof hash === "string" ? [slot as number, hash] : null), lock: true },
  (source, slot, hash) => weapons.detach(source, slot, hash),
);

onClientEvent(
  EVENTS.ammo,
  { args: ([slot, ammo]) => (int(slot, 1, 10_000) !== null && int(ammo, 0, 100_000) !== null ? [slot as number, ammo as number] : null) },
  (source, slot, ammo) => weapons.reportAmmo(source, slot, ammo),
);

export function dropPlayer(source: number): void {
  pending.delete(source);
  weapons.drop(source);
}
