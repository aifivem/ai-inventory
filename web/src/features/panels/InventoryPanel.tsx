import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faCubes,
  faGun,
  faMagnifyingGlass,
  faPuzzlePiece,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { InventoryView } from "../../../../resource/common/nui";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { CELL_VH, kg } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { Grid, type StackFilter } from "../grid/Grid";

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

function Weight({ view }: { view: InventoryView }) {
  const t = useLang();
  const items = useAppSelector((state) => state.inventory.items);
  const weight = view.stacks.reduce(
    (sum, s) => sum + (items[s.name]?.weight ?? 0) * s.count,
    0,
  );
  return (
    <span className="shrink-0 text-[1.2vh] whitespace-nowrap uppercase tabular-nums">
      <span className="font-semibold text-white">{kg(weight)}</span>
      <span className="text-white/50">
        {view.maxWeight > 0 ? ` / ${t("UI_KG", kg(view.maxWeight))}` : ""}
      </span>
    </span>
  );
}

/** The weight bar under the header: a thin track, green fill (red when nearly full). */
function WeightBar({ view }: { view: InventoryView }) {
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

const FILTERS: Array<{ type: string; icon: IconDefinition; label: string }> = [
  { type: "weapon", icon: faGun, label: "ADMIN_O_WEAPON" },
  { type: "ammo", icon: faBullseye, label: "ADMIN_O_AMMO" },
  { type: "component", icon: faPuzzlePiece, label: "ADMIN_O_COMPONENT" },
  { type: "item", icon: faCubes, label: "ADMIN_O_ITEM" },
];

/** Narrower grids than this show the kind filters as icons with a tooltip; wider ones show icon and label. */
const LABELLED_COLUMNS = 99;

const filterButton = (active: boolean) =>
  cn(
    "flex h-[3.2vh] min-w-[3.2vh] shrink-0 items-center justify-center gap-[0.7vh] rounded-[0.4vh] border-[0.1vh] text-[1.3vh] transition-[background-color,border-color,color] duration-150 active:[transform:scale(0.94)]",
    active
      ? "border-tgi-green-40 bg-tgi-green-10 text-tgi-green"
      : "border-white/10 bg-white/4 text-text-3 hover:border-white/30 hover:text-white",
  );

/** Search pill and item kind filters: stacks that do not match are dimmed in place (the grid keeps its layout). */
function Toolbar({
  filter,
  labelled,
  onChange,
}: {
  filter: StackFilter;
  labelled: boolean;
  onChange: (filter: StackFilter) => void;
}) {
  const t = useLang();
  return (
    <div className="flex items-center gap-[0.6vh]">
      <label
        className={cn(
          "flex h-[3.2vh] min-w-[10vh] flex-1 items-center gap-[0.6vh] rounded-[0.4vh] border-[0.1vh] bg-white/4 px-[1vh] transition-colors duration-150 focus-within:border-tgi-green-40",
          filter.search ? "border-tgi-green-40" : "border-white/10",
        )}
      >
        <input
          value={filter.search}
          placeholder={t("UI_SEARCH")}
          aria-label={t("UI_SEARCH")}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[1.3vh] text-white outline-none placeholder:text-text-3"
        />
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="text-[1.4vh] text-text-3"
        />
      </label>
      <div className="flex shrink-0 items-center gap-[0.6vh]">
        <button
          type="button"
          aria-pressed={filter.type === null}
          className={cn(
            filterButton(filter.type === null),
            "px-[1vh] text-[1.2vh] font-medium",
          )}
          onClick={() => onChange({ ...filter, type: null })}
        >
          {t("UI_ALL")}
        </button>
        {FILTERS.map((f) => {
          const button = (
            <button
              key={f.type}
              type="button"
              aria-label={labelled ? undefined : t(f.label)}
              aria-pressed={filter.type === f.type}
              className={cn(
                filterButton(filter.type === f.type),
                labelled && "pr-[1.3vh] pl-[1.1vh] text-[1.3vh] font-medium",
              )}
              onClick={() =>
                onChange({
                  ...filter,
                  type: filter.type === f.type ? null : f.type,
                })
              }
            >
              <FontAwesomeIcon
                icon={f.icon}
                className={labelled ? "text-[1.3vh]" : undefined}
              />
              {labelled && t(f.label)}
            </button>
          );
          return labelled ? (
            button
          ) : (
            <Tooltip key={f.type}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="w-auto px-[0.8vh] py-[0.4vh] text-[1.2vh] text-white/90"
              >
                {t(f.label)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

const KIND_KEY = {
  player: "UI_KIND_PLAYER",
  drop: "UI_KIND_DROP",
  stash: "UI_KIND_STASH",
  trunk: "UI_KIND_TRUNK",
  glovebox: "UI_KIND_GLOVEBOX",
  temp: "UI_KIND_TEMP",
  other: "UI_KIND_OTHER",
} as const;

/** An inventory with its weight, search and filters; the grid scrolls when it is taller than the screen. */
export function InventoryPanel({
  view,
  own,
  footer,
}: {
  view: InventoryView;
  own: boolean;
  footer?: ReactNode;
}) {
  const t = useLang();
  const [filter, setFilter] = useState<StackFilter>({ search: "", type: null });
  const title = own ? t("UI_INVENTORY") : view.label || t(KIND_KEY[view.kind]);
  const kind = own || !view.label ? undefined : t(KIND_KEY[view.kind]);
  return (
    <PanelFrame
      title={title}
      kind={kind}
      weight={<Weight view={view} />}
      bar={<WeightBar view={view} />}
      width={sideWidth(view.columns)}
      footer={footer}
    >
      <Toolbar
        filter={filter}
        labelled={view.columns >= LABELLED_COLUMNS}
        onChange={setFilter}
      />
      <ScrollArea className="min-h-0">
        <Grid view={view} own={own} filter={filter} />
      </ScrollArea>
    </PanelFrame>
  );
}
