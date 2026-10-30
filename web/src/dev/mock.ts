import type {
  BenchView,
  InventoryView,
  ItemView,
  ShopView,
  Stack,
} from "../../../resource/common/nui";
import items from "../../../data/items.json";
import shops from "../../../data/shops.json";
import benches from "../../../data/benches.json";
import en from "../../../locales/en.json";

/**
 * Browser preview only (`bun run webdev`): `?view=ground|stash|shop|bench`. fivem-nui-react hands these out only
 * outside the game. Module-level constants: a new object per render would fire the mock again.
 */
const params = new URLSearchParams(window.location.search);
const view = params.get("view") ?? "stash";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const MOCK_ITEMS: ItemView[] = Object.entries(items).map(
  ([name, raw]) => {
    const d: Record<string, unknown> = isObj(raw) ? raw : {};
    const size = isObj(d.size) ? d.size : {};
    const component = isObj(d.component) ? d.component : {};
    return {
      name,
      label: typeof d.label === "string" ? d.label : name,
      description: typeof d.description === "string" ? d.description : "",
      weight: typeof d.weight === "number" ? d.weight : 0,
      w: typeof size.w === "number" ? size.w : 1,
      h: typeof size.h === "number" ? size.h : 1,
      stack: typeof d.stack === "number" ? d.stack : 1,
      type: typeof d.type === "string" ? d.type : "item",
      usable: d.usable === true,
      image: typeof d.image === "string" ? d.image : "",
      hashes: Array.isArray(component.hashes)
        ? component.hashes.filter((h): h is string => typeof h === "string")
        : [],
    };
  },
);

const s = (
  slot: number,
  name: string,
  count: number,
  rotated = false,
  metadata: Record<string, unknown> = {},
): Stack => ({ slot, name, count, metadata, rotated });

export const MOCK_PLAYER: InventoryView = {
  id: "player:1",
  kind: "player",
  label: "",
  columns: 10,
  rows: 6,
  maxWeight: 40_000,
  stacks: [
    s(1, "water", 3),
    s(2, "burger", 2),
    s(3, "bandage", 5),
    s(4, "phone", 1),
    s(11, "weapon_pistol", 1, false, {
      serial: "K2J8Q1",
      ammo: 12,
      components: ["COMPONENT_AT_PI_FLSH"],
    }),
    s(14, "ammo-9", 48),
    s(21, "weapon_carbinerifle", 1, false, { serial: "AB12CD", ammo: 30 }),
    s(27, "armour", 1),
    s(41, "lockpick", 4),
    s(42, "radio", 1),
  ],
};

const OTHER: Record<string, InventoryView | null> = {
  stash: {
    id: "stash:mrpd_lockers:1",
    kind: "stash",
    label: "Police Locker",
    columns: 10,
    rows: 6,
    maxWeight: 100_000,
    stacks: [
      s(1, "scrapmetal", 25),
      s(3, "weapon_pumpshotgun", 1, false, { serial: "PX0P1Q", ammo: 8 }),
      s(31, "sprunk", 6),
    ],
  },
  ground: null,
  shop: null,
  bench: null,
};

const MOCK_SHOP: ShopView = {
  id: "shop_innocence",
  label: shops.shop_innocence.label,
  items: shops.shop_innocence.items,
};
const MOCK_BENCH: BenchView = {
  id: "workshop_bench",
  label: benches.workshop_bench.label,
  recipes: [
    {
      result: "lockpick",
      count: 1,
      time: 5,
      ingredients: [{ name: "scrapmetal", count: 3 }],
    },
    {
      result: "bandage",
      count: 2,
      time: 4,
      ingredients: [{ name: "paperbag", count: 1 }],
    },
  ],
};

export const MOCK_SETUP = { texts: en, items: MOCK_ITEMS };
export const MOCK_OPEN = {
  other: OTHER[view] ?? null,
  shop: view === "shop" ? MOCK_SHOP : null,
  bench: view === "bench" ? MOCK_BENCH : null,
};
