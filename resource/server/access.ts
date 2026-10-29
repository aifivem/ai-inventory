import { resourceExport } from "@aicore-fivem/lib/server";
import type { Place } from "common/content";
import { inventories } from "./registry";
import type { Inventory } from "./inventory";

const core = resourceExport("ai-core");

export function pedCoords(source: number): { x: number; y: number; z: number } {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
}

export function distanceTo(source: number, x: number, y: number, z: number): number {
  const p = pedCoords(source);
  return Math.hypot(p.x - x, p.y - y, p.z - z);
}

/** Whether the player's character has one of the jobs (or gangs); an empty list lets everyone in. */
export function allowed(source: number, place: Place & { gangs?: string[]; grades?: Record<string, number> }): boolean {
  const gangs = place.gangs ?? [];
  if (place.jobs.length === 0 && gangs.length === 0) return true;
  const grades = place.grades ?? {};
  if (place.jobs.length && (core.GetJobs(source) ?? []).some((m) => place.jobs.includes(m.job) && m.grade >= (grades[m.job] ?? 0))) return true;
  return gangs.length > 0 && (core.GetGangs(source) ?? []).some((m) => gangs.includes(m.gang));
}

export const charIdOf = (source: number): number | null => core.GetCharacter(source)?.id ?? null;

/** Per player: how to re-check that the open second inventory is still in reach (distance to its point or vehicle). */
const reach = new Map<number, () => boolean>();

export function setReach(source: number, check: () => boolean): void {
  reach.set(source, check);
}

/**
 * The inventory a client action may touch: the player's own, or the second one he has open and still reaches.
 * Anything else (an id from a stale screen, a stash left behind) is refused.
 */
export function reachable(source: number, id: string): Inventory | null {
  const own = inventories.playerOf(source);
  if (own?.id === id) return own;
  const open = inventories.openOf(source);
  if (!open || open.id !== id) return null;
  if (reach.get(source)?.() === false) {
    inventories.close(source);
    return null;
  }
  return open;
}

on("playerDropped", () => reach.delete(Number(globalThis.source)));
