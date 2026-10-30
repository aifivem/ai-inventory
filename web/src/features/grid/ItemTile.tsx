import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import type { ItemView, Stack } from "../../../../resource/common/nui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { CELL_GAP_VH, CELL_VH, imageUrl, kg } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { itemUse } from "../actions";
import { ui } from "../ui";
import { drag, useDrag } from "./drag";

interface Props {
  stack: Stack;
  def: ItemView | undefined;
  inv: string;
  columns: number;
  own: boolean;
  /** Does not match the side's search / filter. */
  dimmed: boolean;
}

/** The look of a stack box, shared with the drag ghost: white-alpha rounded cell, hairline, soft inner shade. */
export const TILE_CLASS =
  "flex items-center justify-center overflow-hidden rounded-[0.9vh] border px-[0.6vh] pt-[1.8vh] pb-[0.6vh] [box-shadow:inset_0_0_2.4vh_rgba(0,0,0,0.25)]";

/** What the tooltip lists from metadata (ammo, serial, condition); script data stays hidden. */
function MetaLines({ stack }: { stack: Stack }) {
  const t = useLang();
  const m = stack.metadata;
  return (
    <>
      {typeof m.ammo === "number" && (
        <p className="text-text-3">{t("UI_AMMO", m.ammo)}</p>
      )}
      {typeof m.durability === "number" && (
        <p className="text-text-3">
          {t("UI_DURABILITY", Math.round(m.durability))}
        </p>
      )}
      {typeof m.serial === "string" && (
        <p className="text-text-3">{t("UI_SERIAL", m.serial)}</p>
      )}
    </>
  );
}

/** Count and weight in the top corners of a stack box. */
export function CornerLabels({
  count,
  grams,
}: {
  count: number;
  grams: number;
}) {
  const t = useLang();
  return (
    <>
      <span className="absolute top-[0.6vh] left-[0.6vh] text-[1vh] leading-none font-medium tabular-nums">
        {t("UI_COUNT", count)}
      </span>
      <span className="absolute top-[0.6vh] right-[0.6vh] text-[1vh] leading-none font-medium tabular-nums">
        {t("UI_KG", kg(grams))}
      </span>
    </>
  );
}

/** One stack on the grid: picture, count and weight, name on bigger boxes. Drag to move (Shift half, Ctrl one), right click for the menu. */
export const ItemTile = memo(function ItemTile({
  stack,
  def,
  inv,
  columns,
  own,
  dimmed,
}: Props) {
  const t = useLang();
  const dragging = useDrag();
  const w = def ? (stack.rotated ? def.h : def.w) : 1;
  const h = def ? (stack.rotated ? def.w : def.h) : 1;
  const x = (stack.slot - 1) % columns;
  const y = Math.floor((stack.slot - 1) / columns);
  const lifted = dragging?.from === inv && dragging.slot === stack.slot;
  const src = def ? imageUrl(def.image) : null;
  const half = CELL_GAP_VH / 2;

  return (
    <Tooltip delayDuration={350} open={dragging ? false : undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={def?.label ?? stack.name}
          className={cn(
            TILE_CLASS,
            "absolute border-white/10 bg-white/4 transition-[border-color,background-color,opacity] duration-150 hover:border-tgi-green hover:bg-white/8",
            h > 1 && "pb-[2.4vh]",
            (lifted || dimmed) && "opacity-35",
          )}
          style={{
            left: `${x * CELL_VH + half}vh`,
            top: `${y * CELL_VH + half}vh`,
            width: `${w * CELL_VH - CELL_GAP_VH}vh`,
            height: `${h * CELL_VH - CELL_GAP_VH}vh`,
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const count = event.shiftKey
              ? Math.max(1, Math.floor(stack.count / 2))
              : event.ctrlKey
                ? 1
                : stack.count;
            // The grab point is measured from the cell corner, not the inset box, so the drop cell maths stays the same.
            const inset = (half * window.innerHeight) / 100;
            drag.start(
              {
                from: inv,
                slot: stack.slot,
                name: stack.name,
                count,
                whole: count === stack.count,
                rotated: stack.rotated,
                grabX: event.clientX - rect.left + inset,
                grabY: event.clientY - rect.top + inset,
              },
              event.clientX,
              event.clientY,
            );
          }}
          onMouseUp={(event) => {
            if (event.button === 2)
              ui.setMenu({
                inv,
                slot: stack.slot,
                x: event.clientX,
                y: event.clientY,
              });
          }}
          onDoubleClick={() => own && itemUse(stack.slot)}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className={cn(
                "max-h-full max-w-full object-contain",
                stack.rotated && "[transform:rotate(90deg)]",
              )}
            />
          ) : (
            <FontAwesomeIcon
              icon={faBox}
              className="text-[2.2vh] text-text-3"
            />
          )}
          <CornerLabels
            count={stack.count}
            grams={(def?.weight ?? 0) * stack.count}
          />
          {h > 1 && (
            <span className="absolute inset-x-0 bottom-[0.6vh] truncate px-[1vh] text-center text-[1.1vh] text-white/60">
              {def?.label ?? stack.name}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-[1.45vh] font-semibold text-white">
          {def?.label ?? stack.name}
        </p>
        {def?.description && (
          <p className="mt-[0.4vh] leading-[1.4]">{def.description}</p>
        )}
        <p className="mt-[0.6vh] text-text-3 tabular-nums">
          {t(
            "UI_STACK_INFO",
            kg((def?.weight ?? 0) * stack.count),
            stack.count,
          )}
        </p>
        <MetaLines stack={stack} />
      </TooltipContent>
    </Tooltip>
  );
});
