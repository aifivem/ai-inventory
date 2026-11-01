import type { WidgetSpec } from "@aicore-fivem/shared";

/** Rows and weight limit widgets of a grid size (`path`: its section, with a trailing dot, or "" at the top). */
export const gridFields = (path: string): WidgetSpec[] => [
  {
    widget: "number",
    path: `${path}rows`,
    label: "ADMIN_F_ROWS",
    hint: "ADMIN_H_ROWS",
    min: 1,
    max: 50,
  },
  {
    widget: "number",
    path: `${path}maxWeight`,
    label: "ADMIN_F_MAX_WEIGHT",
    hint: "ADMIN_H_MAX_WEIGHT",
    min: 0,
    max: 10_000_000,
    step: 1000,
    unit: "g",
  },
];
