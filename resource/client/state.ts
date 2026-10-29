import { onServerEvent } from "@aicore-fivem/lib/client";
import { EVENTS } from "common/events";
import type { InventoryView, Stack } from "common/nui";
import { content } from "./content";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Server data shapes are checked once here; the server is trusted, but msgpack can turn values into null. */
export function toStack(v: unknown): Stack | null {
  if (!isObj(v) || typeof v.slot !== "number" || typeof v.name !== "string" || typeof v.count !== "number") return null;
  return { slot: v.slot, name: v.name, count: v.count, metadata: isObj(v.metadata) ? v.metadata : {}, rotated: v.rotated === true };
}

export function toView(v: unknown): InventoryView | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.columns !== "number" || typeof v.rows !== "number" || !Array.isArray(v.stacks)) return null;
  const kind = typeof v.kind === "string" ? (v.kind as InventoryView["kind"]) : "other";
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
  private readonly listeners: Array<(id: string, put: Stack[], remove: number[], maxWeight: number) => void> = [];
  private readonly playerListeners: Array<(view: InventoryView) => void> = [];

  onDelta(listener: (id: string, put: Stack[], remove: number[], maxWeight: number) => void): void {
    this.listeners.push(listener);
  }

  onPlayer(listener: (view: InventoryView) => void): void {
    this.playerListeners.push(listener);
  }

  setPlayer(view: InventoryView): void {
    this.player = view;
    for (const listener of this.playerListeners) listener(view);
  }

  applyDelta(id: string, put: Stack[], remove: number[], maxWeight: number): void {
    if (this.player?.id === id) {
      const bySlot = new Map(this.player.stacks.map((s) => [s.slot, s]));
      for (const slot of remove) bySlot.delete(slot);
      for (const stack of put) bySlot.set(stack.slot, stack);
      this.player.stacks = [...bySlot.values()];
      this.player.maxWeight = maxWeight;
    }
    for (const listener of this.listeners) listener(id, put, remove, maxWeight);
  }

  count(name: string): number {
    const def = content.items.get(name);
    if (!def || !this.player) return 0;
    return this.player.stacks.reduce((sum, s) => sum + (s.name === def.name ? s.count : 0), 0);
  }

  /** The stack covering a cell of the player grid (0-based), for the hotbar. */
  stackAtCell(cell: number): Stack | undefined {
    const view = this.player;
    if (!view) return undefined;
    const cx = cell % view.columns;
    const cy = Math.floor(cell / view.columns);
    return view.stacks.find((s) => {
      const size = content.items.get(s.name)?.size ?? { w: 1, h: 1 };
      const w = s.rotated ? size.h : size.w;
      const h = s.rotated ? size.w : size.h;
      const x = (s.slot - 1) % view.columns;
      const y = Math.floor((s.slot - 1) / view.columns);
      return cx >= x && cx < x + w && cy >= y && cy < y + h;
    });
  }

  weight(): number {
    if (!this.player) return 0;
    return this.player.stacks.reduce((sum, s) => sum + (content.items.get(s.name)?.weight ?? 0) * s.count, 0);
  }
}

export const state = new InventoryState();

onServerEvent(EVENTS.player, { args: ([raw]) => { const view = toView(raw); return view ? [view] : null; } }, (view) => state.setPlayer(view));

onServerEvent(
  EVENTS.delta,
  {
    args: ([id, put, remove, maxWeight]) =>
      typeof id === "string" && Array.isArray(put) && Array.isArray(remove)
        ? [id, put.map(toStack).filter((s): s is Stack => s !== null), remove.filter((n): n is number => typeof n === "number"), typeof maxWeight === "number" ? maxWeight : 0]
        : null,
  },
  (id, put, remove, maxWeight) => state.applyDelta(id, put, remove, maxWeight),
);
