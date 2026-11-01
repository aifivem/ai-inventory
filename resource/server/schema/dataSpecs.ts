import type { DataSpec } from "@aicore-fivem/shared";

/** A text field of up to `max` characters. */
export const text = (max: number, optional = false): DataSpec => ({
  type: "text",
  min: 0,
  max,
  optional,
});
/** A list of item names. */
export const names: DataSpec = {
  type: "names",
  max: 30,
  itemMax: 48,
  pattern: "^[a-z0-9_-]{2,48}$",
};
/** A record key: lower case letters, digits, `_` and `-`. */
export const KEY = "^[a-z0-9_-]{2,48}$";
