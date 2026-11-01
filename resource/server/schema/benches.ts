import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { spec } from "@aicore-fivem/lib/shared";
import { KEY, text } from "./dataSpecs";
import { place, placeSections } from "./place";

export const benchesFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    coords: { x: 0, y: 0, z: 0 },
    radius: 1.5,
    jobs: [],
    recipes: [
      {
        result: "lockpick",
        count: 1,
        time: 5,
        ingredients: "scrapmetal:3",
      },
    ],
  },
  sections: {
    ...placeSections,
    recipes: {
      type: "list",
      max: 50,
      of: {
        type: "object",
        fields: {
          result: { type: "text", min: 2, max: 48, pattern: KEY },
          count: spec.int(1, 1000),
          time: spec.num(0, 600),
          ingredients: text(400),
        },
      },
    },
  },
};

export const benchesTab: TabSpec = {
  id: "benches",
  file: "benches",
  icon: "hammer",
  label: "ADMIN_TAB_BENCHES",
  desc: "ADMIN_TAB_BENCHES_DESC",
  createLabel: "ADMIN_NEW_BENCH",
  deleteLabel: "ADMIN_DELETE_BENCH",
  cards: [
    {
      icon: "hammer",
      title: "ADMIN_C_BENCH",
      desc: "ADMIN_C_BENCH_DESC",
      fields: place("ADMIN_F_BENCH_LABEL"),
    },
    {
      icon: "flask",
      title: "ADMIN_C_RECIPES",
      desc: "ADMIN_C_RECIPES_DESC",
      fields: [
        {
          widget: "list",
          path: "recipes",
          label: "ADMIN_F_RECIPES",
          addLabel: "ADMIN_ADD_RECIPE",
          max: 50,
          newRow: {
            result: "lockpick",
            count: 1,
            time: 5,
            ingredients: "scrapmetal:3",
          },
          rows: [
            {
              widget: "text",
              path: "result",
              label: "ADMIN_F_RESULT",
              placeholder: "ADMIN_P_ITEM",
            },
            {
              widget: "number",
              path: "count",
              label: "ADMIN_F_COUNT",
              min: 1,
              max: 1000,
            },
            {
              widget: "number",
              path: "time",
              label: "ADMIN_F_TIME",
              min: 0,
              max: 600,
              unit: "s",
            },
            {
              widget: "text",
              path: "ingredients",
              label: "ADMIN_F_INGREDIENTS",
              placeholder: "ADMIN_P_INGREDIENTS",
            },
          ],
        },
      ],
    },
  ],
};
