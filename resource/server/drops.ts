import { Cooldowns, every, isNear } from "@aicore-fivem/lib/server";
import type { DropPoint } from "common/nui";
import { charIdOf, setReach } from "./access";
import { content } from "./content";
import { cellOf, DropAreas, keyOf, type AreaDrop } from "./dropAreas";
import type { Inventory } from "./inventory";
import { inventories } from "./registry";

/** A drop within this distance of the player takes new items instead of a second drop next to it. */
const MERGE_DISTANCE = 1.5;
/** How often players' cells are checked while any drop exists. */
const FOLLOW_MS = 2000;
/** Live drops in one 64 m cell; a full cell refuses new player drops (a crowd dumping items in one spot). */
const MAX_PER_CELL = 50;
/** One new drop per player per this time (adding to an existing one is free). */
const NEW_DROP_MS = 1000;

class Drop implements AreaDrop {
  readonly known = new Set<number>();

  constructor(
    readonly id: string,
    readonly x: number,
    readonly y: number,
    readonly z: number,
    readonly cell: number,
    /** The character that made it (per-player cap), null for scripts and crafting. */
    readonly owner: number | null,
    readonly inventory: Inventory,
  ) {}

  point(): DropPoint {
    return { id: this.id, x: this.x, y: this.y, z: this.z };
  }
}

/**
 * Items on the ground: temporary inventories with a point, never stored. Clients know only the drops around them
 * (`DropAreas`). New drops are limited per player (rate, the panel's live cap) and per cell. Empty drops go at once,
 * others after the panel's despawn time without changes.
 */
class Drops {
  private readonly byId = new Map<string, Drop>();
  private readonly areas = new DropAreas<Drop>();
  /** Live drops per character (the panel's per-player cap). */
  private readonly perOwner = new Map<number, number>();
  private readonly newDrop = new Cooldowns();
  private next = 0;

  get(id: string): Drop | undefined {
    return this.byId.get(id);
  }

  get size(): number {
    return this.byId.size;
  }

  /** The drop within merge distance of a point, if any. */
  near(x: number, y: number, z: number): Drop | undefined {
    for (const drop of this.areas.around(x, y))
      if (Math.hypot(drop.x - x, drop.y - y, drop.z - z) <= MERGE_DISTANCE)
        return drop;
    return undefined;
  }

  /** Why the player may not make a new drop at a point now (a lang key), or null: own cap, full cell, rate. */
  refusal(source: number, x: number, y: number): string | null {
    const charId = charIdOf(source);
    if (
      charId !== null &&
      (this.perOwner.get(charId) ?? 0) >= content.settings.drop.maxPerPlayer
    )
      return "INV_ERR_DROP_LIMIT";
    if ((this.areas.at(keyOf(cellOf(x), cellOf(y)))?.size ?? 0) >= MAX_PER_CELL)
      return "INV_ERR_DROP_LIMIT";
    return this.newDrop.take(source, NEW_DROP_MS) ? null : "INV_ERR_TOO_FAST";
  }

  /** A new drop at a player's feet (`z` is the ped's height); players around it learn its point. */
  create(x: number, y: number, z: number, owner: number | null): Drop {
    const id = `drop:${++this.next}`;
    const { rows, maxWeight } = content.settings.drop;
    const inventory = inventories.create(
      id,
      { kind: "drop", label: "", rows, maxWeight, persistent: false },
      [],
    );
    const cell = keyOf(cellOf(x), cellOf(y));
    const drop = new Drop(id, x, y, z - 0.95, cell, owner, inventory);
    this.byId.set(id, drop);
    if (owner !== null)
      this.perOwner.set(owner, (this.perOwner.get(owner) ?? 0) + 1);
    this.areas.add(drop);
    return drop;
  }

  /** The player sees the drop next to his own inventory while he stays within reach of it. */
  watch(source: number, drop: Drop): void {
    inventories.watch(source, drop.inventory);
    setReach(source, () => isNear(source, drop, 4));
  }

  /** Removes the drop when it became empty (called after every action that took from one). */
  check(inventory: Inventory | null | undefined): void {
    if (inventory?.kind === "drop" && inventory.stacks.size === 0)
      this.remove(inventory.id);
  }

  remove(id: string): void {
    const drop = this.byId.get(id);
    if (!drop) return;
    this.byId.delete(id);
    if (drop.owner !== null) {
      const left = (this.perOwner.get(drop.owner) ?? 1) - 1;
      if (left > 0) this.perOwner.set(drop.owner, left);
      else this.perOwner.delete(drop.owner);
    }
    inventories.remove(id);
    this.areas.delete(drop);
  }

  /** A character entered the world: his client gets the drops around him. */
  start(source: number): void {
    this.areas.start(source);
  }

  /** The character left (logout, switch, drop). */
  stop(source: number): void {
    this.areas.stop(source);
  }

  /** Checks every loaded player's cell (bench and timer). */
  followAll(): void {
    this.areas.followAll();
  }

  /** Drops nobody changed for the despawn time disappear with their items. */
  sweep(): void {
    const limit = content.settings.drop.despawnMinutes * 60_000;
    const now = Date.now();
    for (const drop of this.byId.values())
      if (
        drop.inventory.viewers.size === 0 &&
        now - drop.inventory.lastUsed > limit
      )
        this.remove(drop.id);
  }
}

export const drops = new Drops();

every(60_000, () => drops.sweep(), { name: "dropSweep" });
every(
  FOLLOW_MS,
  () => {
    if (drops.size > 0) drops.followAll();
  },
  { name: "dropFollow" },
);
