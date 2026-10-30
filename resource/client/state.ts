import { isRecord } from "@aicore-fivem/lib/shared";
import { onServerEvent } from "@aicore-fivem/lib/client";
import { EVENTS } from "common/events";
import type { InventoryView, Stack } from "common/nui";
import { content } from "./content";

/** Server data shapes are checked once here; the server is trusted, but msgpack can turn values into null. */
export function toStack(v: unknown): Stack | null {
  if (
    !isRecord(v) ||
    typeof v.slot !== "number" ||
    typeof v.name !== "string" ||
    typeof v.count !== "number"
  )
    return null;
  return {
    slot: v.slot,
    name: v.name,
    count: v.count,
    metadata: isRecord(v.metadata) ? v.metadata : {},
    rotated: v.rotated === true,
  };
}

export function toView(v: unknown): InventoryView | null {
  if (
    !isRecord(v) ||
    typeof v.id !== "string" ||
    typeof v.columns !== "number" ||
    typeof v.rows !== "number" ||
    !Array.isArray(v.stacks)
  )
    return null;
  const kind =
    typeof v.kind === "string" ? (v.kind as InventoryView["kind"]) : "other";
  return {
    id: v.id,
    kind,
    label: typeof v.label === "string" ? v.label : "",
    columns: v.columns,
    rows: v.rows,
    maxWeight: typeof v.maxWeight === "number" ? v.maxWeight : 0,
    stacks: v.stacks.map(toStack).filter((s): s is Stack => s !== null),
  };
}

/**
 * The player's own inventory as the server sent it (snapshot at load, then deltas), and the id of the second one the
 * screen shows. Exports and the hotbar read from here; listeners forward deltas to the NUI.
 */
class InventoryState {
  player: InventoryView | null = null;
  otherId: string | null = null;
  private readonly listeners: Array<
    (id: string, put: Stack[], remove: number[], maxWeight: number) => void
  > = [];
  private readonly playerListeners: Array<(view: InventoryView) => void> = [];
  private readonly layoutListeners: Array<
    (id: string, columns: number, rows: number, maxWeight: number) => void
  > = [];

  onDelta(
    listener: (
      id: string,
      put: Stack[],
      remove: number[],
      maxWeight: number,
    ) => void,
  ): void {
    this.listeners.push(listener);
  }

  onPlayer(listener: (view: InventoryView) => void): void {
    this.playerListeners.push(listener);
  }

  setPlayer(view: InventoryView): void {
    this.player = view;
    for (const listener of this.playerListeners) listener(view);
  }

  applyDelta(
    id: string,
    put: Stack[],
    remove: number[],
    maxWeight: number,
  ): void {
    if (this.player?.id === id) {
      const bySlot = new Map(this.player.stacks.map((s) => [s.slot, s]));
      for (const slot of remove) bySlot.delete(slot);
      for (const stack of put) bySlot.set(stack.slot, stack);
      this.player.stacks = [...bySlot.values()];
      this.player.maxWeight = maxWeight;
    }
    for (const listener of this.listeners) listener(id, put, remove, maxWeight);
  }

  /** The panel changed an inventory's columns, rows or weight limit. */
  applyLayout(
    id: string,
    columns: number,
    rows: number,
    maxWeight: number,
  ): void {
    if (this.player?.id === id)
      Object.assign(this.player, { columns, rows, maxWeight });
    for (const listener of this.layoutListeners)
      listener(id, columns, rows, maxWeight);
  }

  onLayout(
    listener: (
      id: string,
      columns: number,
      rows: number,
      maxWeight: number,
    ) => void,
  ): void {
    this.layoutListeners.push(listener);
  }

  count(name: string): number {
    const def = content.items.get(name);
    if (!def || !this.player) return 0;
    return this.player.stacks.reduce(
      (sum, s) => sum + (s.name === def.name ? s.count : 0),
      0,
    );
  }

  weight(): number {
    if (!this.player) return 0;
    return this.player.stacks.reduce(
      (sum, s) => sum + (content.items.get(s.name)?.weight ?? 0) * s.count,
      0,
    );
  }
}

export const state = new InventoryState();

onServerEvent(
  EVENTS.player,
  {
    args: ([raw]) => {
      const view = toView(raw);
      return view ? [view] : null;
    },
  },
  (view) => state.setPlayer(view),
);

onServerEvent(
  EVENTS.delta,
  {
    args: ([id, put, remove, maxWeight]) =>
      typeof id === "string" && Array.isArray(put) && Array.isArray(remove)
        ? [
            id,
            put.map(toStack).filter((s): s is Stack => s !== null),
            remove.filter((n): n is number => typeof n === "number"),
            typeof maxWeight === "number" ? maxWeight : 0,
          ]
        : null,
  },
  (id, put, remove, maxWeight) => state.applyDelta(id, put, remove, maxWeight),
);

onServerEvent(
  EVENTS.layout,
  {
    args: ([id, columns, rows, maxWeight]) =>
      typeof id === "string" &&
      typeof columns === "number" &&
      typeof rows === "number" &&
      typeof maxWeight === "number"
        ? [id, columns, rows, maxWeight]
        : null,
  },
  (id, columns, rows, maxWeight) =>
    state.applyLayout(id, columns, rows, maxWeight),
);
