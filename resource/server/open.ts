import { VEHICLE_BAGS } from "@aicore-fivem/shared";
import { asArgs, fail } from "@aicore-fivem/lib/shared";
import {
  coordsOf,
  entityCoords,
  EntityState,
  isNear,
  onClientCallback,
  onClientEvent,
  optionalExport,
  stateBoolean,
  stateNumber,
  vehicleFromNet,
} from "@aicore-fivem/lib/server";
import { nearPlace } from "common/content";
import { EVENTS } from "common/events";
import { toOpenTarget, type OpenResult, type OpenTarget } from "common/nui";
import { allowed, charIdOf, setReach } from "./access";
import { scriptStashes } from "./api";
import { content } from "./content";
import { drops } from "./drops";
import type { Inventory } from "./inventory";
import { inventories } from "./registry";
import { renameInventory } from "./repo";

const FAR = fail("INV_ERR_FAR");
const DENIED = fail("INV_ERR_DENIED");
const GONE = fail("INV_ERR_GONE");
const TRUNK_REACH = 4;

const plateOf = (vehicle: number): string =>
  GetVehicleNumberPlateText(vehicle).trim().toUpperCase();
/** Trunks of vehicles a vehicles resource marks as owned (`ai:owned` state bag) are stored; others are temporary. */
const owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean);
const isOwned = (vehicle: number): boolean => owned.get(vehicle) === true;
/** The owned vehicle's id in ai-vehicles (`ai:vid`): its trunk follows the vehicle, not the plate on it. */
const vehicleIds = new EntityState(VEHICLE_BAGS.id, stateNumber);

/** Entity -> ids of the temporary trunk / glovebox of an unowned vehicle (they go with the entity). */
const temporary = new Map<number, string[]>();
/** Vehicle inventory ids whose plate-keyed row was already moved over this session. */
const adopted = new Set<string>();

/**
 * Trunks used to be stored under the plate: the first open of `<kind>:v<id>` moves the row stored under the
 * vehicle's registered plate (a fake plate on it changes nothing).
 */
async function adoptPlateRow(kind: string, vehicleId: number, id: string) {
  if (adopted.has(id) || inventories.get(id)) return;
  adopted.add(id);
  const registered: unknown =
    optionalExport("ai-vehicles")?.GetVehicle(vehicleId)?.plate;
  if (typeof registered === "string" && registered.trim() !== "")
    await renameInventory(`${kind}:${registered.trim().toUpperCase()}`, id);
}

/**
 * An owned vehicle's trunk or glovebox is stored under its vehicle id (`trunk:v12`), so a fake or changed plate
 * keeps the same items; an owned vehicle without an id (another vehicles resource) uses its plate. Any other
 * vehicle gets a temporary one tied to the entity, so it never takes or shadows a stored one with the same plate.
 */
async function vehicleInventory(
  vehicle: number,
  kind: "trunk" | "glovebox",
): Promise<Inventory> {
  const plate = plateOf(vehicle);
  const shape = { kind, label: plate, ...content.settings[kind] };
  if (isOwned(vehicle)) {
    const vehicleId = vehicleIds.get(vehicle);
    if (vehicleId === undefined)
      return inventories.load(`${kind}:${plate}`, {
        ...shape,
        persistent: true,
      });
    const id = `${kind}:v${vehicleId}`;
    await adoptPlateRow(kind, vehicleId, id);
    const inventory = await inventories.load(id, {
      ...shape,
      persistent: true,
    });
    inventory.label = plate;
    inventories.alias(`${kind}:${plate}`, id);
    return inventory;
  }
  const id = `${kind}:tmp:${vehicle}`;
  const ids = temporary.get(vehicle) ?? [];
  if (!ids.includes(id)) temporary.set(vehicle, [...ids, id]);
  return inventories.load(id, { ...shape, persistent: false });
}

on("entityRemoved", (entity: number) => {
  const ids = temporary.get(entity);
  if (!ids) return;
  temporary.delete(entity);
  for (const id of ids) inventories.remove(id);
});

async function open(source: number, target: OpenTarget): Promise<OpenResult> {
  switch (target.kind) {
    case "self":
      inventories.close(source);
      return { ok: true, other: null, panel: null };
    case "drop": {
      const drop = drops.get(target.id);
      if (!drop) return GONE;
      if (!isNear(source, drop, 3)) return FAR;
      drops.watch(source, drop);
      return { ok: true, other: drop.inventory.view(), panel: null };
    }
    case "stash": {
      const stash =
        content.stashes.get(target.id) ?? scriptStashes.get(target.id);
      const p = coordsOf(source);
      if (!stash || stash.scriptOnly || !nearPlace(stash, p.x, p.y, p.z))
        return FAR;
      if (!allowed(source, stash)) return DENIED;
      const charId = charIdOf(source);
      if (charId === null) return DENIED;
      const id = stash.personal
        ? `stash:${stash.id}:${charId}`
        : `stash:${stash.id}`;
      const inventory = await inventories.load(id, {
        kind: "stash",
        label: stash.label,
        ...stash.size,
        persistent: true,
      });
      inventory.label = stash.label;
      inventories.watch(source, inventory);
      setReach(source, () => {
        const q = coordsOf(source);
        return nearPlace(stash, q.x, q.y, q.z, 2);
      });
      return { ok: true, other: inventory.view(), panel: null };
    }
    case "trunk": {
      const vehicle = vehicleFromNet(target.netId);
      if (!vehicle) return GONE;
      if (!isNear(source, entityCoords(vehicle), TRUNK_REACH + 2)) return FAR;
      if (GetVehicleDoorLockStatus(vehicle) >= 2) return fail("INV_ERR_LOCKED");
      const inventory = await vehicleInventory(vehicle, "trunk");
      inventories.watch(source, inventory);
      setReach(
        source,
        () =>
          DoesEntityExist(vehicle) &&
          isNear(source, entityCoords(vehicle), TRUNK_REACH + 3),
      );
      return { ok: true, other: inventory.view(), panel: null };
    }
    case "glovebox": {
      const vehicle = GetVehiclePedIsIn(GetPlayerPed(String(source)), false);
      if (!vehicle) return FAR;
      const inventory = await vehicleInventory(vehicle, "glovebox");
      inventories.watch(source, inventory);
      setReach(
        source,
        () =>
          GetVehiclePedIsIn(GetPlayerPed(String(source)), false) === vehicle,
      );
      return { ok: true, other: inventory.view(), panel: null };
    }
    case "shop":
    case "bench": {
      const place =
        target.kind === "shop"
          ? content.shops.get(target.id)
          : content.benches.get(target.id);
      const p = coordsOf(source);
      if (!place || !nearPlace(place, p.x, p.y, p.z)) return FAR;
      if (!allowed(source, place)) return DENIED;
      inventories.close(source);
      return {
        ok: true,
        other: null,
        panel: { kind: target.kind, id: place.id },
      };
    }
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

onClientCallback(
  EVENTS.open,
  { args: ([raw]) => asArgs(toOpenTarget(raw)), lock: true },
  (source, target) => {
    if (!inventories.playerOf(source)) return fail("INV_ERR_BUSY");
    return open(source, target);
  },
);

onClientEvent(EVENTS.close, (source) => inventories.close(source));
