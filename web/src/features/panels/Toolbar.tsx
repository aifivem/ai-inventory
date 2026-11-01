import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faCubes,
  faGun,
  faMagnifyingGlass,
  faPuzzlePiece,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { type StackFilter } from "../grid/Grid";

const FILTERS: Array<{ type: string; icon: IconDefinition; label: string }> = [
  { type: "weapon", icon: faGun, label: "ADMIN_O_WEAPON" },
  { type: "ammo", icon: faBullseye, label: "ADMIN_O_AMMO" },
  { type: "component", icon: faPuzzlePiece, label: "ADMIN_O_COMPONENT" },
  { type: "item", icon: faCubes, label: "ADMIN_O_ITEM" },
];

const filterButton = (active: boolean) =>
  cn(
    "flex h-[3.2vh] min-w-[3.2vh] shrink-0 items-center justify-center gap-[0.7vh] rounded-[0.4vh] border-[0.1vh] text-[1.3vh] transition-[background-color,border-color,color] duration-150 active:[transform:scale(0.94)]",
    active
      ? "border-tgi-green-40 bg-tgi-green-10 text-tgi-green"
      : "border-white/10 bg-white/4 text-text-3 hover:border-white/30 hover:text-white",
  );

/** Search pill and item kind filters: stacks that do not match are dimmed in place (the grid keeps its layout). */
export function Toolbar({
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
