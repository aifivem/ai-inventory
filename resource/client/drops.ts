import {
  cache,
  onServerEvent,
  Points,
  requestModel,
  Zones,
} from "@aicore-fivem/lib/client";
import { isRecord, nearestOf, readFinite } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import { EVENTS } from "common/events";
import type { DropPoint } from "common/nui";
import { screen } from "./screen";

const MODEL = "prop_paper_bag_small";
/** The bag prop exists only while the player is this close (local entity, not networked). */
const SHOW_RANGE = 40;
function toPoint(v: unknown): DropPoint | null {
  if (!isRecord(v) || typeof v.id !== "string") return null;
  const x = readFinite(v.x);
  const y = readFinite(v.y);
  const z = readFinite(v.z);
  return x === null || y === null || z === null ? null : { id: v.id, x, y, z };
}

/**
 * Drops around this client (the server sends the ones in the 64 m cells around the player): a wide zone each that
 * spawns a local bag prop, and an interaction point at the bag. Nothing runs per frame.
 */
class Drops {
  private readonly points = new Map<string, DropPoint>();
  private readonly props = new Map<string, number>();
  private readonly zones = new Zones();
  private readonly use = new Points();

  /** One server message: `reset` replaces every known drop (the first list after a character load). */
  apply(put: DropPoint[], remove: string[], reset: boolean): void {
    if (reset) for (const id of this.points.keys()) this.remove(id);
    for (const id of remove) this.remove(id);
    for (const point of put) if (!this.points.has(point.id)) this.put(point);
  }

  private put(point: DropPoint): void {
    this.points.set(point.id, point);
    const center = { x: point.x, y: point.y, z: point.z };
    this.zones.add(`${point.id}:show`, {
      shape: { type: "sphere", center, radius: SHOW_RANGE },
      interval: 1000,
      onEnter: () => void this.spawn(point),
      onExit: () => this.despawn(point.id),
    });
    this.use.add(point.id, {
      coords: center,
      label: Locale("PROMPT_DROP"),
      icon: "bag-shopping",
      radius: 1.5,
      interval: 250,
      onPressed: () => screen.open({ kind: "drop", id: point.id }),
    });
  }

  private remove(id: string): void {
    this.points.delete(id);
    this.zones.remove(`${id}:show`);
    this.use.remove(id);
    this.despawn(id);
  }

  /** The id of the closest drop within `range` metres. */
  nearest(range: number): string | null {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    return (
      nearestOf(this.points.values(), { x, y, z }, (p) => p, range)?.id ?? null
    );
  }

  private async spawn(point: DropPoint): Promise<void> {
    if (this.props.has(point.id)) return;
    const model = await requestModel(MODEL);
    if (!this.points.has(point.id) || this.props.has(point.id)) return;
    const prop = CreateObjectNoOffset(
      model,
      point.x,
      point.y,
      point.z,
      false,
      false,
      false,
    );
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

onServerEvent(
  EVENTS.drops,
  {
    args: ([reset, put, remove]) =>
      Array.isArray(put) && Array.isArray(remove)
        ? [
            put.map(toPoint).filter((p): p is DropPoint => p !== null),
            remove.filter((id): id is string => typeof id === "string"),
            reset === true,
          ]
        : null,
  },
  (put, remove, reset) => drops.apply(put, remove, reset),
);
on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) drops.cleanup();
});
