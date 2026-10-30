import { useMemo } from "react";
import { hotbarSlot, HOTBAR_SIZE } from "../../../../resource/common/grid";
import type { Stack } from "../../../../resource/common/nui";
import { imageUrl, tint } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { itemUse } from "../actions";
import { drag, useDrag } from "../grid/drag";
import { ui } from "../ui";

export const SLOT_VH = 7.4;

/** The stacks in the player's quick slots (keys 1-5): their own five slots, not cells of the grid. */
export function useQuickStacks(): Array<Stack | undefined> {
  const view = useAppSelector((s) => s.inventory.player);
  return useMemo(
    () =>
      Array.from({ length: HOTBAR_SIZE }, (_, i) =>
        view?.stacks.find((s) => s.slot === hotbarSlot(i)),
      ),
    [view],
  );
}

/**
 * The quick slots under the equipment column: drop a stack from the grid on one, drag it back out, right click for
 * its menu, double click to use it. Each holds one stack of any size; its weight counts like the grid's.
 */
export function QuickSlots() {
  const items = useAppSelector((s) => s.inventory.items);
  const inv = useAppSelector((s) => s.inventory.player?.id ?? "");
  const dragging = useDrag();
  const slots = useQuickStacks();
  return (
    <div data-quick-slots className="flex gap-[0.6vh]">
      {slots.map((stack, i) => {
        const slot = hotbarSlot(i);
        const def = stack ? items[stack.name] : undefined;
        const src = def ? imageUrl(def.image) : null;
        const target =
          dragging?.target?.inv === inv && dragging.target.slot === slot;
        const lifted = dragging?.from === inv && dragging.slot === slot;
        return (
          <div
            key={i}
            data-hotbar
            data-inv={inv}
            data-slot={slot}
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[0.2vh] border-[0.1vh] border-white/12 bg-[rgba(16,16,16,0.86)] transition-[border-color] duration-150",
              target && "border-tgi-green",
              lifted && "opacity-35",
            )}
            style={{
              width: `${SLOT_VH}vh`,
              height: `${SLOT_VH}vh`,
              ...(def?.rarity && !target
                ? {
                    backgroundColor: tint(def.rarity, 0.22),
                    borderColor: tint(def.rarity, 0.55),
                  }
                : null),
            }}
            onPointerDown={(event) => {
              if (!stack || event.button !== 0) return;
              event.preventDefault();
              const count = event.shiftKey
                ? Math.max(1, Math.floor(stack.count / 2))
                : event.ctrlKey
                  ? 1
                  : stack.count;
              const w = def?.w ?? 1;
              const h = def?.h ?? 1;
              drag.start(
                {
                  from: inv,
                  slot,
                  name: stack.name,
                  count,
                  whole: count === stack.count,
                  rotated: stack.rotated,
                  w: stack.rotated ? h : w,
                  h: stack.rotated ? w : h,
                },
                event.clientX,
                event.clientY,
              );
            }}
            onMouseUp={(event) => {
              if (stack && event.button === 2)
                ui.setMenu({ inv, slot, x: event.clientX, y: event.clientY });
            }}
            onDoubleClick={() => stack && itemUse(slot)}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[4.4vh] leading-none font-medium text-white/10">
              {i + 1}
            </span>
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="relative max-h-[78%] max-w-[78%] object-contain"
              />
            )}
            {stack && stack.count > 1 && (
              <span className="absolute right-[0.5vh] bottom-[0.4vh] text-[1.2vh] font-bold text-white tabular-nums">
                {stack.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
