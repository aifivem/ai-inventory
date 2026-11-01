import { isRecord } from "@aicore-fivem/lib/shared";
import type { Metadata } from "common/nui";

/** A count from a script: whole (1 when missing or below 1); NaN and Infinity are refused (null). */
export const countOf = (v: unknown): number | null =>
  typeof v !== "number"
    ? 1
    : Number.isFinite(v)
      ? Math.max(1, Math.floor(v))
      : null;

/** Metadata from a script: a copy of a plain object, else none. */
export const metaOf = (v: unknown): Metadata => (isRecord(v) ? { ...v } : {});
