import { useMemo } from "react";
import { Occupancy } from "../../../../resource/common/grid";
import type { InventoryView, ItemView } from "../../../../resource/common/nui";
import { CELL_VH } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { useDrag, type DragState } from "./drag";
import { ItemTile } from "./ItemTile";

type Fit = "free" | "merge" | "swap" | "blocked";

const sizeOf = (def: ItemView | undefined, rotated: boolean) => {
  const w = def?.w ?? 1;
  const h = def?.h ?? 1;
  return rotated ? { w: h, h: w } : { w, h };
};

/** How the dragged item would land at the target: the same rules the server applies (weight aside). */
function fitAt(view: InventoryView, grid: Occupancy, drag: DragState, items: Record<string, ItemView>): { fit: Fit; slot: number; w: number; h: number } | null {
  if (!drag.target || drag.target.inv !== view.id) return null;
  const def = items[drag.name];
  const { w, h } = sizeOf(def, drag.rotated);
  const slot = drag.target.slot;
  const x = (slot - 1) % view.columns;
  const y = Math.floor((slot - 1) / view.columns);
  if (x + w > view.columns || y + h > view.rows) return { fit: "blocked", slot, w, h };
  const covered = grid.covered(slot, w, h);
  if (drag.from === view.id && drag.whole) covered.delete(drag.slot);
  if (covered.size === 0) return { fit: "free", slot, w, h };
  if (covered.size > 1) return { fit: "blocked", slot, w, h };
  const target = view.stacks.find((s) => s.slot === [...covered][0]);
  if (target && target.name === drag.name && (def?.stack ?? 1) > 1) return { fit: "merge", slot, w, h };
  return { fit: drag.whole ? "swap" : "blocked", slot, w, h };
}

const FIT_STYLE: Record<Fit, string> = {
  free: "border-accent bg-[rgba(var(--accent-rgb),0.14)]",
  merge: "border-warn bg-[rgba(var(--warn-rgb),0.16)]",
  swap: "border-warn bg-[rgba(var(--warn-rgb),0.16)]",
  blocked: "border-danger bg-[rgba(var(--danger-rgb),0.16)]",
};

/** An inventory grid: cell lines, the drop highlight while dragging, and the stacks. Quick slots marked on the player grid. */
export function Grid({ view, own }: { view: InventoryView; own: boolean }) {
  const items = useAppSelector((state) => state.inventory.items);
  const drag = useDrag();
  const grid = useMemo(
    () => Occupancy.of(view.columns, view.rows, view.stacks.map((s) => ({ slot: s.slot, ...sizeOf(items[s.name], s.rotated) }))),
    [view, items],
  );
  const fit = drag ? fitAt(view, grid, drag, items) : null;

  return (
    <div
      data-grid={view.id}
      data-columns={view.columns}
      data-rows={view.rows}
      className="relative shrink-0 rounded-[0.6vh] border border-line bg-bg"
      style={{
        width: `${view.columns * CELL_VH}vh`,
        height: `${view.rows * CELL_VH}vh`,
        backgroundImage: "linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)",
        backgroundSize: `${CELL_VH}vh ${CELL_VH}vh`,
      }}
    >
      {own &&
        [1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="pointer-events-none absolute z-20 text-[1vh] font-semibold text-text-3" style={{ left: `${(n - 1) * CELL_VH + 0.5}vh`, top: `${CELL_VH - 1.5}vh` }}>
            {n}
          </span>
        ))}
      {fit && (
        <div
          className={cn("pointer-events-none absolute z-10 rounded-[0.5vh] border transition-[left,top] duration-75", FIT_STYLE[fit.fit])}
          style={{
            left: `${((fit.slot - 1) % view.columns) * CELL_VH}vh`,
            top: `${Math.floor((fit.slot - 1) / view.columns) * CELL_VH}vh`,
            width: `${Math.min(fit.w, view.columns - ((fit.slot - 1) % view.columns)) * CELL_VH}vh`,
            height: `${Math.min(fit.h, view.rows - Math.floor((fit.slot - 1) / view.columns)) * CELL_VH}vh`,
          }}
        />
      )}
      {view.stacks.map((stack) => (
        <ItemTile key={stack.slot} stack={stack} def={items[stack.name]} inv={view.id} columns={view.columns} own={own} />
      ))}
    </div>
  );
}
