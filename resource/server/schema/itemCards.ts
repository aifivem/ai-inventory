import type { CardSpec } from "@aicore-fivem/shared";

export const itemCard: CardSpec = {
  icon: "tag",
  title: "ADMIN_C_ITEM",
  desc: "ADMIN_C_ITEM_DESC",
  fields: [
    {
      widget: "text",
      path: "label",
      label: "ADMIN_F_LABEL",
      placeholder: "ADMIN_P_ITEM_LABEL",
    },
    {
      widget: "text",
      path: "description",
      label: "ADMIN_F_DESCRIPTION",
      placeholder: "ADMIN_P_DESCRIPTION",
    },
    {
      widget: "select",
      path: "type",
      label: "ADMIN_F_TYPE",
      hint: "ADMIN_H_TYPE",
      options: [
        { value: "item", label: "ADMIN_O_ITEM" },
        { value: "weapon", label: "ADMIN_O_WEAPON" },
        { value: "ammo", label: "ADMIN_O_AMMO" },
        { value: "component", label: "ADMIN_O_COMPONENT" },
      ],
    },
    {
      widget: "text",
      path: "rarity",
      records: "rarities",
      label: "ADMIN_F_RARITY",
      hint: "ADMIN_H_RARITY",
      placeholder: "ADMIN_P_RARITY",
    },
    {
      widget: "text",
      path: "image",
      label: "ADMIN_F_IMAGE",
      hint: "ADMIN_H_IMAGE",
      placeholder: "ADMIN_P_IMAGE",
    },
    {
      widget: "tags",
      path: "aliases",
      label: "ADMIN_F_ALIASES",
      hint: "ADMIN_H_ALIASES",
      placeholder: "ADMIN_P_ALIASES",
    },
  ],
};

export const sizeCard: CardSpec = {
  icon: "table-cells",
  title: "ADMIN_C_SIZE",
  desc: "ADMIN_C_SIZE_DESC",
  fields: [
    {
      widget: "number",
      path: "size.w",
      label: "ADMIN_F_WIDTH",
      hint: "ADMIN_H_WIDTH",
      min: 1,
      max: 8,
      unit: "ADMIN_U_CELLS",
    },
    {
      widget: "number",
      path: "size.h",
      label: "ADMIN_F_HEIGHT",
      min: 1,
      max: 8,
      unit: "ADMIN_U_CELLS",
    },
    {
      widget: "number",
      path: "weight",
      label: "ADMIN_F_WEIGHT",
      hint: "ADMIN_H_WEIGHT",
      min: 0,
      max: 1_000_000,
      step: 10,
      unit: "g",
    },
    {
      widget: "number",
      path: "stack",
      label: "ADMIN_F_STACK",
      hint: "ADMIN_H_STACK",
      min: 1,
      max: 100_000,
    },
  ],
};
