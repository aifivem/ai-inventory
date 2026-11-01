import { fail } from "@aicore-fivem/lib/shared";
import {
  coordsOf,
  entityCoords,
  isNear,
  online,
  vehicleFromNet,
  vehicleOf,
} from "@aicore-fivem/lib/server";
import { nearPlace } from "common/places";
import type { OpenResult, OpenTarget } from "common/nui";
import { setReach } from "../access";
import { scriptStashes } from "../api/stashes";
import { content } from "../content";
import { drops } from "../drops";
import { inventories } from "../registry/registry";
import { vehicleInventory } from "./vehicleInventory";

const FAR = fail("INV_ERR_FAR");
const DENIED = fail("INV_ERR_DENIED");
const GONE = fail("INV_ERR_GONE");
const TRUNK_REACH = 4;

/** Opens what the player asked for next to his own inventory, after range and access checks. */
export async function open(
  source: number,
  target: OpenTarget,
): Promise<OpenResult> {
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
