import type { ClothesState } from "./clothes";
/** Wire and NUI contract of ai-inventory: shapes sent between server, client and the screen. No natives. */

export type Metadata = Record<string, unknown>;

export interface Stack {
  slot: number;
  name: string;
  count: number;
  metadata: Metadata;
  rotated: boolean;
}

export type InventoryKind =
  "player" | "drop" | "stash" | "trunk" | "glovebox" | "temp" | "other";

export interface InventoryView {
  id: string;
  kind: InventoryKind;
  label: string;
  columns: number;
  rows: number;
  maxWeight: number;
  stacks: Stack[];
}

/** What sits next to the player inventory when it is not another inventory. */
export type Panel =
  { kind: "shop"; id: string } | { kind: "bench"; id: string };

export type OpenTarget =
  | { kind: "self" }
  | { kind: "drop"; id: string }
  | { kind: "stash"; id: string }
  | { kind: "trunk"; netId: number }
  | { kind: "glovebox" }
  | { kind: "shop"; id: string }
  | { kind: "bench"; id: string };

export type OpenResult =
  | { ok: true; other: InventoryView | null; panel: Panel | null }
  | { ok: false; error: string };

export interface MoveInput {
  from: string;
  fromSlot: number;
  to: string;
  toSlot: number;
  count: number;
  rotated: boolean;
}

export interface DropPoint {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface EquippedWeapon {
  slot: number;
  name: string;
  ammo: number;
  components: string[];
}

export interface PendingUse {
  token: number;
  name: string;
  anim: string;
  time: number;
}

/** Item fields the screen needs (from the panel's item list). */
export interface ItemView {
  name: string;
  label: string;
  description: string;
  weight: number;
  w: number;
  h: number;
  stack: number;
  type: string;
  usable: boolean;
  image: string;
  /** Attachment items: the GTA component names they can be. */
  hashes: string[];
  /** The rarity's colour (`#rrggbb`), "" = none: the tile takes it. */
  rarity: string;
}

export interface ShopView {
  id: string;
  label: string;
  items: Array<{ name: string; price: number }>;
}

export interface BenchView {
  id: string;
  label: string;
  recipes: Array<{
    result: string;
    count: number;
    time: number;
    ingredients: Array<{ name: string; count: number }>;
  }>;
}

/** Client -> NUI messages. */
export type NuiMessage =
  | {
      action: "setup";
      data: { texts: Record<string, string>; items: ItemView[] };
    }
  | { action: "items"; data: ItemView[] }
  | { action: "player"; data: InventoryView }
  | {
      action: "open";
      data: {
        other: InventoryView | null;
        shop: ShopView | null;
        bench: BenchView | null;
        /** The open key as bound now: the screen closes on it too. */
        key: string;
      };
    }
  | {
      action: "delta";
      data: { id: string; put: Stack[]; remove: number[]; maxWeight: number };
    }
  | { action: "profile"; data: { name: string; clothes: ClothesState } }
  | { action: "close"; data: null }
  /** The quick slots bar at the bottom while the inventory is closed (Tab). */
  | { action: "hotbar"; data: boolean }
  | { action: "otherClosed"; data: null };

/** NUI -> client callbacks (fetchNui names). */
export const NUI = {
  close: "close",
  move: "move",
  use: "use",
  give: "give",
  drop: "drop",
  buy: "buy",
  craft: "craft",
  detach: "detach",
  clothes: "clothes",
  worldPed: "worldPed",
} as const;

/** Parsers for boundary data. */
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max
    ? v
    : null;
const id = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= 96 ? v : null;

/** The equipment column's character area (screen shares 0 - 1), or null to hide the character. */
export function toPedArea(
  v: unknown,
): { x: number; top: number; bottom: number } | null {
  if (!isObj(v) || v.show !== true) return null;
  const share = (n: unknown): number | null =>
    typeof n === "number" && n >= 0 && n <= 1 ? n : null;
  const x = share(v.x);
  const top = share(v.top);
  const bottom = share(v.bottom);
  if (x === null || top === null || bottom === null || bottom <= top)
    return null;
  return { x, top, bottom };
}

export function toMoveInput(v: unknown): MoveInput | null {
  if (!isObj(v)) return null;
  const from = id(v.from);
  const to = id(v.to);
  const fromSlot = int(v.fromSlot, 1, 10_000);
  const toSlot = int(v.toSlot, 1, 10_000);
  const count = int(v.count, 1, 1_000_000);
  if (
    !from ||
    !to ||
    fromSlot === null ||
    toSlot === null ||
    count === null ||
    typeof v.rotated !== "boolean"
  )
    return null;
  return { from, to, fromSlot, toSlot, count, rotated: v.rotated };
}

export function toOpenTarget(v: unknown): OpenTarget | null {
  if (!isObj(v)) return null;
  switch (v.kind) {
    case "self":
    case "glovebox":
      return { kind: v.kind };
    case "drop":
    case "stash":
    case "shop":
    case "bench": {
      const key = id(v.id);
      return key ? { kind: v.kind, id: key } : null;
    }
    case "trunk": {
      const netId = int(v.netId, 1, 0xffff_ffff);
      return netId === null ? null : { kind: "trunk", netId };
    }
    default:
      return null;
  }
}

export function toPanel(v: unknown): Panel | null {
  if (!isObj(v) || (v.kind !== "shop" && v.kind !== "bench")) return null;
  const key = id(v.id);
  return key ? { kind: v.kind, id: key } : null;
}
