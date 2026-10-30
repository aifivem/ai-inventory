import { online, PlayerMap, resourceExport } from "@aicore-fivem/lib/server";
import type { Place } from "common/content";
import { inventories } from "./registry";
import type { Inventory } from "./inventory";

const core = resourceExport("ai-core");

/** Whether the player's character has one of the jobs (or gangs); an empty list lets everyone in. */
export function allowed(
  source: number,
  place: Place & { gangs?: string[]; grades?: Record<string, number> },
): boolean {
  const gangs = place.gangs ?? [];
  if (place.jobs.length === 0 && gangs.length === 0) return true;
  if (gangs.length > 0 && online.gangs(source).some((g) => gangs.includes(g)))
    return true;
  const jobs = online.jobs(source).filter((job) => place.jobs.includes(job));
  if (jobs.length === 0) return false;
  const grades = place.grades ?? {};
  if (jobs.some((job) => (grades[job] ?? 0) <= 0)) return true;
  // Grades are not in lib `online`: ai-core is asked only when a matching job needs one (script stashes).
  return (core.GetJobs(source) ?? []).some(
    (m) => jobs.includes(m.job) && m.grade >= (grades[m.job] ?? 0),
  );
}

export const charIdOf = (source: number): number | null =>
  online.character(source)?.id ?? null;

/** Per player: how to re-check that the open second inventory is still in reach (distance to its point or vehicle). */
const reach = new PlayerMap<() => boolean>();

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
