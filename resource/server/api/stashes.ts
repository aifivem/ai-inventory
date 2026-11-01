import type { Stash } from "common/places";
import type { InventoryKind } from "common/nui";
import { content } from "../content";
import { inventories } from "../registry/registry";
import { addItem } from "./items";

/** Stashes scripts register at runtime (ox `RegisterStash`, qb `CreateInventory`), next to the panel's. */
export const scriptStashes = new Map<string, Stash>();
let temp = 0;

const rowsFor = (slots: number): number =>
  Number.isFinite(slots)
    ? Math.min(200, Math.max(1, Math.ceil(slots / content.settings.columns)))
    : 1;

export interface StashAccess {
  /** Job -> lowest grade (0 = any grade). Empty: everyone may open it. */
  groups?: Record<string, number>;
  /** Every character gets its own copy. */
  personal?: boolean;
  /** One fixed owner (ox `owner = "<identifier>"`): stored as `stash:<name>:<owner>`, opened by scripts only. */
  owner?: string;
  /** Where players open it; without a place only scripts open it (`forceOpenInventory`). */
  coords?: { x: number; y: number; z: number };
}

/** Registers (or updates) a script's stash and keeps it in memory so its exports find it. */
export function registerStash(
  name: string,
  label: string,
  slots: number,
  maxWeight: number,
  access: StashAccess = {},
): void {
  const { groups = {}, personal = false, owner, coords } = access;
  const stash: Stash = {
    id: name,
    label,
    x: coords?.x ?? 0,
    y: coords?.y ?? 0,
    z: coords?.z ?? 0,
    radius: 3,
    access: {
      jobs: Object.keys(groups),
      gangs: [],
      grades: groups,
      onDuty: false,
    },
    personal,
    size: { rows: rowsFor(slots), maxWeight },
    scriptOnly: !coords || owner !== undefined,
  };
  scriptStashes.set(name, stash);
  if (personal) return;
  const id = owner === undefined ? `stash:${name}` : `stash:${name}:${owner}`;
  void inventories
    .load(id, { kind: "stash", label, ...stash.size, persistent: true })
    .then((inv) => {
      inv.pinned = true;
      inv.label = label;
    });
}

/** A temporary inventory a script fills (`CreateTemporaryStash`, a custom drop); not stored. */
export function createTemporary(
  kind: InventoryKind,
  label: string,
  slots: number,
  maxWeight: number,
  items: Array<{ name: unknown; count: unknown; metadata?: unknown }>,
): string {
  const id = `temp:${++temp}`;
  const inventory = inventories.create(
    id,
    { kind, label, rows: rowsFor(slots), maxWeight, persistent: false },
    [],
  );
  for (const item of items) addItem(id, item.name, item.count, item.metadata);
  inventory.dirty = false;
  return id;
}
