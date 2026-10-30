import { isRecord } from "@aicore-fivem/lib/shared"
import type { Stash } from "common/content"
import { EVENTS } from "common/events"
import type { InventoryKind, Metadata, Panel, Stack } from "common/nui"
import { content } from "./content"
import { drops } from "./drops"
import type { Inventory } from "./inventory"
import { inventories } from "./registry"
import { weapons } from "./weapons"

/** The inventory API every export layer (own, ox_inventory, qb-inventory) is built on. */

/** Stashes scripts register at runtime (ox `RegisterStash`, qb `CreateInventory`), next to the panel's. */
export const scriptStashes = new Map<string, Stash>()
let temp = 0

const rowsFor = (slots: number): number =>
  Math.max(1, Math.ceil(slots / content.settings.columns))

/**
 * Finds an inventory the way scripts name one: a player source (number or numeric text), an id (`stash:x`,
 * `trunk:ABC123`), a stash name, or ox's `{ id, owner }`. Only inventories in memory are found.
 */
export function resolve(inv: unknown): Inventory | undefined {
  if (typeof inv === "number") return inventories.playerOf(inv)
  if (isRecord(inv) && typeof inv.id === "string") {
    const owner = inv.owner
    return typeof owner === "string" || typeof owner === "number"
      ? inventories.get(`stash:${inv.id}:${owner}`)
      : resolve(inv.id)
  }
  if (typeof inv !== "string") return undefined
  const asSource = Number(inv)
  if (Number.isInteger(asSource) && asSource > 0)
    return inventories.playerOf(asSource)
  return (
    inventories.get(inv) ??
    inventories.get(`stash:${inv}`) ??
    inventories.get(`trunk:${inv.toUpperCase()}`) ??
    inventories.get(`glovebox:${inv.toUpperCase()}`)
  )
}

const metaOf = (v: unknown): Metadata => (isRecord(v) ? { ...v } : {})

export function addItem(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown,
  slot?: unknown
): boolean {
  const inventory = resolve(inv)
  const def = content.items.get(name)
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 1
  if (!inventory || !def) return false
  return inventory.add(
    def,
    n,
    metaOf(metadata),
    typeof slot === "number" ? slot : undefined
  )
}

export function removeItem(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown,
  slot?: unknown
): boolean {
  const inventory = resolve(inv)
  const def = content.items.get(name)
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 1
  if (!inventory || !def) return false
  const ok = inventory.remove(
    def.name,
    n,
    isRecord(metadata) ? metadata : undefined,
    typeof slot === "number" ? slot : undefined
  )
  if (ok && inventory.kind === "player")
    for (const viewer of inventory.viewers) weapons.check(viewer)
  drops.check(inventory)
  return ok
}

export function countItem(
  inv: unknown,
  name: unknown,
  metadata?: unknown
): number {
  const inventory = resolve(inv)
  const def = content.items.get(name)
  return inventory && def
    ? inventory.count(def.name, isRecord(metadata) ? metadata : undefined)
    : 0
}

export function canCarry(
  inv: unknown,
  name: unknown,
  count: unknown,
  metadata?: unknown
): boolean {
  const inventory = resolve(inv)
  const def = content.items.get(name)
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 1
  return Boolean(
    inventory && def && inventory.planAdd(def, n, metaOf(metadata))
  )
}

/** Stacks of one item (any spelling), lowest slot first. */
export function stacksOf(
  inventory: Inventory,
  name: unknown,
  metadata?: unknown
): Stack[] {
  const def = content.items.get(name)
  if (!def) return []
  const want = isRecord(metadata) ? metadata : null
  return [...inventory.stacks.values()]
    .filter(
      (s) =>
        s.name === def.name &&
        (!want || Object.entries(want).every(([k, v]) => s.metadata[k] === v))
    )
    .sort((a, b) => a.slot - b.slot)
}

