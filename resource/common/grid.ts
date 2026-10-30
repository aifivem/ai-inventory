/**
 * Grid placement, shared by the server (authority) and the NUI (drag highlight). An inventory is `columns x rows`
 * cells; a stack sits at its anchor cell (`slot`, 1-based, row-major) and covers `w x h` cells (`h x w` when turned).
 * No natives here.
 */

export interface Size {
  w: number;
  h: number;
}

/** What the grid needs of a stack. */
export interface Placed {
  slot: number;
  w: number;
  h: number;
}

export const footprint = (size: Size, rotated: boolean): Size =>
  rotated ? { w: size.h, h: size.w } : size;

/** Cell index (0-based) -> anchor slot (1-based) covering it, 0 = empty. */
export class Occupancy {
  readonly cells: Uint32Array;

  constructor(
    readonly columns: number,
    readonly rows: number,
  ) {
    this.cells = new Uint32Array(columns * rows);
  }

  static of(
    columns: number,
    rows: number,
    stacks: Iterable<Placed>,
  ): Occupancy {
    const grid = new Occupancy(columns, rows);
    for (const stack of stacks)
      grid.mark(stack.slot, stack.w, stack.h, stack.slot);
    return grid;
  }

  /** Writes `value` into the cells `w x h` from `slot` covers (no bounds check: callers checked `fits`). */
  mark(slot: number, w: number, h: number, value: number): void {
    const x0 = (slot - 1) % this.columns;
    const y0 = Math.floor((slot - 1) / this.columns);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        this.cells[y * this.columns + x] = value;
  }

  /** Whether `w x h` at `slot` stays inside the grid and covers only empty cells or cells of `ignore` (a moving stack). */
  fits(slot: number, w: number, h: number, ignore = 0): boolean {
    if (slot < 1 || slot > this.cells.length) return false;
    const x0 = (slot - 1) % this.columns;
    const y0 = Math.floor((slot - 1) / this.columns);
    if (x0 + w > this.columns || y0 + h > this.rows) return false;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const cell = this.cells[y * this.columns + x] ?? 0;
        if (cell !== 0 && cell !== ignore) return false;
      }
    }
    return true;
  }

  /** Anchor slots of the stacks the area covers (for swaps and the drag highlight). */
  covered(slot: number, w: number, h: number): Set<number> {
    const found = new Set<number>();
    const x0 = (slot - 1) % this.columns;
    const y0 = Math.floor((slot - 1) / this.columns);
    for (let y = y0; y < Math.min(y0 + h, this.rows); y++) {
      for (let x = x0; x < Math.min(x0 + w, this.columns); x++) {
        const cell = this.cells[y * this.columns + x] ?? 0;
        if (cell !== 0) found.add(cell);
      }
    }
    return found;
  }

  /** First free place for `size`, trying it as given, then turned; null when the grid has none. */
  findPlace(size: Size): { slot: number; rotated: boolean } | null {
    for (const rotated of size.w === size.h ? [false] : [false, true]) {
      const { w, h } = footprint(size, rotated);
      for (let slot = 1; slot <= this.cells.length; slot++) {
        if (this.cells[slot - 1] === 0 && this.fits(slot, w, h))
          return { slot, rotated };
      }
    }
    return null;
  }
}
