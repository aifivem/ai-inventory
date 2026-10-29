import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import { CELL_VH, imageUrl } from "../../lib/cell";
import { useAppSelector } from "../../store";
import { drag, useDrag } from "./drag";

/** The dragged item under the pointer; moved with a compositor transform outside React renders. */
export function Ghost() {
  const state = useDrag();
  const ref = useRef<HTMLDivElement>(null);
  const def = useAppSelector((s) => (state ? s.inventory.items[state.name] : undefined));
  const grabX = state?.grabX ?? 0;
  const grabY = state?.grabY ?? 0;

  useEffect(() => {
    if (!state) return;
    return drag.onMove((x, y) => {
      if (ref.current) ref.current.style.transform = `translate3d(${x - grabX}px, ${y - grabY}px, 0)`;
    });
  }, [state, grabX, grabY]);

  if (!state) return null;
  const w = def ? (state.rotated ? def.h : def.w) : 1;
  const h = def ? (state.rotated ? def.w : def.h) : 1;
  const src = def ? imageUrl(def.image) : null;
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-[70] flex items-center justify-center rounded-[0.5vh] border border-accent bg-raised p-[0.5vh] opacity-90 [box-shadow:0_1.2vh_3.2vh_rgba(0,0,0,0.5)]"
      style={{ width: `${w * CELL_VH}vh`, height: `${h * CELL_VH}vh` }}
    >
      {src ? (
        <img src={src} alt="" className={`max-h-full max-w-full object-contain ${state.rotated ? "[transform:rotate(90deg)]" : ""}`} />
      ) : (
        <FontAwesomeIcon icon={faBox} className="text-[2.2vh] text-text-3" />
      )}
      {state.count > 1 && <span className="absolute bottom-[0.3vh] right-[0.5vh] text-[1.2vh] font-semibold tabular-nums">{state.count}</span>}
    </div>
  );
}
