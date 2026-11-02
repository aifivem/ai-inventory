import type { CardSpec, DataSpec } from "@aifivem/shared";
import { spec } from "@aifivem/lib/shared";

/** Settings section `durability`: weapon wear and the weapon repair kit (`common/settings.ts` reads it). */
export const durabilitySpec: DataSpec = {
  type: "object",
  fields: {
    enabled: { type: "bool" },
    shots: spec.int(1, 100_000),
    hits: spec.int(1, 100_000),
    repairPercent: spec.int(1, 100),
    repairTime: spec.int(0, 60_000),
    maxRepairs: spec.int(0, 1000),
  },
};

/** The section's defaults (also filled into an older `data/settings.json` at load). */
export const DURABILITY_DEFAULTS = {
  enabled: true,
  shots: 1000,
  hits: 50,
  repairPercent: 100,
  repairTime: 5000,
  maxRepairs: 0,
};

const wearOn = { path: "durability.enabled", values: [true] };

export const durabilityCards: CardSpec[] = [
  {
    icon: "gun",
    title: "ADMIN_C_WEAR",
    desc: "ADMIN_C_WEAR_DESC",
    fields: [
      {
        widget: "switch",
        path: "durability.enabled",
        label: "ADMIN_F_WEAR",
        hint: "ADMIN_H_WEAR",
      },
      {
        widget: "number",
        path: "durability.shots",
        label: "ADMIN_F_WEAR_SHOTS",
        hint: "ADMIN_H_WEAR_SHOTS",
        min: 1,
        max: 100_000,
        showIf: wearOn,
      },
      {
        widget: "number",
        path: "durability.hits",
        label: "ADMIN_F_WEAR_HITS",
        hint: "ADMIN_H_WEAR_HITS",
        min: 1,
        max: 100_000,
        showIf: wearOn,
      },
    ],
  },
  {
    icon: "wrench",
    title: "ADMIN_C_REPAIR",
    desc: "ADMIN_C_REPAIR_DESC",
    fields: [
      {
        widget: "number",
        path: "durability.repairPercent",
        label: "ADMIN_F_REPAIR_PERCENT",
        hint: "ADMIN_H_REPAIR_PERCENT",
        min: 1,
        max: 100,
        unit: "%",
        showIf: wearOn,
      },
      {
        widget: "number",
        path: "durability.repairTime",
        label: "ADMIN_F_REPAIR_TIME",
        hint: "ADMIN_H_REPAIR_TIME",
        min: 0,
        max: 60_000,
        step: 250,
        unit: "ms",
        showIf: wearOn,
      },
      {
        widget: "number",
        path: "durability.maxRepairs",
        label: "ADMIN_F_MAX_REPAIRS",
        hint: "ADMIN_H_MAX_REPAIRS",
        min: 0,
        max: 1000,
        showIf: wearOn,
      },
    ],
  },
];
