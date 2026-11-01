import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { spec } from "@aicore-fivem/lib/shared";
import { KEY, names, text } from "./dataSpecs";
import { itemCard, sizeCard } from "./itemCards";
import { useCard, weaponCard } from "./itemUseCards";

export const itemsFile: FileSpec = {
  kind: "records",
  sync: "all",
  keyPattern: KEY,
  labelPath: "label",
  newRecord: {
    label: "",
    description: "",
    weight: 100,
    size: { w: 1, h: 1 },
    stack: 10,
    type: "item",
    usable: false,
    consume: 0,
    close: false,
    image: "",
    aliases: [],
  },
  sections: {
    label: text(48),
    description: text(240, true),
    weight: spec.int(0, 1_000_000),
    size: {
      type: "object",
      fields: { w: spec.int(1, 8), h: spec.int(1, 8) },
    },
    stack: spec.int(1, 100_000),
    type: { type: "enum", values: ["item", "weapon", "ammo", "component"] },
    usable: { type: "bool" },
    consume: spec.int(0, 1000),
    close: { type: "bool" },
    image: text(200),
    aliases: names,
    rarity: {
      type: "text",
      min: 0,
      max: 48,
      records: "rarities",
      optional: true,
    },
    use: {
      type: "object",
      optional: true,
      fields: {
        anim: {
          type: "enum",
          values: ["none", "eat", "drink", "bandage", "armour"],
          optional: true,
        },
        time: spec.int(0, 60_000, true),
        status: {
          type: "object",
          optional: true,
          fields: {
            hunger: spec.num(-100, 100, true),
            thirst: spec.num(-100, 100, true),
            stress: spec.num(-100, 100, true),
          },
        },
      },
    },
    weapon: {
      type: "object",
      optional: true,
      fields: {
        ammo: text(48, true),
        throwable: { type: "bool", optional: true },
      },
    },
    component: {
      type: "object",
      optional: true,
      fields: {
        hashes: {
          type: "names",
          max: 20,
          itemMax: 64,
          pattern: "^[A-Za-z0-9_]{2,64}$",
          optional: true,
        },
      },
    },
  },
};

export const itemsTab: TabSpec = {
  id: "items",
  file: "items",
  icon: "box",
  label: "ADMIN_TAB_ITEMS",
  desc: "ADMIN_TAB_ITEMS_DESC",
  listSub: "type",
  createLabel: "ADMIN_NEW_ITEM",
  deleteLabel: "ADMIN_DELETE_ITEM",
  deleteDesc: "ADMIN_DELETE_ITEM_DESC",
  cards: [itemCard, sizeCard, useCard, weaponCard],
};
