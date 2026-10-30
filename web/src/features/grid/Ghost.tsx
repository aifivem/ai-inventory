import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { CELL_GAP_VH, CELL_VH, imageUrl } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { SLOT_VH } from "../panels/QuickSlots";
import { drag, useDrag } from "./drag";
import { CornerLabels, TILE_CLASS } from "./ItemTile";

/** The dragged item, held from its centre; moved with a compositor transform outside React renders. */
export function Ghost() {
  const state = useDrag();
  const ref = useRef<HTMLDivElement>(null);
  const def = useAppSelector((s) =>
    state ? s.inventory.items[state.name] : undefined,
  );
  const dragging = state !== null;

  useEffect(() => {
    if (!dragging) return;
    return drag.onMove((x, y) => {
      if (ref.current)
        ref.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    });
  }, [dragging]);

  if (!state) return null;
  const src = def ? imageUrl(def.image) : null;
  // Near the quick slots a big item shrinks to fit one, so the slot under the pointer stays visible.
  const scale = state.small
    ? Math.min(1, (SLOT_VH * 0.9) / (Math.max(state.w, state.h) * CELL_VH))
    : 1;
  // The outer box is the whole cell area (the drop maths centres it on the pointer), the visible box is inset like a grid tile.
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-[70]"
      style={{
        width: `${state.w * CELL_VH}vh`,
        height: `${state.h * CELL_VH}vh`,
        padding: `${CELL_GAP_VH / 2}vh`,
      }}
    >
      <div
        className={cn(
          TILE_CLASS,
          "relative size-full border-tgi-green bg-float/90 [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.5)] transition-transform duration-150 ease-out",
        )}
        style={{ transform: `scale(${scale})` }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className={cn(
              "max-h-full max-w-full object-contain",
              state.rotated && "[transform:rotate(90deg)]",
            )}
          />
        ) : (
          <FontAwesomeIcon icon={faBox} className="text-[2.2vh] text-text-3" />
        )}
        <CornerLabels
          count={state.count}
          grams={(def?.weight ?? 0) * state.count}
        />
      </div>
    </div>
  );
}
