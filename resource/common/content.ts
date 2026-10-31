import {
  bool,
  int,
  readBlipStyle,
  type BlipStyle,
  num,
  record,
  str,
  readAccess,
  readPlacePed,
  type AccessRule,
  type PlacePed,
  type RecordReader,
} from "@aicore-fivem/lib/shared";
import { ItemList } from "./items";

/** Panel content (`data/*.json`): the server reads it from its AdminPanel, clients from the AdminWorld mirror. No natives. */

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface GridSize {
  rows: number;
  /** Grams. */
  maxWeight: number;
}

export interface Settings {
  /** Cells per row in every inventory (the screens are drawn for this width). */
  columns: number;
  player: GridSize;
  /** `maxPerPlayer`: live drops one character may have made at a time. */
  drop: GridSize & { despawnMinutes: number; maxPerPlayer: number };
  trunk: GridSize;
  glovebox: GridSize;
  /** GTA's weapon wheel and scroll weapon switching stay off (weapons come from the inventory's quick slots). */
  noWeaponWheel: boolean;
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
const grid = (v: unknown, rows: number, weight: number): GridSize => {
  const g = record(v);
  return {
    rows: int(g.rows, rows, 1, 50),
    maxWeight: int(g.maxWeight, weight, 0, 10_000_000),
  };
};

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const drop = record(s.drop);
  return {
    columns: int(s.columns, 8, 6, 14),
    player: grid(s.player, 6, 40_000),
    drop: {
      ...grid(s.drop, 6, 1_000_000),
      despawnMinutes: int(drop.despawnMinutes, 15, 1, 240),
      maxPerPlayer: int(drop.maxPerPlayer, 10, 1, 100),
    },
    trunk: grid(s.trunk, 6, 80_000),
    glovebox: grid(s.glovebox, 2, 10_000),
    noWeaponWheel: s.noWeaponWheel !== false,
  };
}

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

/** Where the content comes from: the server's AdminPanel or a client's AdminWorld. */
interface ContentSource {
  get(file: string): unknown;
  onChange(file: string, handler: () => void): void;
  records<T>(file: string, readOne: RecordReader<T>): ReadonlyMap<string, T>;
}

/** Rarities from the panel: key -> colour. */
function readRarities(raw: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof raw !== "object" || raw === null) return out;
  for (const [key, value] of Object.entries(raw)) {
    const color =
      typeof value === "object" && value !== null
        ? Reflect.get(value, "color")
        : null;
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color))
      out.set(key, color);
  }
  return out;
}

export const FILES = [
  "items",
  "rarities",
  "settings",
  "shops",
  "stashes",
  "benches",
] as const;

/** Files parsed whole again after each change; `subscribe` hears which one changed. */
type WholeFile = "items" | "rarities" | "settings";

/**
 * Every panel file: items, rarities and settings parsed again after each change, shops, stashes and benches kept
 * per record by the source (`records`: one edit re-reads one record; client points follow with `RecordObjects`).
 */
export class InventoryContent {
  items: ItemList;
  settings: Settings;
  readonly shops: ReadonlyMap<string, Shop>;
  readonly stashes: ReadonlyMap<string, Stash>;
  readonly benches: ReadonlyMap<string, Bench>;
  /** Rarity key -> colour (`#rrggbb`). */
  rarities: Map<string, string>;
  private readonly listeners: Array<(file: WholeFile) => void> = [];

  constructor(private readonly source: ContentSource) {
    this.items = new ItemList(source.get("items"));
    this.settings = readSettings(source.get("settings"));
    this.shops = source.records("shops", readShop);
    this.stashes = source.records("stashes", readStash);
    this.benches = source.records("benches", readBench);
    this.rarities = readRarities(source.get("rarities"));
    for (const file of ["items", "rarities", "settings"] as const)
      source.onChange(file, () => this.reload(file));
  }

  subscribe(listener: (file: WholeFile) => void): void {
    this.listeners.push(listener);
  }

  private reload(file: WholeFile): void {
    const raw = this.source.get(file);
    if (file === "items") this.items = new ItemList(raw);
    else if (file === "settings") this.settings = readSettings(raw);
    else this.rarities = readRarities(raw);
    for (const listener of this.listeners) listener(file);
  }
}

/** Whether a point is within a place's radius (3D). */
export const nearPlace = (
  place: Point & { radius: number },
  x: number,
  y: number,
  z: number,
  slack = 1,
): boolean =>
  Math.hypot(x - place.x, y - place.y, z - place.z) <= place.radius + slack;
