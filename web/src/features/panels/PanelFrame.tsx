import { type ReactNode } from "react";
import type { InventoryView } from "../../../../resource/common/nui";
import { formatWeight } from "@aicore-fivem/lib/shared";
import { CELL_VH } from "../../lib/cell";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";

/** Width of a grid of `columns` cells (the card adds its padding around it). */
export const sideWidth = (columns: number): string => `${columns * CELL_VH}vh`;

/** One inventory card (tgiann grid layout): name in caps and the weight, the weight bar, then the body. */
export function PanelFrame({
  title,
  kind,
  weight,
  bar,
  width,
  footer,
  children,
}: {
  title: string;
  kind?: string;
  weight?: ReactNode;
  bar?: ReactNode;
  width: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="flex max-h-full min-h-0 shrink-0 flex-col gap-[0.8vh] self-start rounded-[1vh] border-[0.1vh] border-white/6 bg-[rgba(14,14,14,0.88)] p-[1.2vh]"
      style={{ width: `calc(${width} + 2.6vh)` }}
    >
      <header className="flex flex-col gap-[0.8vh]">
        <div className="flex items-baseline justify-between gap-[1vh]">
          <div className="flex min-w-0 items-baseline gap-[0.8vh]">
            <h2 className="truncate text-[1.4vh] font-bold tracking-[0.08em] uppercase">
              {title}
            </h2>
            {kind && (
              <span className="shrink-0 text-[1.15vh] text-text-3 uppercase">
                {kind}
              </span>
            )}
          </div>
          {weight}
        </div>
        {bar ?? <div className="h-[0.4vh] bg-white/8" />}
      </header>
      {children}
      {footer}
    </section>
  );
}

export function Weight({ view }: { view: InventoryView }) {
  const items = useAppSelector((state) => state.inventory.items);
  const weight = view.stacks.reduce(
    (sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count,
    0,
  );
  return (
    <span className="shrink-0 text-[1.2vh] whitespace-nowrap uppercase tabular-nums">
      <span className="font-semibold text-white">{formatWeight(weight)}</span>
      <span className="text-white/50">
        {view.maxWeight > 0 ? ` / ${formatWeight(view.maxWeight)}` : ""}
      </span>
    </span>
  );
}

/** The weight bar under the header: a thin track, green fill (red when nearly full). */
export function WeightBar({ view }: { view: InventoryView }) {
  const items = useAppSelector((state) => state.inventory.items);
  if (view.maxWeight <= 0) return null;
  const weight = view.stacks.reduce(
    (sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count,
    0,
  );
  const ratio = Math.min(1, weight / view.maxWeight);
  return (
    <div className="h-[0.4vh] overflow-hidden bg-white/8">
      <div
        className={cn(
          "h-full w-full origin-left transition-transform duration-300 ease-out",
          ratio >= 0.9 ? "bg-warn" : "bg-tgi-green",
        )}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
