import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { spec } from "@aicore-fivem/lib/shared";
import { place, placeSections } from "./place";
import { gridFields } from "./gridFields";

export const stashesFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    coords: { x: 0, y: 0, z: 0 },
    radius: 1.5,
    jobs: [],
    gangs: [],
    personal: false,
    rows: 6,
    maxWeight: 100_000,
  },
  sections: {
    ...placeSections,
    personal: { type: "bool" },
    rows: spec.int(1, 50),
    maxWeight: spec.int(0, 10_000_000),
  },
};

export const stashesTab: TabSpec = {
  id: "stashes",
  file: "stashes",
  icon: "warehouse",
  label: "ADMIN_TAB_STASHES",
  desc: "ADMIN_TAB_STASHES_DESC",
  createLabel: "ADMIN_NEW_STASH",
  deleteLabel: "ADMIN_DELETE_STASH",
  deleteDesc: "ADMIN_DELETE_STASH_DESC",
  cards: [
    {
      icon: "warehouse",
      title: "ADMIN_C_STASH",
      desc: "ADMIN_C_STASH_DESC",
      fields: [
        ...place("ADMIN_F_STASH_LABEL"),
        {
          widget: "switch",
          path: "personal",
          label: "ADMIN_F_PERSONAL",
          hint: "ADMIN_H_PERSONAL",
        },
        ...gridFields(""),
      ],
    },
  ],
};
