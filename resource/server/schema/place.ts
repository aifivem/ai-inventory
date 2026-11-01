import type { DataSpec, WidgetSpec } from "@aicore-fivem/shared";
import { ACCESS_FIELDS, accessFields, spec } from "@aicore-fivem/lib/shared";
import { text } from "./dataSpecs";

/** The label, point, radius and access widgets of a shop, stash or bench. */
export const place = (labelKey: string): WidgetSpec[] => [
  {
    widget: "text",
    path: "label",
    label: labelKey,
    placeholder: "ADMIN_P_LABEL",
  },
  {
    widget: "point",
    path: "coords",
    label: "ADMIN_F_COORDS",
    hint: "ADMIN_H_COORDS",
    ground: true,
  },
  {
    widget: "number",
    path: "radius",
    label: "ADMIN_F_RADIUS",
    hint: "ADMIN_H_RADIUS",
    min: 0.5,
    max: 30,
    step: 0.5,
    unit: "m",
  },
  ...accessFields(),
];

/** The data sections every place record has. */
export const placeSections = {
  label: text(48),
  coords: { type: "vec3" } as DataSpec,
  radius: spec.num(0.5, 30),
  ...ACCESS_FIELDS,
};
