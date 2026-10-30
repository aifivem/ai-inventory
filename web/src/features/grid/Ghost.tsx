import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { CELL_GAP_VH, CELL_VH, imageUrl } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { drag, useDrag } from "./drag";
import { CornerLabels, TILE_CLASS } from "./ItemTile";

/** The dragged item under the pointer; moved with a compositor transform outside React renders. */
export function Ghost() {
  const state = useDrag();
  const ref = useRef<HTMLDivElement>(null);
  const def = useAppSelector((s) =>
    state ? s.inventory.items[state.name] : undefined,
  );
  const grabX = state?.grabX ?? 0;
  const grabY = state?.grabY ?? 0;

  useEffect(() => {
    if (!state) return;
    return drag.onMove((x, y) => {
      if (ref.current)
        ref.current.style.transform = `translate3d(${x - grabX}px, ${y - grabY}px, 0)`;
    });
  }, [state, grabX, grabY]);

  if (!state) return null;
  const w = def ? (state.rotated ? def.h : def.w) : 1;
  const h = def ? (state.rotated ? def.w : def.h) : 1;
  const src = def ? imageUrl(def.image) : null;
  // The outer box is the whole cell area (the grab point is measured from the cell corner), the visible box is inset like a grid tile.
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-[70]"
      style={{
        width: `${w * CELL_VH}vh`,
        height: `${h * CELL_VH}vh`,
        padding: `${CELL_GAP_VH / 2}vh`,
      }}
    >
      <div
        className={cn(
          TILE_CLASS,
          "relative size-full border-tgi-green bg-float/90 [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.5)]",
        )}
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
