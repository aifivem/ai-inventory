import { coordsOf, PlayerMap } from "@aicore-fivem/lib/server";
import { EVENTS } from "common/events";
import type { DropPoint } from "common/nui";

/** Grid cell size in metres. */
const CELL = 64;
/** Cells around the player's cell whose drops his client knows (at least 192 m: bags show at 40 m). */
const RANGE = 3;
/** Points per event: a big area list goes as several small reliable events (they keep their order). */
const CHUNK = 100;

// Cells clamped to +-1,000 km; keys stay below 2^30 (small integers: fast Map keys).
const OFFSET = 16_384;
export const cellOf = (v: number): number =>
  Math.max(-16_000, Math.min(16_000, Math.floor(v / CELL)));
export const keyOf = (cx: number, cy: number): number =>
  (cx + OFFSET) * 32_768 + (cy + OFFSET);

/** What the grid needs of a drop. */
export interface AreaDrop {
  readonly id: string;
  /** `keyOf` its cell. */
  readonly cell: number;
  /** Players whose client has its point. */
  readonly known: Set<number>;
  point(): DropPoint;
}

/** A loaded player: the cell he was last seen in and the drops his client knows. */
interface Follower<D> {
  cell: number;
  known: Set<D>;
}

/**
 * Drops by 64 m cell and who knows which: each loaded player's client gets the drops of the cells around him
 * (snapshot at character load, then put / remove as drops come and go or he changes cell, checked by `followAll`).
 */
export class DropAreas<D extends AreaDrop> {
  private readonly cells = new Map<number, Set<D>>();
  private readonly followers = new PlayerMap<Follower<D>>({
    onDrop: (source, follower) => this.forget(source, follower),
  });
  /** Followers by the cell they were last seen in (who learns about a new drop). */
  private readonly inCell = new Map<number, Set<number>>();
  /** Follower cells were not checked while there were no drops. */
  private stale = true;
  private count = 0;

  get size(): number {
    return this.count;
  }

  /** The drops in one cell (`keyOf`). */
  at(cell: number): ReadonlySet<D> | undefined {
    return this.cells.get(cell);
  }

  /** The drops in the cell of a point and the eight around it. */
  *around(x: number, y: number): Generator<D> {
    const cx = cellOf(x);
    const cy = cellOf(y);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        yield* this.cells.get(keyOf(cx + dx, cy + dy)) ?? [];
  }

  /** A new drop: the players around it learn its point. */
  add(drop: D): void {
    if (this.stale) this.followAll();
    let cell = this.cells.get(drop.cell);
    if (!cell) this.cells.set(drop.cell, (cell = new Set()));
    cell.add(drop);
    this.count++;
    const cx = Math.floor(drop.cell / 32_768) - OFFSET;
    const cy = (drop.cell % 32_768) - OFFSET;
    const put = [drop.point()];
    for (let dx = -RANGE; dx <= RANGE; dx++)
      for (let dy = -RANGE; dy <= RANGE; dy++)
        for (const source of this.inCell.get(keyOf(cx + dx, cy + dy)) ?? []) {
          this.followers.get(source)?.known.add(drop);
          drop.known.add(source);
          emitNet(EVENTS.drops, source, put, [], false);
        }
  }

  /** A drop went away: the players who knew it are told. */
  delete(drop: D): void {
    const cell = this.cells.get(drop.cell);
    if (!cell?.delete(drop)) return;
    if (cell.size === 0) this.cells.delete(drop.cell);
    if (--this.count === 0) this.stale = true;
    for (const source of drop.known) {
      this.followers.get(source)?.known.delete(drop);
      emitNet(EVENTS.drops, source, [], [drop.id], false);
    }
    drop.known.clear();
  }

  /** A character entered the world: his client gets the drops around him (replacing what it had). */
  start(source: number): void {
    this.stop(source);
    const p = coordsOf(source);
    const follower: Follower<D> = {
      cell: keyOf(cellOf(p.x), cellOf(p.y)),
      known: new Set(),
    };
    this.followers.set(source, follower);
    this.enter(source, follower.cell);
    this.diff(source, follower, cellOf(p.x), cellOf(p.y), true);
  }

  /** The character left (logout, switch, drop). */
  stop(source: number): void {
    const follower = this.followers.get(source);
    if (!follower) return;
    this.followers.delete(source);
    this.forget(source, follower);
  }

  /** Checks every follower's cell; a changed cell sends the drops that came into or left his area. */
  followAll(): void {
    this.stale = false;
    for (const [source, follower] of this.followers) {
      const p = coordsOf(source);
      const cx = cellOf(p.x);
      const cy = cellOf(p.y);
      const cell = keyOf(cx, cy);
      if (cell === follower.cell) continue;
      this.leave(source, follower.cell);
      follower.cell = cell;
      this.enter(source, cell);
      this.diff(source, follower, cx, cy, false);
    }
  }

  private diff(
    source: number,
    follower: Follower<D>,
    cx: number,
    cy: number,
    reset: boolean,
  ): void {
    const visible = new Set<D>();
    for (let dx = -RANGE; dx <= RANGE; dx++)
      for (let dy = -RANGE; dy <= RANGE; dy++)
        for (const drop of this.cells.get(keyOf(cx + dx, cy + dy)) ?? [])
          visible.add(drop);
    const put: DropPoint[] = [];
    const remove: string[] = [];
    for (const drop of follower.known) {
      if (visible.has(drop)) continue;
      follower.known.delete(drop);
      drop.known.delete(source);
      remove.push(drop.id);
    }
    for (const drop of visible) {
      if (follower.known.has(drop)) continue;
      follower.known.add(drop);
      drop.known.add(source);
      put.push(drop.point());
    }
    if (!reset && put.length === 0 && remove.length === 0) return;
    emitNet(EVENTS.drops, source, put.slice(0, CHUNK), remove, reset);
    for (let i = CHUNK; i < put.length; i += CHUNK)
      emitNet(EVENTS.drops, source, put.slice(i, i + CHUNK), [], false);
  }

  private enter(source: number, cell: number): void {
    let set = this.inCell.get(cell);
    if (!set) this.inCell.set(cell, (set = new Set()));
    set.add(source);
  }

  private leave(source: number, cell: number): void {
    const set = this.inCell.get(cell);
    set?.delete(source);
    if (set?.size === 0) this.inCell.delete(cell);
  }

  private forget(source: number, follower: Follower<D>): void {
    this.leave(source, follower.cell);
    for (const drop of follower.known) drop.known.delete(source);
  }
}
