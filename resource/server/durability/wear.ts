import { round } from "@aifivem/lib/shared";
import type { ItemDef } from "common/items";
import type { Metadata } from "common/nui";
import type { Durability } from "common/settings";

/** How a weapon wears: firearms by the shots they fire, melee weapons by their hits; throwables never. */
export function wearKind(def: ItemDef | undefined): "firearm" | "melee" | null {
  const weapon = def?.weapon;
  if (!weapon || weapon.throwable) return null;
  return weapon.ammo !== "" ? "firearm" : "melee";
}

/** Durability 0-100 from metadata; a weapon without the key counts as new (100). */
export function durabilityOf(metadata: Metadata): number {
  const value = metadata.durability;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 100;
}

export const repairsOf = (metadata: Metadata): number =>
  typeof metadata.repairs === "number" &&
  Number.isInteger(metadata.repairs) &&
  metadata.repairs > 0
    ? metadata.repairs
    : 0;

/** Durability after `units` more shots or hits: the item's `uses` (else the panel's default) take it from 100 to 0. */
export function worn(
  def: ItemDef,
  metadata: Metadata,
  units: number,
  wear: Durability,
): number {
  const uses =
    def.weapon?.uses || (wearKind(def) === "melee" ? wear.hits : wear.shots);
  return Math.max(0, round(durabilityOf(metadata) - (units * 100) / uses, 3));
}

/** A worn-out weapon cannot be held (only while wear is on). */
export const isBroken = (
  def: ItemDef | undefined,
  metadata: Metadata,
  wear: Durability,
): boolean =>
  wear.enabled && wearKind(def) !== null && durabilityOf(metadata) <= 0;
