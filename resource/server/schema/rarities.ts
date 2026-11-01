import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { KEY, text } from "./dataSpecs";

export const raritiesFile: FileSpec = {
  kind: "records",
  sync: "all",
  keyPattern: KEY,
  labelPath: "label",
  newRecord: { label: "", color: "#9e9e9e" },
  sections: {
    label: text(32),
    color: { type: "text", min: 7, max: 7, pattern: "^#[0-9a-fA-F]{6}$" },
  },
};

export const raritiesTab: TabSpec = {
  id: "rarities",
  file: "rarities",
  icon: "gem",
  label: "ADMIN_TAB_RARITIES",
  desc: "ADMIN_TAB_RARITIES_DESC",
  createLabel: "ADMIN_NEW_RARITY",
  deleteLabel: "ADMIN_DELETE_RARITY",
  deleteDesc: "ADMIN_DELETE_RARITY_DESC",
  cards: [
    {
      icon: "gem",
      title: "ADMIN_C_RARITY",
      desc: "ADMIN_C_RARITY_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_RARITY_LABEL",
        },
        {
          widget: "color",
          path: "color",
          label: "ADMIN_F_RARITY_COLOR",
          hint: "ADMIN_H_RARITY_COLOR",
        },
      ],
    },
  ],
};
