/** The item being dragged: where from, what, how it is turned and where it would land. */
export interface DragState {
  from: string;
  slot: number;
  name: string;
  count: number;
  /** The whole stack moves (not a split). */
  whole: boolean;
  rotated: boolean;
  /** Size in cells as turned now; the ghost hangs from its centre. */
  w: number;
  h: number;
  target: { inv: string; slot: number } | null;
  ground: boolean;
  /** The pointer is near the quick slots: the ghost shrinks to a slot's size. */
  small: boolean;
}
