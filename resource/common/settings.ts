import { int, record } from "@aicore-fivem/lib/shared";

export interface GridSize {
  rows: number;
  /** Grams. */
  maxWeight: number;
}

export interface Settings {
  /** Cells per row in every inventory (the screens are drawn for this width). */
  columns: number;
  player: GridSize;
  /** `maxPerPlayer`: live drops one character may have made at a time. */
  drop: GridSize & { despawnMinutes: number; maxPerPlayer: number };
  trunk: GridSize;
  glovebox: GridSize;
  /** GTA's weapon wheel and scroll weapon switching stay off (weapons come from the inventory's quick slots). */
  noWeaponWheel: boolean;
}

/** A grid size from the panel, with the defaults when missing. */
export const grid = (v: unknown, rows: number, weight: number): GridSize => {
  const g = record(v);
  return {
    rows: int(g.rows, rows, 1, 50),
    maxWeight: int(g.maxWeight, weight, 0, 10_000_000),
  };
};

export function readSettings(raw: unknown): Settings {
  const s = record(raw);
  const drop = record(s.drop);
  return {
    columns: int(s.columns, 8, 6, 14),
    player: grid(s.player, 6, 40_000),
    drop: {
      ...grid(s.drop, 6, 1_000_000),
      despawnMinutes: int(drop.despawnMinutes, 15, 1, 240),
      maxPerPlayer: int(drop.maxPerPlayer, 10, 1, 100),
    },
    trunk: grid(s.trunk, 6, 80_000),
    glovebox: grid(s.glovebox, 2, 10_000),
    noWeaponWheel: s.noWeaponWheel !== false,
  };
}
