import {
  bool,
  int,
  num,
  readAccess,
  readBlipStyle,
  readPlacePed,
  record,
  str,
  type AccessRule,
  type BlipStyle,
  type PlacePed,
  type RecordReader,
} from "@aicore-fivem/lib/shared";
import { grid, type GridSize } from "./settings";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Place extends Point {
  id: string;
  label: string;
  /** Metres from the point where it can be opened. */
  radius: number;
  /** Who may open it (the record's `jobs` / `gangs` / `onDuty`; script stashes: jobs at a minimum grade). */
  access: AccessRule;
}

/** A shop's map blip when its record has none (qb-shops' 24/7 blip). */
export const SHOP_BLIP: BlipStyle = { sprite: 52, color: 0, scale: 0.6 };

export interface Shop extends Place {
  /** NPC standing at the place (panel), null for none. */
  ped: PlacePed | null;
  blip: boolean;
  blipStyle: BlipStyle;
  accounts: string[];
  items: Array<{ name: string; price: number }>;
}

export interface Stash extends Place {
  /** Every character gets its own copy. */
  personal: boolean;
  size: GridSize;
  /** Only a server script may open it (no place in the world, or one fixed owner): the client `open` is refused. */
  scriptOnly?: boolean;
}

export interface Recipe {
  result: string;
  count: number;
  /** Seconds. */
  time: number;
  ingredients: Array<{ name: string; count: number }>;
}

export interface Bench extends Place {
  recipes: Recipe[];
}

const names = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x !== "")
    : [];

/** `"water:2, bread"` -> `[{ water, 2 }, { bread, 1 }]` (the panel edits ingredients as one text). */
export function parseIngredients(
  text: string,
): Array<{ name: string; count: number }> {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name = "", count = "1"] = part.split(":").map((x) => x.trim());
      return {
        name: name.toLowerCase(),
        count: Math.max(1, Math.floor(Number(count)) || 1),
      };
    });
}

function readPlace(id: string, v: Record<string, unknown>): Place {
  const c = record(v.coords);
  return {
    id,
    label: str(v.label, id),
    x: num(c.x, 0),
    y: num(c.y, 0),
    z: num(c.z, 0),
    radius: num(v.radius, 2, 0.5, 30),
    access: readAccess(v),
  };
}

/** One shop record (`records("shops", readShop)`). */
export const readShop: RecordReader<Shop> = (id, v) => ({
  ...readPlace(id, v),
  ped: readPlacePed(v.ped),
  blip: bool(v.blip, true),
  blipStyle: readBlipStyle(v.blipStyle, SHOP_BLIP),
  accounts: names(v.accounts).length ? names(v.accounts) : ["cash", "bank"],
  items: (Array.isArray(v.items) ? v.items : []).flatMap((row) => {
    const r = record(row);
    const name = str(r.name, "").toLowerCase();
    return name ? [{ name, price: int(r.price, 0, 0, 100_000_000) }] : [];
  }),
});

/** One stash record. */
export const readStash: RecordReader<Stash> = (id, v) => ({
  ...readPlace(id, v),
  personal: bool(v.personal, false),
  size: grid(v, 6, 100_000),
});

/** One crafting bench record. */
export const readBench: RecordReader<Bench> = (id, v) => ({
  ...readPlace(id, v),
  recipes: (Array.isArray(v.recipes) ? v.recipes : []).flatMap((row) => {
    const r = record(row);
    const result = str(r.result, "").toLowerCase();
    if (!result) return [];
    return [
      {
        result,
        count: int(r.count, 1, 1, 1000),
        time: num(r.time, 5, 0, 600),
        ingredients: parseIngredients(str(r.ingredients, "", 400)),
      },
    ];
  }),
});

/** Whether a point is within a place's radius (3D). */
export const nearPlace = (
  place: Point & { radius: number },
  x: number,
  y: number,
  z: number,
  slack = 1,
): boolean =>
  Math.hypot(x - place.x, y - place.y, z - place.z) <= place.radius + slack;
