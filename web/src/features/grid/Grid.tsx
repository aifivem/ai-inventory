import { memo, useMemo, type ReactNode } from "react";
import { isHotbarSlot, Occupancy } from "../../../../resource/common/grid";
import type { InventoryView, ItemView } from "../../../../resource/common/nui";
import { CELL_GAP_VH, CELL_VH } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { useDrag } from "./drag";
import type { DragState } from "./dragState";
import { ItemTile } from "./ItemTile";

type Fit = "free" | "merge" | "swap" | "blocked";

/** Search text and item kind of a side's toolbar; stacks that do not match are dimmed. */
export interface StackFilter {
  search: string;
  type: string | null;
}

const sizeOf = (def: ItemView | undefined, rotated: boolean) => {
  const w = def?.w ?? 1;
  const h = def?.h ?? 1;
  return rotated ? { w: h, h: w } : { w, h };
};

/** How the dragged item would land at the target: the same rules the server applies (weight aside). */
function fitAt(
  view: InventoryView,
  grid: Occupancy,
  drag: DragState,
  items: Record<string, ItemView>,
): { fit: Fit; slot: number; w: number; h: number } | null {
  if (
    !drag.target ||
    drag.target.inv !== view.id ||
    isHotbarSlot(drag.target.slot)
  )
    return null;
  const def = items[drag.name];
  const { w, h } = sizeOf(def, drag.rotated);
  const slot = drag.target.slot;
  const x = (slot - 1) % view.columns;
  const y = Math.floor((slot - 1) / view.columns);
  if (x + w > view.columns || y + h > view.rows)
    return { fit: "blocked", slot, w, h };
  const covered = grid.covered(slot, w, h);
  if (drag.from === view.id && drag.whole) covered.delete(drag.slot);
  if (covered.size === 0) return { fit: "free", slot, w, h };
  if (covered.size > 1) return { fit: "blocked", slot, w, h };
  const target = view.stacks.find((s) => s.slot === [...covered][0]);
  if (target && target.name === drag.name && (def?.stack ?? 1) > 1)
    return { fit: "merge", slot, w, h };
  return { fit: drag.whole ? "swap" : "blocked", slot, w, h };
}

const FIT_STYLE: Record<Fit, string> = {
  free: "border-tgi-green bg-tgi-green-15",
  merge: "border-warn bg-warn/15",
  swap: "border-warn bg-warn/15",
  blocked: "border-danger bg-danger-bg",
};

const matches = (
  def: ItemView | undefined,
  name: string,
  filter: StackFilter,
): boolean => {
  if (filter.type !== null && (def?.type ?? "item") !== filter.type)
    return false;
  const search = filter.search.trim().toLowerCase();
  return (
    !search ||
    (def?.label ?? name).toLowerCase().includes(search) ||
    name.includes(search)
  );
};

/** The free cells as hairline boxes (covered cells are left out so a big stack's box shows no cell lines). */
const EmptyCells = memo(function EmptyCells({ grid }: { grid: Occupancy }) {
  const half = CELL_GAP_VH / 2;
  const cells: ReactNode[] = [];
  grid.cells.forEach((anchor, i) => {
    if (anchor !== 0) return;
    const x = i % grid.columns;
    const y = Math.floor(i / grid.columns);
    cells.push(
      <div
        key={i}
        className="absolute rounded-[0.2vh] border-[0.1vh] border-white/10 bg-[rgba(16,16,16,0.86)]"
        style={{
          left: `${x * CELL_VH + half}vh`,
          top: `${y * CELL_VH + half}vh`,
          width: `${CELL_VH - CELL_GAP_VH}vh`,
          height: `${CELL_VH - CELL_GAP_VH}vh`,
        }}
      />,
    );
  });
  return <>{cells}</>;
});

/** An inventory grid: empty cells, the drop highlight while dragging, and the stacks (quick slot stacks are not on it). */
export function Grid({
  view,
  own,
  filter,
}: {
  view: InventoryView;
  own: boolean;
  filter: StackFilter;
}) {
  const items = useAppSelector((state) => state.inventory.items);
  const drag = useDrag();
  // Quick slot stacks belong to the player inventory but cover no cells.
  const stacks = useMemo(
    () => view.stacks.filter((s) => !isHotbarSlot(s.slot)),
    [view],
  );
  const grid = useMemo(
    () =>
      Occupancy.of(
        view.columns,
        view.rows,
        stacks.map((s) => ({
          slot: s.slot,
          ...sizeOf(items[s.name], s.rotated),
        })),
      ),
    [view.columns, view.rows, stacks, items],
  );
  const fit = drag ? fitAt(view, grid, drag, items) : null;
  const filtering = filter.type !== null || filter.search.trim() !== "";

  return (
    <div
      data-grid={view.id}
      data-columns={view.columns}
      data-rows={view.rows}
      className="relative shrink-0"
      style={{
        width: `${view.columns * CELL_VH}vh`,
        height: `${view.rows * CELL_VH}vh`,
      }}
    >
      <EmptyCells grid={grid} />
      {fit && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 rounded-[0.2vh] border transition-[left,top] duration-75",
            FIT_STYLE[fit.fit],
          )}
          style={{
            left: `${((fit.slot - 1) % view.columns) * CELL_VH + CELL_GAP_VH / 2}vh`,
            top: `${Math.floor((fit.slot - 1) / view.columns) * CELL_VH + CELL_GAP_VH / 2}vh`,
            width: `${Math.min(fit.w, view.columns - ((fit.slot - 1) % view.columns)) * CELL_VH - CELL_GAP_VH}vh`,
            height: `${Math.min(fit.h, view.rows - Math.floor((fit.slot - 1) / view.columns)) * CELL_VH - CELL_GAP_VH}vh`,
          }}
        />
      )}
      {stacks.map((stack) => (
        <ItemTile
          key={stack.slot}
          stack={stack}
          def={items[stack.name]}
          inv={view.id}
          columns={view.columns}
          own={own}
          dimmed={filtering && !matches(items[stack.name], stack.name, filter)}
        />
      ))}
    </div>
  );
}
