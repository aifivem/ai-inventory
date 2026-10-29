import type { ReactNode } from "react";
import type { InventoryView } from "../../../../resource/common/nui";
import { ScrollArea } from "../../components/ui/scroll-area";
import { kg } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { Grid } from "../grid/Grid";

/** Panel frame shared by every side of the screen: caption, title, optional right slot, body. */
export function PanelFrame({ caption, title, right, children }: { caption: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex max-h-[84vh] flex-col gap-[1.2vh] rounded-[1vh] border border-line bg-panel p-[1.6vh] [box-shadow:0_2.4vh_6.4vh_rgba(0,0,0,0.45)]">
      <header className="flex items-end justify-between gap-[2vh]">
        <div className="flex min-w-0 flex-col gap-[0.4vh]">
          <span className="text-[1.2vh] uppercase tracking-[0.24em] text-text-3">{caption}</span>
          <h2 className="truncate text-[2vh] font-semibold leading-none">{title}</h2>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function WeightBar({ view }: { view: InventoryView }) {
  const t = useLang();
  const items = useAppSelector((state) => state.inventory.items);
  const weight = view.stacks.reduce((sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count, 0);
  const ratio = view.maxWeight > 0 ? Math.min(1, weight / view.maxWeight) : 0;
  return (
    <div className="flex w-[18vh] flex-col items-end gap-[0.5vh]">
      <span className="text-[1.25vh] tabular-nums text-text-2">{view.maxWeight > 0 ? t("UI_WEIGHT", kg(weight), kg(view.maxWeight)) : kg(weight)}</span>
      {view.maxWeight > 0 && (
        <div className="h-[0.5vh] w-full overflow-hidden rounded-full bg-raised">
          <div className={`h-full rounded-full ${ratio > 0.9 ? "bg-danger" : "bg-accent"}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

const KIND_KEY = { player: "UI_KIND_PLAYER", drop: "UI_KIND_DROP", stash: "UI_KIND_STASH", trunk: "UI_KIND_TRUNK", glovebox: "UI_KIND_GLOVEBOX", temp: "UI_KIND_TEMP", other: "UI_KIND_OTHER" } as const;

/** An inventory with its weight; the grid scrolls when it is taller than the screen. */
export function InventoryPanel({ view, own }: { view: InventoryView; own: boolean }) {
  const t = useLang();
  const caption = t(KIND_KEY[view.kind]);
  const title = own ? t("UI_INVENTORY") : view.label || t(KIND_KEY[view.kind]);
  return (
    <PanelFrame caption={caption} title={title} right={<WeightBar view={view} />}>
      <ScrollArea className="max-h-[70vh]">
        <Grid view={view} own={own} />
      </ScrollArea>
      {own && <p className="text-[1.15vh] text-text-3">{t("UI_QUICK_SLOTS")} · {t("UI_ROTATE_HINT")}</p>}
    </PanelFrame>
  );
}
