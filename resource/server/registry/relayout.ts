import type { InventoryKind } from "common/nui";
import { content } from "../content";
import type { Inventory } from "../inventory/inventory";

/** Re-lays every inventory after the item list or the settings changed; open screens get the new layout at once. */
export function relayoutAll(list: Iterable<Inventory>): void {
  const s = content.settings;
  const shapes: Partial<
    Record<InventoryKind, { rows: number; maxWeight: number }>
  > = {
    player: s.player,
    drop: s.drop,
    trunk: s.trunk,
    glovebox: s.glovebox,
  };
  for (const inventory of list) {
    const shape = shapes[inventory.kind] ?? inventory;
    inventory.relayout(s.columns, shape.rows, shape.maxWeight);
  }
}
