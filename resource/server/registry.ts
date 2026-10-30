import { every } from "@aicore-fivem/lib/server";
import type { InventoryKind, Stack } from "common/nui";
import { EVENTS } from "common/events";
import { content } from "./content";
import { Inventory } from "./inventory";
import { log } from "./log";
import { loadInventories, saveInventories } from "./repo";
import { ResourceName } from "common";

export interface InventoryShape {
  kind: InventoryKind;
  label: string;
  rows: number;
  maxWeight: number;
  persistent: boolean;
}

/** Stashes and trunks nobody looked at for this long leave memory (saved first). */
const IDLE_MS = 5 * 60_000;
const FLUSH_MS = 30_000;

/**
 * Every inventory in memory by id, the player inventory of each source, and which second inventory each player has
 * open. Loads from the database once, saves dirty ones in batches, unloads idle ones.
 */
class Inventories {
  private readonly byId = new Map<string, Inventory>();
  private readonly loading = new Map<string, Promise<Inventory>>();
  private readonly players = new Map<number, Inventory>();
  /** Player inventory id -> how many sources hold it (it leaves memory at 0). */
  private readonly holders = new Map<string, number>();
  /** source -> id of the second inventory the player has open. */
  private readonly open = new Map<number, string>();

  get(id: string): Inventory | undefined {
    return this.byId.get(id);
  }

  playerOf(source: number): Inventory | undefined {
    return this.players.get(source);
  }

  openOf(source: number): Inventory | undefined {
    const id = this.open.get(source);
    return id ? this.byId.get(id) : undefined;
  }

  get size(): number {
    return this.byId.size;
  }

  /** The inventory `id`, loading it (or creating it empty) with `shape` the first time. */
  async load(id: string, shape: InventoryShape): Promise<Inventory> {
    const existing = this.byId.get(id);
    if (existing) return existing;
    const pending = this.loading.get(id);
    if (pending) return pending;
    const promise = (
      shape.persistent ? loadInventories([id]) : Promise.resolve(new Map())
    ).then((stored) => {
      const inventory =
        this.byId.get(id) ?? this.create(id, shape, stored.get(id) ?? []);
      this.loading.delete(id);
      return inventory;
    });
    this.loading.set(id, promise);
    promise.catch(() => this.loading.delete(id));
    return promise;
  }

  /** Creates an inventory in memory now (drops, temporary stashes, or after a load). */
  create(id: string, shape: InventoryShape, stacks: Stack[]): Inventory {
    const inventory = new Inventory(
      id,
      shape.kind,
      shape.label,
      content.settings.columns,
      shape.rows,
      shape.maxWeight,
      shape.persistent,
      stacks,
    );
    inventory.dirty = false;
    this.byId.set(id, inventory);
    return inventory;
  }

  /** `stillCurrent` is asked after the load: false when the player left or switched character meanwhile. */
  async loadPlayer(
    source: number,
    charId: number,
    stillCurrent: () => boolean,
  ): Promise<void> {
    const { rows, maxWeight } = content.settings.player;
    const inventory = await this.load(`player:${charId}`, {
      kind: "player",
      label: "",
      rows,
      maxWeight,
      persistent: true,
    });
    if (!stillCurrent() || this.players.has(source)) return;
    inventory.viewers.add(source);
    this.players.set(source, inventory);
    this.holders.set(inventory.id, (this.holders.get(inventory.id) ?? 0) + 1);
    emitNet(EVENTS.player, source, inventory.view());
  }

  async unloadPlayer(source: number): Promise<void> {
    this.close(source);
    const inventory = this.players.get(source);
    if (!inventory) return;
    this.players.delete(source);
    inventory.viewers.delete(source);
    const held = (this.holders.get(inventory.id) ?? 1) - 1;
    if (held > 0) this.holders.set(inventory.id, held);
    else this.holders.delete(inventory.id);
    if (inventory.dirty) await this.save([inventory]);
    // Nobody took it again during the save: forget it (a script that had it open is told).
    if (!this.holders.has(inventory.id)) this.remove(inventory.id);
  }

  /** The player now sees `inventory` next to his own (closing what he had open). */
  watch(source: number, inventory: Inventory): void {
    this.close(source);
    inventory.viewers.add(source);
    this.open.set(source, inventory.id);
  }

  /** Stops sending the second inventory to the player. */
  close(source: number): void {
    const id = this.open.get(source);
    if (!id) return;
    this.open.delete(source);
    this.byId.get(id)?.viewers.delete(source);
  }

  /** Drops an inventory from memory (an emptied drop); its viewers are told. */
  remove(id: string): void {
    const inventory = this.byId.get(id);
    if (!inventory) return;
    for (const viewer of inventory.viewers) {
      if (this.open.get(viewer) === id) {
        this.open.delete(viewer);
        emitNet(EVENTS.forceClose, viewer);
      }
    }
    this.byId.delete(id);
  }

  /** Re-lays every inventory after the item list or the settings changed; open screens get the new layout at once. */
  rebuildAll(): void {
    const s = content.settings;
    const shapes: Partial<
      Record<InventoryKind, { rows: number; maxWeight: number }>
    > = {
      player: s.player,
      drop: s.drop,
      trunk: s.trunk,
      glovebox: s.glovebox,
    };
    for (const inventory of this.byId.values()) {
      const shape = shapes[inventory.kind] ?? inventory;
      inventory.relayout(s.columns, shape.rows, shape.maxWeight);
    }
  }

  async save(list: Inventory[]): Promise<void> {
    const dirty = list.filter((inv) => inv.persistent && inv.dirty);
    for (const inv of dirty) inv.dirty = false;
    try {
      await saveInventories(
        dirty.map((inv) => ({ id: inv.id, stacks: inv.stacks.values() })),
      );
    } catch (error) {
      for (const inv of dirty) inv.dirty = true;
      throw error;
    }
  }

  async flush(): Promise<void> {
    await this.save([...this.byId.values()]);
  }

  /** Saves and forgets stashes and trunks without viewers that were idle long enough. */
  async sweep(): Promise<void> {
    const now = Date.now();
    const idle = [...this.byId.values()].filter(
      (inv) =>
        inv.kind !== "player" &&
        inv.kind !== "drop" &&
        !inv.pinned &&
        inv.viewers.size === 0 &&
        now - inv.lastUsed > IDLE_MS,
    );
    if (idle.length === 0) return;
    await this.save(idle);
    for (const inv of idle)
      if (inv.viewers.size === 0 && !inv.dirty) this.byId.delete(inv.id);
  }
}

export const inventories = new Inventories();

const saveNow = (why: string): void => {
  inventories
    .flush()
    .catch((error: unknown) =>
      log.error(`saving inventories failed (${why})`, error),
    );
};

every(
  FLUSH_MS,
  () => {
    saveNow("interval");
    inventories
      .sweep()
      .catch((error: unknown) =>
        log.error("unloading idle inventories failed", error),
      );
  },
  { name: "flush" },
);
on("txAdmin:events:serverShuttingDown", () => saveNow("shutdown"));
on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) saveNow("resource stop");
});
