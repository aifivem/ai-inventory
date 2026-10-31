import { VEHICLE_BAGS } from "@aicore-fivem/shared";
import { asArgs, fail, normalizePlate } from "@aicore-fivem/lib/shared";
import {
  coordsOf,
  entityCoords,
  EntityState,
  isNear,
  onClientCallback,
  onClientEvent,
  online,
  optionalExport,
  plateOf,
  stateBoolean,
  stateNumber,
  vehicleFromNet,
  vehicleOf,
} from "@aicore-fivem/lib/server";
import { nearPlace } from "common/content";
import { EVENTS } from "common/events";
import { scriptShops } from "./scriptShops";
import { toOpenTarget, type OpenResult, type OpenTarget } from "common/nui";
import { setReach } from "./access";
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

/** Trunks of vehicles a vehicles resource marks as owned (`ai:owned` state bag) are stored; others are temporary. */
const owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean);
const isOwned = (vehicle: number): boolean => owned.get(vehicle) === true;
/** The owned vehicle's id in ai-vehicles (`ai:vid`): its trunk follows the vehicle, not the plate on it. */
const vehicleIds = new EntityState(VEHICLE_BAGS.id, stateNumber);

/** Entity -> ids of the temporary trunk / glovebox of an unowned vehicle (they go with the entity). */
const temporary = new Map<number, string[]>();
/** Vehicle inventory id -> its plate row move in flight; every opener waits for it before loading. */
const adopting = new Map<string, Promise<void>>();

/** The plate ai-vehicles registered for the vehicle (the one on the car may be fake), null when unknown. */
function registeredPlate(vehicleId: number): string | null {
  const plate: unknown =
    optionalExport("ai-vehicles")?.GetVehicle(vehicleId)?.plate;
  return typeof plate === "string" && plate.trim() !== ""
    ? normalizePlate(plate)
    : null;
}

/**
 * Trunks used to be stored under the plate: loading `<kind>:v<id>` from the database first moves the row stored
 * under the vehicle's registered plate (a fake plate on it changes nothing).
 */
function adoptPlateRow(
  kind: string,
  plate: string | null,
  id: string,
): Promise<void> {
  const running = adopting.get(id);
  if (running) return running;
  if (plate === null || inventories.get(id)) return Promise.resolve();
  const move = renameInventory(`${kind}:${plate}`, id).finally(() =>
    adopting.delete(id),
  );
  adopting.set(id, move);
  return move;
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
    const registered = registeredPlate(vehicleId);
    await adoptPlateRow(kind, registered, id);
    const inventory = await inventories.load(id, {
      ...shape,
      persistent: true,
    });
    inventory.label = plate;
    if (registered !== null) inventories.alias(`${kind}:${registered}`, id);
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
      if (!online.allows(source, stash.access)) return DENIED;
      const charId = online.charId(source);
      if (charId === undefined) return DENIED;
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
      const vehicle = vehicleOf(source);
      if (!vehicle) return FAR;
      const inventory = await vehicleInventory(vehicle, "glovebox");
      inventories.watch(source, inventory);
      setReach(source, () => vehicleOf(source) === vehicle);
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
      if (!online.allows(source, place.access)) return DENIED;
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
    scriptShops.close(source);
    return open(source, target);
  },
);

onClientEvent(EVENTS.close, (source) => {
  scriptShops.close(source);
  inventories.close(source);
});
