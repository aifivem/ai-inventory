import { isRecord } from "@aicore-fivem/lib/shared";
import type { Size } from "./grid";

/** Item definitions (`data/items.json`, panel records): read on the server from the panel store, on clients from the world mirror. No natives. */

export type ItemType = "item" | "weapon" | "ammo" | "component";
export type UseAnim = "none" | "eat" | "drink" | "bandage" | "armour";

export interface ItemDef {
  name: string;
  label: string;
  description: string;
  /** Grams per unit. */
  weight: number;
  size: Size;
  /** Most units in one stack; 1 = every unit is its own stack (unique metadata). */
  stack: number;
  type: ItemType;
  usable: boolean;
  /** Units removed when used (0 = not consumed). */
  consume: number;
  /** Close the inventory when used. */
  close: boolean;
  /** File in the NUI's images folder (or a full https url); empty = an icon. */
  image: string;
  /** Other names scripts call this item by (QB `pistol_ammo` for ox `ammo-9`). */
  aliases: string[];
  /** Key of a rarity (panel Rarities tab), "" = none. */
  rarity: string;
  use: { anim: UseAnim; time: number; status: Record<string, number> };
  weapon: { ammo: string; throwable: boolean } | null;
  component: { hashes: string[] } | null;
}

const KEY = /^[a-z0-9_-]{2,48}$/;
const TYPES: ItemType[] = ["item", "weapon", "ammo", "component"];
const ANIMS: UseAnim[] = ["none", "eat", "drink", "bandage", "armour"];

const n = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
const s = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const names = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.toLowerCase())
    : [];

export function readItem(name: string, raw: unknown): ItemDef | null {
  if (!KEY.test(name) || !isRecord(raw)) return null;
  const size = isRecord(raw.size) ? raw.size : {};
  const use = isRecord(raw.use) ? raw.use : {};
  const type = TYPES.includes(raw.type as ItemType)
    ? (raw.type as ItemType)
    : "item";
  const status: Record<string, number> = {};
  if (isRecord(use.status))
    for (const [key, value] of Object.entries(use.status))
      if (typeof value === "number") status[key] = value;
  const weapon = isRecord(raw.weapon) ? raw.weapon : {};
  const component = isRecord(raw.component) ? raw.component : {};
  return {
    name,
    label: s(raw.label, name),
    description: s(raw.description),
    weight: n(raw.weight, 0, 0, 1_000_000),
    size: {
      w: Math.round(n(size.w, 1, 1, 8)),
      h: Math.round(n(size.h, 1, 1, 8)),
    },
    stack: Math.round(n(raw.stack, 1, 1, 100_000)),
    type,
    usable: raw.usable === true || type === "weapon" || type === "component",
    consume: Math.round(n(raw.consume, 0, 0, 1000)),
    close: raw.close === true,
    image: s(raw.image),
    aliases: names(raw.aliases),
    rarity: s(raw.rarity),
    use: {
      anim: ANIMS.includes(use.anim as UseAnim)
        ? (use.anim as UseAnim)
        : "none",
      time: n(use.time, 0, 0, 60_000),
      status,
    },
    weapon:
      type === "weapon"
        ? {
            ammo: s(weapon.ammo).toLowerCase(),
            throwable: weapon.throwable === true,
          }
        : null,
    component:
      type === "component"
        ? {
            hashes: Array.isArray(component.hashes)
              ? component.hashes.filter(
                  (h): h is string => typeof h === "string",
                )
              : [],
          }
        : null,
  };
}

/** Every item by name, plus the alias lookup. Names are case-insensitive (ox calls `WEAPON_PISTOL`, QB `weapon_pistol`). */
export class ItemList {
  readonly byName = new Map<string, ItemDef>();
  private readonly alias = new Map<string, string>();

  constructor(raw: unknown) {
    if (!isRecord(raw)) return;
    for (const [name, value] of Object.entries(raw)) {
      const item = readItem(name, value);
      if (!item) continue;
      this.byName.set(name, item);
      for (const alias of item.aliases) this.alias.set(alias, name);
    }
  }

  /** The definition for any spelling or alias of a name. */
  get(name: unknown): ItemDef | undefined {
    if (typeof name !== "string") return undefined;
    const key = name.toLowerCase();
    return this.byName.get(key) ?? this.byName.get(this.alias.get(key) ?? "");
  }
}
