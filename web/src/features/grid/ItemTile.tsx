import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import type { ItemView, Stack } from "../../../../resource/common/nui";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { CELL_VH, imageUrl, kg } from "../../lib/cell";
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
}

/** What the tooltip lists from metadata (ammo, serial, condition); script data stays hidden. */
function MetaLines({ stack }: { stack: Stack }) {
  const t = useLang();
  const m = stack.metadata;
  return (
    <>
      {typeof m.ammo === "number" && <p className="text-text-3">{t("UI_AMMO", m.ammo)}</p>}
      {typeof m.durability === "number" && <p className="text-text-3">{t("UI_DURABILITY", Math.round(m.durability))}</p>}
      {typeof m.serial === "string" && <p className="text-text-3">{t("UI_SERIAL", m.serial)}</p>}
    </>
  );
}

/** One stack on the grid: picture, short name, count. Drag to move (Shift half, Ctrl one), right click for the menu. */
export const ItemTile = memo(function ItemTile({ stack, def, inv, columns, own }: Props) {
  const t = useLang();
  const dragging = useDrag();
  const w = def ? (stack.rotated ? def.h : def.w) : 1;
  const h = def ? (stack.rotated ? def.w : def.h) : 1;
  const x = (stack.slot - 1) % columns;
  const y = Math.floor((stack.slot - 1) / columns);
  const lifted = dragging?.from === inv && dragging.slot === stack.slot;
  const src = def ? imageUrl(def.image) : null;

  return (
    <Tooltip delayDuration={350} open={dragging ? false : undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={def?.label ?? stack.name}
          className={cn(
            "absolute flex items-center justify-center overflow-hidden rounded-[0.5vh] border border-line bg-raised p-[0.5vh] transition-[border-color,opacity] duration-150 hover:border-line-strong",
            lifted && "opacity-30",
          )}
          style={{ left: `${x * CELL_VH}vh`, top: `${y * CELL_VH}vh`, width: `${w * CELL_VH}vh`, height: `${h * CELL_VH}vh` }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const count = event.shiftKey ? Math.max(1, Math.floor(stack.count / 2)) : event.ctrlKey ? 1 : stack.count;
            drag.start(
              { from: inv, slot: stack.slot, name: stack.name, count, whole: count === stack.count, rotated: stack.rotated, grabX: event.clientX - rect.left, grabY: event.clientY - rect.top },
              event.clientX,
              event.clientY,
            );
          }}
          onMouseUp={(event) => {
            if (event.button === 2) ui.setMenu({ inv, slot: stack.slot, x: event.clientX, y: event.clientY });
          }}
          onDoubleClick={() => own && itemUse(stack.slot)}
        >
          {src ? (
            <img src={src} alt="" draggable={false} className={cn("max-h-full max-w-full object-contain", stack.rotated && "[transform:rotate(90deg)]")} />
          ) : (
            <FontAwesomeIcon icon={faBox} className="text-[2.2vh] text-text-3" />
          )}
          {w * h > 1 && <span className="absolute left-[0.5vh] top-[0.3vh] max-w-[90%] truncate text-[1.05vh] font-medium text-text-3">{def?.label ?? stack.name}</span>}
          {stack.count > 1 && <span className="absolute bottom-[0.3vh] right-[0.5vh] text-[1.2vh] font-semibold tabular-nums text-text">{stack.count}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-[1.45vh] font-semibold text-text">{def?.label ?? stack.name}</p>
        {def?.description && <p className="mt-[0.4vh] leading-[1.4]">{def.description}</p>}
        <p className="mt-[0.6vh] tabular-nums text-text-3">
          {t("UI_STACK_INFO", kg((def?.weight ?? 0) * stack.count), stack.count)}
        </p>
        <MetaLines stack={stack} />
      </TooltipContent>
    </Tooltip>
  );
});
