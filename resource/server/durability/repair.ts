import { notify, progressFor } from "@aifivem/lib/server";
import { fail } from "@aifivem/lib/shared";
import { Locale } from "common";
import { EVENTS, type ActionResult } from "common/events";
import type { RepairRow, Stack } from "common/nui";
import { content } from "../content";
import { inventories } from "../registry/registry";
import { using } from "../use";
import { repairWeapon } from "./api";
import { durabilityOf, repairsOf, wearKind } from "./wear";

/** The item that opens the repair menu. */
export const REPAIR_KIT = "weapon_repairkit";

const ANIM = { dict: "mini@repair", clip: "fixing_a_player", flag: 49 };

type Refusal =
  | "INV_ERR_REPAIR_OFF"
  | "INV_ERR_NO_REPAIR_KIT"
  | "INV_ERR_GONE"
  | "INV_ERR_NOT_WORN"
  | "INV_ERR_MAX_REPAIRS";

/** The weapon in `slot` when a kit may repair it now (feature on, kit carried, worn, repairs left), else why not. */
function repairable(source: number, slot: number): Stack | Refusal {
  const wear = content.settings.durability;
  const inventory = inventories.playerOf(source);
  const stack = inventory?.stacks.get(slot);
  if (!wear.enabled) return "INV_ERR_REPAIR_OFF";
  if (!inventory || inventory.count(REPAIR_KIT) < 1)
    return "INV_ERR_NO_REPAIR_KIT";
  if (!stack || wearKind(content.items.get(stack.name)) === null)
    return "INV_ERR_GONE";
  if (durabilityOf(stack.metadata) >= wear.repairPercent)
    return "INV_ERR_NOT_WORN";
  if (wear.maxRepairs > 0 && repairsOf(stack.metadata) >= wear.maxRepairs)
    return "INV_ERR_MAX_REPAIRS";
  return stack;
}

/** The player's weapons a repair would raise (below the panel's repair percent), most worn first. */
function rows(source: number): RepairRow[] {
  const inventory = inventories.playerOf(source);
  const wear = content.settings.durability;
  const out: RepairRow[] = [];
  for (const stack of inventory?.stacks.values() ?? []) {
    const def = content.items.get(stack.name);
    const durability = durabilityOf(stack.metadata);
    if (!wearKind(def) || durability >= wear.repairPercent) continue;
    const { serial, ammo } = stack.metadata;
    const repairs = repairsOf(stack.metadata);
    out.push({
      slot: stack.slot,
      label: def?.label ?? stack.name,
      durability: Math.floor(durability),
      serial: typeof serial === "string" ? serial : "-",
      ammo: typeof ammo === "number" ? ammo : 0,
      repairs,
      maxed: wear.maxRepairs > 0 && repairs >= wear.maxRepairs,
    });
  }
  return out.sort((a, b) => a.durability - b.durability);
}

/** The kit's use: the player gets the menu of weapons it can repair; the kit stays until a repair finishes. */
export function openRepairMenu(source: number): false {
  const list = content.settings.durability.enabled ? rows(source) : null;
  if (!list) notify(source, Locale("INV_ERR_REPAIR_OFF"), "error");
  else if (list.length === 0)
    notify(source, Locale("INV_ERR_NOTHING_TO_REPAIR"), "error");
  else emitNet(EVENTS.repairMenu, source, list);
  return false;
}

/** Repairs after the server-timed progress bar if the same weapon (serial) is still there; takes one kit. */
async function repair(source: number, stack: Stack): Promise<void> {
  const label = content.items.get(stack.name)?.label ?? stack.name;
  const duration = content.settings.durability.repairTime;
  using.set(source, true);
  const done =
    duration <= 0 ||
    (await progressFor(source, {
      label: Locale("INV_REPAIRING", label),
      duration,
      anim: ANIM,
      canCancel: true,
      disable: { move: true, car: true, combat: true },
    }));
  using.delete(source);
  if (!done) return;
  const now = repairable(source, stack.slot);
  if (typeof now === "string") return notify(source, Locale(now), "error");
  if (now.name !== stack.name || now.metadata.serial !== stack.metadata.serial)
    return notify(source, Locale("INV_ERR_GONE"), "error");
  if (!inventories.playerOf(source)?.remove(REPAIR_KIT, 1))
    return notify(source, Locale("INV_ERR_NO_REPAIR_KIT"), "error");
  repairWeapon(source, stack.slot);
  notify(source, Locale("INV_REPAIRED", label), "success");
}

/** A menu pick: checks now and answers at once; the repair itself follows the progress bar. */
export function startRepair(source: number, slot: number): ActionResult {
  const found = repairable(source, slot);
  if (typeof found === "string") return fail(found);
  if (using.has(source)) return fail("INV_ERR_BUSY");
  void repair(source, found);
  return { ok: true };
}
