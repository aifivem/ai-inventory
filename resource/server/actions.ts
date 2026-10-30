import { asArgs } from "@aicore-fivem/lib/shared";
import { aiLog, onClientCallback } from "@aicore-fivem/lib/server";
import { EVENTS, type ActionResult } from "common/events";
import { toMoveInput } from "common/nui";
import { pedCoords, reachable } from "./access";
import { content } from "./content";
import { drops } from "./drops";
import { moveStack } from "./move";
import { inventories } from "./registry";
import { weapons } from "./weapons";

const GIVE_DISTANCE = 3;
const fail = (error: string): ActionResult => ({ ok: false, error });
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max
    ? v
    : null;

onClientCallback(
  EVENTS.move,
  { args: ([raw]) => asArgs(toMoveInput(raw)), lock: true },
  (source, m): ActionResult => {
    const a = reachable(source, m.from);
    const b = reachable(source, m.to);
    if (!a || !b) return fail("INV_ERR_FAR");
    const name = a.stacks.get(m.fromSlot)?.name;
    const result = moveStack(a, b, m);
    if (result.ok) {
      drops.check(a);
      weapons.check(source);
      if (a !== b && name)
        aiLog("moves", `moved ${m.count}x ${name} from ${a.id} to ${b.id}`, {
          source,
          metadata: { item: name, count: m.count, from: a.id, to: b.id },
        });
    }
    return result;
  },
);

onClientCallback(
  EVENTS.drop,
  {
    args: ([from, slot, count]) => {
      const s = int(slot, 1, 10_000);
      const c = int(count, 1, 1_000_000);
      return typeof from === "string" && s !== null && c !== null
        ? [from, s, c]
        : null;
    },
    lock: true,
  },
  (source, from, slot, count): ActionResult => {
    const inventory = reachable(source, from);
    const stack = inventory?.stacks.get(slot);
    if (
      !inventory ||
      !stack ||
      count > stack.count ||
      inventory.kind === "drop"
    )
      return fail("INV_ERR_GONE");
    const def = content.items.get(stack.name);
    if (!def) return fail("INV_ERR_GONE");
    if (GetVehiclePedIsIn(GetPlayerPed(String(source)), false))
      return fail("INV_ERR_IN_VEHICLE");
    const p = pedCoords(source);
    const drop = drops.at(p.x, p.y, p.z);
    if (!drop.inventory.add(def, count, stack.metadata)) {
      drops.check(drop.inventory);
      return fail("INV_ERR_NO_SPACE");
    }
    inventory.setCount(slot, stack.count - count);
    weapons.check(source);
    // Nothing open next to the player's own (the ground panel): he now sees the drop, snapshot first, deltas after.
    if (!inventories.openOf(source)) {
      drops.watch(source, drop);
      emitNet(EVENTS.ground, source, drop.inventory.view());
    }
    aiLog("drops", `dropped ${count}x ${def.name}`, {
      source,
      metadata: { item: def.name, count, drop: drop.id },
    });
    return { ok: true };
  },
);

onClientCallback(
  EVENTS.give,
  {
    args: ([slot, count, target]) => {
      const s = int(slot, 1, 10_000);
      const c = int(count, 1, 1_000_000);
      const t = int(target, 1, 65_535);
      return s !== null && c !== null && t !== null ? [s, c, t] : null;
    },
    lock: true,
  },
  (source, slot, count, target): ActionResult => {
    const mine = inventories.playerOf(source);
    const theirs = inventories.playerOf(target);
    const stack = mine?.stacks.get(slot);
    if (!mine || !stack || count > stack.count) return fail("INV_ERR_GONE");
    if (!theirs || target === source) return fail("INV_ERR_NO_TARGET");
    const p = pedCoords(source);
    const q = pedCoords(target);
    if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) > GIVE_DISTANCE)
      return fail("INV_ERR_FAR");
    const def = content.items.get(stack.name);
    if (!def || !theirs.add(def, count, stack.metadata))
      return fail("INV_ERR_TARGET_FULL");
    mine.setCount(slot, stack.count - count);
    weapons.check(source);
    aiLog("gives", `gave ${count}x ${def.name}`, {
      source,
      target,
      metadata: { item: def.name, count },
    });
    return { ok: true };
  },
);
