import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faCubes, faGun, faMagnifyingGlass, faPuzzlePiece, faWeightHanging, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { InventoryView } from "../../../../resource/common/nui";
import { ScrollArea } from "../../components/ui/scroll-area";
import { CELL_VH, kg } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { Grid, type StackFilter } from "../grid/Grid";

/** Width of a side of the screen: one grid of `columns` cells. */
export const sideWidth = (columns: number): string => `${columns * CELL_VH}vh`;

/** One side of the screen: green dot + name (+ kind), optional weight, the bar line under it, then the body. No outer box. */
export function PanelFrame({ title, kind, weight, bar, width, children }: { title: string; kind?: string; weight?: ReactNode; bar?: ReactNode; width: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 shrink-0 flex-col gap-[1.2vh]" style={{ width }}>
      <header className="flex flex-col gap-[0.8vh]">
        <div className="flex items-center justify-between gap-[2vh]">
          <div className="flex min-w-0 items-center gap-[0.8vh]">
            <span className="size-[1.1vh] shrink-0 rounded-full bg-tgi-green" />
            <h2 className="truncate text-[1.6vh] font-semibold leading-[1.3]">{title}</h2>
            {kind && <span className="shrink-0 text-[1.3vh] text-text-3">{kind}</span>}
          </div>
          {weight}
        </div>
        {bar ?? <div className="h-[0.3vh] rounded-full bg-white/4" />}
      </header>
      {children}
    </section>
  );
}

function Weight({ view }: { view: InventoryView }) {
  const t = useLang();
  const items = useAppSelector((state) => state.inventory.items);
  const weight = view.stacks.reduce((sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count, 0);
  return (
    <span className="flex shrink-0 items-center gap-[0.8vh] text-[1.6vh] tabular-nums">
      {view.maxWeight > 0 ? t("UI_WEIGHT", kg(weight), kg(view.maxWeight)) : t("UI_KG", kg(weight))}
      <FontAwesomeIcon icon={faWeightHanging} className="text-[1.8vh]" />
    </span>
  );
}

/** The weight bar under the header: a thin track, green fill (red when nearly full). */
function WeightBar({ view }: { view: InventoryView }) {
  const items = useAppSelector((state) => state.inventory.items);
  if (view.maxWeight <= 0) return null;
  const weight = view.stacks.reduce((sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count, 0);
  const ratio = Math.min(1, weight / view.maxWeight);
  return (
    <div className="h-[0.3vh] overflow-hidden rounded-full bg-white/4">
      <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", ratio > 0.9 ? "bg-danger" : "bg-tgi-green")} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

const FILTERS: Array<{ type: string; icon: IconDefinition; label: string }> = [
  { type: "weapon", icon: faGun, label: "ADMIN_O_WEAPON" },
  { type: "ammo", icon: faBullseye, label: "ADMIN_O_AMMO" },
  { type: "component", icon: faPuzzlePiece, label: "ADMIN_O_COMPONENT" },
  { type: "item", icon: faCubes, label: "ADMIN_O_ITEM" },
];

const filterButton = (active: boolean) =>
  cn(
    "flex h-[3.6vh] min-w-[3.6vh] items-center justify-center rounded-full border bg-white/2 text-[1.5vh] transition-[background-color,border-color,color] duration-150 active:[transform:scale(0.94)]",
    active ? "border-dashed border-tgi-green text-tgi-green" : "border-white/10 text-text-3 hover:border-tgi-green hover:text-white",
  );

/** Search pill and item kind filters: stacks that do not match are dimmed in place (the grid keeps its layout). */
function Toolbar({ filter, onChange }: { filter: StackFilter; onChange: (filter: StackFilter) => void }) {
  const t = useLang();
  return (
    <div className="flex items-center gap-[0.6vh]">
      <label
        className={cn(
          "flex h-[3.6vh] w-[24vh] items-center gap-[0.6vh] rounded-full border bg-[#2222224D] px-[1.4vh] transition-colors duration-150 focus-within:border-tgi-green-40",
          filter.search ? "border-dashed border-tgi-green" : "border-white/8",
        )}
      >
        <input
          value={filter.search}
          placeholder={t("UI_SEARCH")}
          aria-label={t("UI_SEARCH")}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[1.3vh] text-white outline-none placeholder:text-text-3"
        />
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[1.4vh] text-text-3" />
      </label>
      <div className="ml-auto flex items-center gap-[0.6vh]">
        <button type="button" className={cn(filterButton(filter.type === null), "px-[1.2vh] text-[1.4vh]")} onClick={() => onChange({ ...filter, type: null })}>
          {t("UI_ALL")}
        </button>
        {FILTERS.map((f) => (
          <button key={f.type} type="button" aria-label={t(f.label)} className={filterButton(filter.type === f.type)} onClick={() => onChange({ ...filter, type: filter.type === f.type ? null : f.type })}>
            <FontAwesomeIcon icon={f.icon} />
          </button>
        ))}
      </div>
    </div>
  );
}

const KIND_KEY = { player: "UI_KIND_PLAYER", drop: "UI_KIND_DROP", stash: "UI_KIND_STASH", trunk: "UI_KIND_TRUNK", glovebox: "UI_KIND_GLOVEBOX", temp: "UI_KIND_TEMP", other: "UI_KIND_OTHER" } as const;

/** An inventory with its weight, search and filters; the grid scrolls when it is taller than the screen. */
export function InventoryPanel({ view, own }: { view: InventoryView; own: boolean }) {
  const t = useLang();
  const [filter, setFilter] = useState<StackFilter>({ search: "", type: null });
  const title = own ? t("UI_INVENTORY") : view.label || t(KIND_KEY[view.kind]);
  const kind = own || !view.label ? undefined : t(KIND_KEY[view.kind]);
  return (
    <PanelFrame title={title} kind={kind} weight={<Weight view={view} />} bar={<WeightBar view={view} />} width={sideWidth(view.columns)}>
      <Toolbar filter={filter} onChange={setFilter} />
      <ScrollArea className="max-h-[60vh]">
        <Grid view={view} own={own} filter={filter} />
      </ScrollArea>
    </PanelFrame>
  );
}
