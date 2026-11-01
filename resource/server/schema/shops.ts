import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import {
  BLIP_STYLE_FIELDS,
  PLACE_PED_SPEC,
  placePedFields,
  spec,
} from "@aicore-fivem/lib/shared";
import { SHOP_BLIP } from "common/places";
import { KEY } from "./dataSpecs";
import { place, placeSections } from "./place";

export const shopsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    coords: { x: 0, y: 0, z: 0 },
    radius: 2,
    jobs: [],
    blip: true,
    blipStyle: SHOP_BLIP,
    accounts: ["cash", "bank"],
    items: [{ name: "water", price: 5 }],
  },
  sections: {
    ped: PLACE_PED_SPEC,
    ...placeSections,
    blip: { type: "bool" },
    blipStyle: { type: "object", fields: BLIP_STYLE_FIELDS },
    accounts: {
      type: "names",
      lookup: "account",
      max: 5,
      itemMax: 32,
      pattern: "^[a-z0-9_]{2,32}$",
    },
    items: {
      type: "list",
      max: 100,
      of: {
        type: "object",
        fields: {
          name: {
            type: "text",
            lookup: "item",
            min: 2,
            max: 48,
            pattern: KEY,
          },
          price: spec.int(0, 100_000_000),
        },
      },
    },
  },
};

export const shopsTab: TabSpec = {
  id: "shops",
  file: "shops",
  icon: "store",
  label: "ADMIN_TAB_SHOPS",
  desc: "ADMIN_TAB_SHOPS_DESC",
  createLabel: "ADMIN_NEW_SHOP",
  deleteLabel: "ADMIN_DELETE_SHOP",
  cards: [
    {
      icon: "store",
      title: "ADMIN_C_SHOP",
      desc: "ADMIN_C_SHOP_DESC",
      fields: [
        ...place("ADMIN_F_SHOP_LABEL"),
        {
          widget: "switch",
          path: "blip",
          label: "ADMIN_F_BLIP",
          hint: "ADMIN_H_BLIP",
        },
        {
          widget: "blip",
          path: "blipStyle",
          label: "ADMIN_F_BLIP_STYLE",
          hint: "ADMIN_H_BLIP_STYLE",
          showIf: { path: "blip", values: [true] },
        },
        {
          widget: "tags",
          lookup: "account",
          path: "accounts",
          label: "ADMIN_F_ACCOUNTS",
          hint: "ADMIN_H_ACCOUNTS",
          placeholder: "ADMIN_P_ACCOUNTS",
        },
      ],
    },
    {
      icon: "list",
      title: "ADMIN_C_PRODUCTS",
      desc: "ADMIN_C_PRODUCTS_DESC",
      fields: [
        {
          widget: "list",
          path: "items",
          label: "ADMIN_F_PRODUCTS",
          addLabel: "ADMIN_ADD_PRODUCT",
          max: 100,
          newRow: { name: "water", price: 5 },
          rows: [
            {
              widget: "text",
              lookup: "item",
              path: "name",
              label: "ADMIN_F_ITEM",
              placeholder: "ADMIN_P_ITEM",
            },
            {
              widget: "number",
              path: "price",
              label: "ADMIN_F_PRICE",
              min: 0,
              max: 100_000_000,
              unit: "$",
            },
          ],
        },
      ],
    },
    {
      icon: "user",
      title: "ADMIN_C_PED",
      desc: "ADMIN_C_PED_DESC",
      fields: placePedFields(),
    },
  ],
};
