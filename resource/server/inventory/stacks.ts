import type { ItemDef } from "common/items";
import type { Metadata } from "common/nui";

/** JSON text with the keys of every object sorted, at every depth (equal data gives equal text whatever the key order). */
function canonical(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((v) => (v === undefined || typeof v === "function" ? "null" : canonical(v))).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined && typeof v !== "function")
        parts.push(`${JSON.stringify(key)}:${canonical(v)}`);
    }
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Stable text of metadata for "same stack" checks: nested objects count, key order does not ("" = none). */
export function metaKey(metadata: Metadata): string {
  const text = canonical(metadata);
  return text === "{}" ? "" : text;
}

/** A serial ties the held weapon to its stack while it moves around the grid. */
export function ensureSerial(
  def: ItemDef,
  metadata: Record<string, unknown>,
): void {
  if (
    def.type === "weapon" &&
    !def.weapon?.throwable &&
    typeof metadata.serial !== "string"
  ) {
    metadata.serial = Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}

/** An item's cells (1 x 1 for an unknown item). */
export const sizeOf = (def: ItemDef | undefined): { w: number; h: number } =>
  def?.size ?? { w: 1, h: 1 };
