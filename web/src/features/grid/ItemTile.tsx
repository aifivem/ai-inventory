import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import type { ItemView, Stack } from "../../../../resource/common/nui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { CELL_GAP_VH, CELL_VH, imageUrl, kg, tint } from "../../lib/cell";
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
  "flex items-center justify-center overflow-hidden rounded-[0.2vh] border-[0.1vh] px-[0.5vh] pt-[1.6vh] pb-[0.6vh]";

/** What the tooltip lists from metadata (ammo, serial, condition, a stack's own description); script data stays hidden. */
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
      {typeof m.description === "string" && (
        <p className="line-clamp-3 text-text-3 italic">{m.description}</p>
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
            "absolute transition-[border-color,background-color,opacity] duration-150 hover:border-white/45",
            !def?.rarity &&
              "border-white/16 bg-[rgba(34,34,34,0.92)] hover:bg-[rgba(44,44,44,0.94)]",
            (lifted || dimmed) && "opacity-35",
          )}
          style={{
            left: `${x * CELL_VH + half}vh`,
            top: `${y * CELL_VH + half}vh`,
            width: `${w * CELL_VH - CELL_GAP_VH}vh`,
            height: `${h * CELL_VH - CELL_GAP_VH}vh`,
            ...(def?.rarity
              ? {
                  backgroundColor: tint(def.rarity, 0.22),
                  borderColor: tint(def.rarity, 0.55),
                }
              : null),
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const count = event.shiftKey
              ? Math.max(1, Math.floor(stack.count / 2))
              : event.ctrlKey
                ? 1
                : stack.count;
            drag.start(
              {
                from: inv,
                slot: stack.slot,
                name: stack.name,
                count,
                whole: count === stack.count,
                rotated: stack.rotated,
                w,
                h,
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
          <span className="pointer-events-none absolute inset-x-[0.5vh] top-[0.4vh] truncate text-right text-[1.15vh] leading-none font-semibold text-white/80 [text-shadow:0_0.1vh_0.3vh_rgba(0,0,0,0.9)]">
            {def?.label ?? stack.name}
          </span>
          {stack.count > 1 && (
            <span className="pointer-events-none absolute right-[0.5vh] bottom-[0.4vh] text-[1.2vh] leading-none font-bold text-white tabular-nums [text-shadow:0_0.1vh_0.3vh_rgba(0,0,0,0.9)]">
              {stack.count}
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