export function setMetadata(
  inv: unknown,
  slot: unknown,
  metadata: unknown
): boolean {
  const inventory = resolve(inv)
  if (!inventory || typeof slot !== "number" || !inventory.stacks.has(slot))
    return false
  inventory.setMetadata(slot, metaOf(metadata))
  return true
}

export interface StashAccess {
  /** Job -> lowest grade (0 = any grade). Empty: everyone may open it. */
  groups?: Record<string, number>
  /** Every character gets its own copy. */
  personal?: boolean
  /** One fixed owner (ox `owner = "<identifier>"`): stored as `stash:<name>:<owner>`, opened by scripts only. */
  owner?: string
  /** Where players open it; without a place only scripts open it (`forceOpenInventory`). */
  coords?: { x: number; y: number; z: number }
}

/** Registers (or updates) a script's stash and keeps it in memory so its exports find it. */
export function registerStash(
  name: string,
  label: string,
  slots: number,
  maxWeight: number,
  access: StashAccess = {}
): void {
  const { groups = {}, personal = false, owner, coords } = access
  const stash: Stash = {
    id: name,
    label,
    x: coords?.x ?? 0,
    y: coords?.y ?? 0,
    z: coords?.z ?? 0,
    radius: 3,
    jobs: Object.keys(groups),
    grades: groups,
    gangs: [],
    personal,
    size: { rows: rowsFor(slots), maxWeight },
    scriptOnly: !coords || owner !== undefined,
  }
  scriptStashes.set(name, stash)
  if (personal) return
  const id = owner === undefined ? `stash:${name}` : `stash:${name}:${owner}`
  void inventories
    .load(id, { kind: "stash", label, ...stash.size, persistent: true })
    .then((inv) => {
      inv.pinned = true
      inv.label = label
    })
}

/** A temporary inventory a script fills (`CreateTemporaryStash`, a custom drop); not stored. */
export function createTemporary(
  kind: InventoryKind,
  label: string,
  slots: number,
  maxWeight: number,
  items: Array<{ name: unknown; count: unknown; metadata?: unknown }>
): string {
  const id = `temp:${++temp}`
  const inventory = inventories.create(
    id,
    { kind, label, rows: rowsFor(slots), maxWeight, persistent: false },
    []
  )
  for (const item of items) addItem(id, item.name, item.count, item.metadata)
  inventory.dirty = false
  return id
}

/** Opens an inventory (or a shop) on the player's screen, from a script, without range checks. */
export function forceOpen(
  source: number,
  inv: unknown,
  panel: Panel | null = null
): boolean {
  if (!inventories.playerOf(source)) return false
  if (panel) {
    inventories.close(source)
    emitNet(EVENTS.forceOpen, source, null, panel)
    return true
  }
  const inventory = resolve(inv)
  if (!inventory || inventory === inventories.playerOf(source)) return false
  inventories.watch(source, inventory)
  emitNet(EVENTS.forceOpen, source, inventory.view(), null)
  return true
}

/** The item fields scripts expect (ox shape; qb reads the same names plus `amount`/`info`). */
export function itemView(stack: Stack) {
  const def = content.items.get(stack.name)
  return {
    name: stack.name,
    label: def?.label ?? stack.name,
    weight: (def?.weight ?? 0) * stack.count,
    slot: stack.slot,
    count: stack.count,
    amount: stack.count,
    metadata: stack.metadata,
    info: stack.metadata,
    stack: (def?.stack ?? 1) > 1,
    unique: (def?.stack ?? 1) === 1,
    close: def?.close ?? false,
    description: def?.description ?? "",
    type: def?.type ?? "item",
    image: def?.image ?? "",
  }
}

export function definitionView(name: string) {
  const def = content.items.get(name)
  if (!def) return null
  return {
    name: def.name,
    label: def.label,
    weight: def.weight,
    stack: def.stack > 1,
    unique: def.stack === 1,
    close: def.close,
    description: def.description,
    type: def.type,
    image: def.image,
    useable: def.usable,
  }
}
