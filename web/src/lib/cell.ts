/** One grid cell in vh (every grid on the screen uses the same size). */
export const CELL_VH = 7.2;

/** Visual gap between cells in vh: boxes are inset by half of it, the cell pitch stays CELL_VH. */
export const CELL_GAP_VH = 0.5;

/** vh to px at the current window height. */
export const vh = (value: number): number => (value * window.innerHeight) / 100;

/** Picture url of an item: a file of this NUI's images folder, or a full https link. */
export const imageUrl = (image: string): string | null =>
  !image ? null : /^https?:\/\//.test(image) ? image : `./images/${image}`;

/** Grams to kg text with one decimal. */
export const kg = (grams: number): string => (grams / 1000).toFixed(1);
