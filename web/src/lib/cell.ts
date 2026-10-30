/**
 * One grid cell in vh: every grid on the screen uses the same size, set from the column count when the player's
 * inventory arrives (a joined grid about 52vh wide, at most 6.4vh a cell). Read it at render, never cache it.
 */
export let CELL_VH = 5.2;

/** Picks the cell size for a column count (every inventory has the panel's column count). */
export function setCellFor(columns: number): void {
  CELL_VH = Math.min(6.4, 52 / Math.max(1, columns));
}

/** Visual gap between cells in vh: the grid is joined (boxes touch), only their hairlines separate them. */
export const CELL_GAP_VH = 0;

/** A rarity colour (`#rrggbb`) at an alpha, for box fills and borders. */
export function tint(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** vh to px at the current window height. */
export const vh = (value: number): number => (value * window.innerHeight) / 100;

/** Picture url of an item: a file of this NUI's images folder, or a full https link. */
export const imageUrl = (image: string): string | null =>
  !image ? null : /^https?:\/\//.test(image) ? image : `./images/${image}`;

/** Grams to kg text with one decimal. */
export const kg = (grams: number): string => (grams / 1000).toFixed(1);
