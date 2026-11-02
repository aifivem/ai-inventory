import { int, record } from "@aifivem/lib/shared";

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
  durability: Durability;
}

/** Weapon wear (metadata `durability` 0-100, `repairs`) and the weapon repair kit. */
export interface Durability {
  enabled: boolean;
  /** Shots that take a firearm from 100 to 0 when its item sets none. */
  shots: number;
  /** Hits that take a melee weapon from 100 to 0 when its item sets none. */
  hits: number;
  /** Durability a repair sets. */
  repairPercent: number;
  /** Milliseconds of the repair's progress bar. */
  repairTime: number;
  /** Repairs one weapon may get (0 = no limit). */
  maxRepairs: number;
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
  const wear = record(s.durability);
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
    durability: {
      enabled: wear.enabled !== false,
      shots: int(wear.shots, 1000, 1, 100_000),
      hits: int(wear.hits, 50, 1, 100_000),
      repairPercent: int(wear.repairPercent, 100, 1, 100),
      repairTime: int(wear.repairTime, 5000, 0, 60_000),
      maxRepairs: int(wear.maxRepairs, 0, 0, 1000),
    },
  };
}
