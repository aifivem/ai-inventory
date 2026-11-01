import type { InventoryKind } from "common/nui";

/** What a new inventory is made with (kind, label, rows, weight limit, stored or not). */
export interface InventoryShape {
  kind: InventoryKind;
  label: string;
  rows: number;
  maxWeight: number;
  persistent: boolean;
}
