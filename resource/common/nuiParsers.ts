import { isRecord, readId, readInt } from "@aicore-fivem/lib/shared";
import type { MoveInput, OpenTarget, Panel, ShopView } from "./nui";

/** Parsers for boundary data. */
const id = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= 96 ? v : null;

/** The equipment column's character area (screen shares 0 - 1), or null to hide the character. */
export function toPedArea(
  v: unknown,
): { x: number; top: number; bottom: number } | null {
  if (!isRecord(v) || v.show !== true) return null;
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
  if (!isRecord(v)) return null;
  const from = id(v.from);
  const to = id(v.to);
  const fromSlot = readInt(v.fromSlot, 1, 10_000);
  const toSlot = readInt(v.toSlot, 1, 10_000);
  const count = readInt(v.count, 1, 1_000_000);
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
  if (!isRecord(v)) return null;
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
      const netId = readId(v.netId);
      return netId === null ? null : { kind: "trunk", netId };
    }
    default:
      return null;
  }
}

export function toPanel(v: unknown): Panel | null {
  if (!isRecord(v) || (v.kind !== "shop" && v.kind !== "bench")) return null;
  const key = id(v.id);
  return key ? { kind: v.kind, id: key } : null;
}

/** A shop a script opened (`EVENTS.scriptShop`): label and `{ name, price }` products. */
export function toShopView(v: unknown): ShopView | null {
  if (!isRecord(v) || !Array.isArray(v.items)) return null;
  const key = id(v.id);
  if (!key || typeof v.label !== "string") return null;
  const items = (v.items as unknown[]).flatMap((row) => {
    if (!isRecord(row)) return [];
    const name = id(row.name);
    const price = readInt(row.price, 0, 1_000_000_000);
    return name && price !== null ? [{ name, price }] : [];
  });
  return { id: key, label: v.label, items };
}
