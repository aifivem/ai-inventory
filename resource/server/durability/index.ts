import { onClientCallback, registerExport } from "@aifivem/lib/server";
import { oneArg, readInt } from "@aifivem/lib/shared";
import { EVENTS } from "common/events";
import { registerUsable } from "../use";
import { getDurability, repairWeapon, setDurability } from "./api";
import { openRepairMenu, REPAIR_KIT, startRepair } from "./repair";

/** Weapon wear (spent ammo and melee hits wear the held weapon in `server/weapons.ts`) and the weapon repair kit. */

registerUsable(REPAIR_KIT, (source) => openRepairMenu(source));

onClientCallback(
  EVENTS.repair,
  { args: oneArg((v) => readInt(v, 1, 10_000)), lock: true },
  (source, slot) => startRepair(source, slot),
);

registerExport("GetDurability", (inv: unknown, slot: unknown) =>
  getDurability(inv, slot),
);
registerExport("SetDurability", (inv: unknown, slot: unknown, value: unknown) =>
  setDurability(inv, slot, value),
);
registerExport(
  "RepairWeapon",
  (inv: unknown, slot: unknown, percent?: unknown) =>
    repairWeapon(inv, slot, percent),
);
