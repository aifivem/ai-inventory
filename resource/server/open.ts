import { asArgs } from "@aicore-fivem/lib/shared"
import { onClientCallback, onClientEvent } from "@aicore-fivem/lib/server"
import { nearPlace } from "common/content"
import { EVENTS } from "common/events"
import { toOpenTarget, type OpenResult, type OpenTarget } from "common/nui"
import { allowed, charIdOf, distanceTo, pedCoords, setReach } from "./access"
import { scriptStashes } from "./api"
import { content } from "./content"
import { drops } from "./drops"
import { inventories } from "./registry"

const FAR: OpenResult = { ok: false, error: "INV_ERR_FAR" }
const DENIED: OpenResult = { ok: false, error: "INV_ERR_DENIED" }
const TRUNK_REACH = 4

const plateOf = (vehicle: number): string =>
  GetVehicleNumberPlateText(vehicle).trim().toUpperCase()
/** Trunks of vehicles a vehicles resource marks as owned (`ai:owned` state bag) are stored; others are temporary. */
const isOwned = (vehicle: number): boolean =>
  Entity(vehicle).state["ai:owned"] === true

async function open(source: number, target: OpenTarget): Promise<OpenResult> {
  switch (target.kind) {
    case "self":
      inventories.close(source)
      return { ok: true, other: null, panel: null }
    case "drop": {
      const drop = drops.get(target.id)
      if (!drop) return { ok: false, error: "INV_ERR_GONE" }
      if (distanceTo(source, drop.x, drop.y, drop.z) > 3) return FAR
      inventories.watch(source, drop.inventory)
      setReach(source, () => distanceTo(source, drop.x, drop.y, drop.z) <= 4)
      return { ok: true, other: drop.inventory.view(), panel: null }
    }
    case "stash": {
      const stash =
        content.stashes.get(target.id) ?? scriptStashes.get(target.id)
      const p = pedCoords(source)
      if (!stash || stash.scriptOnly || !nearPlace(stash, p.x, p.y, p.z))
        return FAR
      if (!allowed(source, stash)) return DENIED
      const charId = charIdOf(source)
      if (charId === null) return DENIED
      const id = stash.personal
        ? `stash:${stash.id}:${charId}`
        : `stash:${stash.id}`
      const inventory = await inventories.load(id, {
        kind: "stash",
        label: stash.label,
        ...stash.size,
        persistent: true,
      })
      inventory.label = stash.label
      inventories.watch(source, inventory)
      setReach(source, () => {
        const q = pedCoords(source)
        return nearPlace(stash, q.x, q.y, q.z, 2)
      })
      return { ok: true, other: inventory.view(), panel: null }
    }
    case "trunk": {
      const vehicle = NetworkGetEntityFromNetworkId(target.netId)
      if (!vehicle || !DoesEntityExist(vehicle) || GetEntityType(vehicle) !== 2)
        return { ok: false, error: "INV_ERR_GONE" }
      const [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle)
      if (distanceTo(source, vx, vy, vz) > TRUNK_REACH + 2) return FAR
      if (GetVehicleDoorLockStatus(vehicle) >= 2)
        return { ok: false, error: "INV_ERR_LOCKED" }
      const plate = plateOf(vehicle)
      const inventory = await inventories.load(`trunk:${plate}`, {
        kind: "trunk",
        label: plate,
        ...content.settings.trunk,
        persistent: isOwned(vehicle),
      })
      inventories.watch(source, inventory)
      setReach(source, () => {
        if (!DoesEntityExist(vehicle)) return false
        const [x = 0, y = 0, z = 0] = GetEntityCoords(vehicle)
        return distanceTo(source, x, y, z) <= TRUNK_REACH + 3
      })
      return { ok: true, other: inventory.view(), panel: null }
    }
    case "glovebox": {
      const vehicle = GetVehiclePedIsIn(GetPlayerPed(String(source)), false)
      if (!vehicle) return FAR
      const plate = plateOf(vehicle)
      const inventory = await inventories.load(`glovebox:${plate}`, {
        kind: "glovebox",
        label: plate,
        ...content.settings.glovebox,
        persistent: isOwned(vehicle),
      })
      inventories.watch(source, inventory)
      setReach(
        source,
        () => GetVehiclePedIsIn(GetPlayerPed(String(source)), false) === vehicle
      )
      return { ok: true, other: inventory.view(), panel: null }
    }
    case "shop":
    case "bench": {
      const place =
        target.kind === "shop"
          ? content.shops.get(target.id)
          : content.benches.get(target.id)
      const p = pedCoords(source)
      if (!place || !nearPlace(place, p.x, p.y, p.z)) return FAR
      if (!allowed(source, place)) return DENIED
      inventories.close(source)
      return {
        ok: true,
        other: null,
        panel: { kind: target.kind, id: place.id },
      }
    }
    default: {
      const _exhaustive: never = target
      return _exhaustive
    }
  }
}

onClientCallback(
  EVENTS.open,
  { args: ([raw]) => asArgs(toOpenTarget(raw)), lock: true },
  (source, target) => {
    if (!inventories.playerOf(source))
      return { ok: false, error: "INV_ERR_BUSY" }
    return open(source, target)
  }
)

onClientEvent(EVENTS.close, (source) => inventories.close(source))
