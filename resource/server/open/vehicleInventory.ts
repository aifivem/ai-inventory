import { VEHICLE_BAGS } from "@aicore-fivem/shared";
import { normalizePlate } from "@aicore-fivem/lib/shared";
import {
  EntityState,
  optionalExport,
  plateOf,
  stateBoolean,
  stateNumber,
} from "@aicore-fivem/lib/server";
import { content } from "../content";
import type { Inventory } from "../inventory/inventory";
import { inventories } from "../registry/registry";
import { renameInventory } from "../registry/repo";

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
export async function vehicleInventory(
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

/** A vehicle entity is gone: its temporary trunk and glovebox go with it. */
export function forgetVehicle(entity: number): void {
  const ids = temporary.get(entity);
  if (!ids) return;
  temporary.delete(entity);
  for (const id of ids) inventories.remove(id);
}
