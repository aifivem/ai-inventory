import type { DataSpec, FileSpec, TabSpec } from "@aicore-fivem/shared";
import { spec } from "@aicore-fivem/lib/shared";
import { gridFields } from "./gridFields";

/** A grid size: rows and weight limit (plus `extra` fields). */
const gridSpec = (extra: Record<string, DataSpec> = {}): DataSpec => ({
  type: "object",
  fields: {
    rows: spec.int(1, 50),
    maxWeight: spec.int(0, 10_000_000),
    ...extra,
  },
});

export const settingsFile: FileSpec = {
  kind: "settings",
  sync: "all",
  sections: {
    columns: spec.int(6, 14),
    player: gridSpec(),
    drop: gridSpec({
      despawnMinutes: spec.int(1, 240),
      maxPerPlayer: spec.int(1, 100, true),
    }),
    trunk: gridSpec(),
    glovebox: gridSpec(),
    noWeaponWheel: { type: "bool" },
  },
  defaults: { noWeaponWheel: true, columns: 8 },
};

export const settingsTab: TabSpec = {
  id: "settings",
  file: "settings",
  icon: "sliders",
  label: "ADMIN_TAB_SETTINGS",
  desc: "ADMIN_TAB_SETTINGS_DESC",
  cards: [
    {
      icon: "table-cells",
      title: "ADMIN_C_GRID",
      desc: "ADMIN_C_GRID_DESC",
      fields: [
        {
          widget: "number",
          path: "columns",
          label: "ADMIN_F_COLUMNS",
          hint: "ADMIN_H_COLUMNS",
          min: 6,
          max: 14,
        },
        {
          widget: "switch",
          path: "noWeaponWheel",
          label: "ADMIN_F_NO_WHEEL",
          hint: "ADMIN_H_NO_WHEEL",
        },
      ],
    },
    {
      icon: "user",
      title: "ADMIN_C_PLAYER",
      desc: "ADMIN_C_PLAYER_DESC",
      fields: gridFields("player."),
    },
    {
      icon: "box-open",
      title: "ADMIN_C_DROP",
      desc: "ADMIN_C_DROP_DESC",
      fields: [
        ...gridFields("drop."),
        {
          widget: "number",
          path: "drop.despawnMinutes",
          label: "ADMIN_F_DESPAWN",
          hint: "ADMIN_H_DESPAWN",
          min: 1,
          max: 240,
          unit: "min",
        },
        {
          widget: "number",
          path: "drop.maxPerPlayer",
          label: "ADMIN_F_DROP_LIMIT",
          hint: "ADMIN_H_DROP_LIMIT",
          min: 1,
          max: 100,
        },
      ],
    },
    {
      icon: "car",
      title: "ADMIN_C_TRUNK",
      desc: "ADMIN_C_TRUNK_DESC",
      fields: gridFields("trunk."),
    },
    {
      icon: "car-side",
      title: "ADMIN_C_GLOVEBOX",
      desc: "ADMIN_C_GLOVEBOX_DESC",
      fields: gridFields("glovebox."),
    },
  ],
};
