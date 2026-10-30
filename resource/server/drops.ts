import { EVENTS } from "common/events"
import type { DropPoint } from "common/nui"
import { content } from "./content"
import type { Inventory } from "./inventory"
import { inventories } from "./registry"

/** A drop within this distance of the player takes new items instead of a second drop next to it. */
const MERGE_DISTANCE = 1.5

class Drop {
  constructor(
    readonly id: string,
    readonly x: number,
    readonly y: number,
    readonly z: number,
    readonly inventory: Inventory
  ) {}

  point(): DropPoint {
    return { id: this.id, x: this.x, y: this.y, z: this.z }
  }
}

/**
 * Items on the ground: temporary inventories with a point. Every client knows the points (they are world objects,
 * so they go to everyone: one snapshot at load, then put / remove). Empty drops go at once, others after the
 * panel's despawn time without changes. Never stored.
 */
class Drops {
  private readonly byId = new Map<string, Drop>()
  private next = 0

  get(id: string): Drop | undefined {
    return this.byId.get(id)
  }

  /** The drop the player stands at, or a new one at his feet. */
  at(x: number, y: number, z: number): Drop {
    for (const drop of this.byId.values())
      if (Math.hypot(drop.x - x, drop.y - y, drop.z - z) <= MERGE_DISTANCE)
        return drop
    const id = `drop:${++this.next}`
    const { rows, maxWeight } = content.settings.drop
    const inventory = inventories.create(
      id,
      { kind: "drop", label: "", rows, maxWeight, persistent: false },
      []
    )
    const drop = new Drop(id, x, y, z - 0.95, inventory)
    this.byId.set(id, drop)
    emitNet(EVENTS.dropPut, -1, drop.point())
    return drop
  }

  /** Removes the drop when it became empty (called after every action that took from one). */
  check(inventory: Inventory | null | undefined): void {
    if (inventory?.kind === "drop" && inventory.stacks.size === 0)
      this.remove(inventory.id)
  }

  remove(id: string): void {
    if (!this.byId.delete(id)) return
    inventories.remove(id)
    emitNet(EVENTS.dropRemove, -1, id)
  }

  points(): DropPoint[] {
    return [...this.byId.values()].map((drop) => drop.point())
  }

  /** Drops nobody changed for the despawn time disappear with their items. */
  sweep(): void {
    const limit = content.settings.drop.despawnMinutes * 60_000
    const now = Date.now()
    for (const drop of this.byId.values())
      if (
        drop.inventory.viewers.size === 0 &&
        now - drop.inventory.lastUsed > limit
      )
        this.remove(drop.id)
  }

  get size(): number {
    return this.byId.size
  }
}

export const drops = new Drops()

setInterval(() => drops.sweep(), 60_000)
