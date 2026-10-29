import { cache, hidePrompt, onPromptPressed, onServerEvent, requestModel, showPrompt, Zones } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/events";
import type { DropPoint } from "common/nui";
import { screen } from "./screen";

const MODEL = "prop_paper_bag_small";
/** The bag prop exists only while the player is this close (local entity, not networked). */
const SHOW_RANGE = 40;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const toPoint = (v: unknown): DropPoint | null =>
  isObj(v) && typeof v.id === "string" && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number" ? { id: v.id, x: v.x, y: v.y, z: v.z } : null;

/**
 * Drops on this client: two zones each (a wide one that spawns a local bag prop, a small one with ai-core's prompt),
 * from the server's snapshot and put / remove events. Nothing runs per frame.
 */
class Drops {
  private readonly points = new Map<string, DropPoint>();
  private readonly props = new Map<string, number>();
  private readonly zones = new Zones();

  set(list: DropPoint[]): void {
    for (const id of this.points.keys()) this.remove(id);
    for (const point of list) this.put(point);
  }

  put(point: DropPoint): void {
    this.points.set(point.id, point);
    const center = { x: point.x, y: point.y, z: point.z };
    this.zones.add(`${point.id}:show`, { shape: { type: "sphere", center, radius: SHOW_RANGE }, interval: 1000, onEnter: () => void this.spawn(point), onExit: () => this.despawn(point.id) });
    this.zones.add(`${point.id}:use`, {
      shape: { type: "sphere", center, radius: 1.5 },
      interval: 250,
      onEnter: () => showPrompt(point.id, Locale("PROMPT_DROP")),
      onExit: () => hidePrompt(point.id),
    });
  }

  remove(id: string): void {
    this.points.delete(id);
    this.zones.remove(`${id}:show`);
    this.zones.remove(`${id}:use`);
    this.despawn(id);
    hidePrompt(id);
  }

  /** The id of the closest drop within `range` metres. */
  nearest(range: number): string | null {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    let best: string | null = null;
    let bestDistance = range;
    for (const point of this.points.values()) {
      const distance = Math.hypot(point.x - x, point.y - y, point.z - z);
      if (distance < bestDistance) [best, bestDistance] = [point.id, distance];
    }
    return best;
  }

  private async spawn(point: DropPoint): Promise<void> {
    if (this.props.has(point.id)) return;
    const model = await requestModel(MODEL);
    if (!this.points.has(point.id) || this.props.has(point.id)) return;
    const prop = CreateObjectNoOffset(model, point.x, point.y, point.z, false, false, false);
    PlaceObjectOnGroundProperly(prop);
    FreezeEntityPosition(prop, true);
    SetEntityCollision(prop, false, false);
    SetModelAsNoLongerNeeded(model);
    this.props.set(point.id, prop);
  }

  private despawn(id: string): void {
    const prop = this.props.get(id);
    if (prop) DeleteEntity(prop);
    this.props.delete(id);
  }

  cleanup(): void {
    for (const id of this.props.keys()) this.despawn(id);
  }
}

export const drops = new Drops();

onServerEvent(EVENTS.drops, { args: ([raw]) => (Array.isArray(raw) ? [raw.map(toPoint).filter((p): p is DropPoint => p !== null)] : null) }, (list) => drops.set(list));
onServerEvent(EVENTS.dropPut, { args: ([raw]) => { const p = toPoint(raw); return p ? [p] : null; } }, (point) => drops.put(point));
onServerEvent(EVENTS.dropRemove, { args: ([id]) => (typeof id === "string" ? [id] : null) }, (id) => drops.remove(id));
onPromptPressed((id) => {
  if (id.startsWith("drop:")) void screen.open({ kind: "drop", id });
});
on("onResourceStop", (resource: string) => {
  if (resource === GetCurrentResourceName()) drops.cleanup();
});
