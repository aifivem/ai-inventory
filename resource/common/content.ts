import type { RecordReader } from "@aicore-fivem/lib/shared";
import { ItemList } from "./items";
import {
  readBench,
  readShop,
  readStash,
  type Bench,
  type Shop,
  type Stash,
} from "./places";
import { readSettings, type Settings } from "./settings";

/** Panel content (`data/*.json`): the server reads it from its AdminPanel, clients from the AdminWorld mirror. No natives. */

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
