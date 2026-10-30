import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faBox,
  faMinus,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import type {
  BenchView,
  ItemView,
  ShopView,
} from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { VirtualList } from "../../components/VirtualList";
import { imageUrl } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { buyItem, craftRecipe } from "../actions";
import { useDrag } from "../grid/drag";
import { PanelFrame, sideWidth } from "./InventoryPanel";

function Picture({
  def,
  className,
}: {
  def: ItemView | undefined;
  className?: string;
}) {
  const src = def ? imageUrl(def.image) : null;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[0.8vh] border border-white/8 bg-white/4 p-[0.5vh]",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <FontAwesomeIcon icon={faBox} className="text-[1.8vh] text-text-3" />
      )}
    </div>
  );
}

/** Next to the player inventory when nothing else is open: drop target for putting items on the ground. */
export function GroundPanel({ columns }: { columns: number }) {
  const t = useLang();
  const drag = useDrag();
  return (
    <PanelFrame title={t("UI_GROUND")} width={sideWidth(columns)}>
      <div
        data-ground
        className={cn(
          "flex h-[38.4vh] w-full flex-col items-center justify-center gap-[1.2vh] rounded-[1.4vh] border border-dashed bg-black/20 text-center transition-colors duration-150",
          drag?.ground
            ? "border-tgi-green bg-tgi-green-10 text-tgi-green"
            : "border-white/15 text-text-2",
        )}
      >
        <FontAwesomeIcon icon={faArrowDown} className="text-[3vh]" />
        <p className="max-w-[30vh] text-[1.4vh]">{t("UI_GROUND_HINT")}</p>
      </div>
    </PanelFrame>
  );
}

function ShopRow({
  shop,
  row,
}: {
  shop: string;
  row: { name: string; price: number };
}) {
  const t = useLang();
  const def = useAppSelector((state) => state.inventory.items[row.name]);
  const [count, setCount] = useState(1);
  const max = Math.max(1, Math.min(100, def?.stack ?? 1));
  return (
    <div className="flex h-[7.2vh] items-center gap-[1.2vh] rounded-[1vh] border border-white/8 bg-white/3 px-[1vh] transition-colors duration-150 hover:bg-white/6">
      <Picture def={def} className="size-[5.4vh]" />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
        <span className="truncate text-[1.45vh] font-semibold">
          {def?.label ?? row.name}
        </span>
        <span className="text-[1.3vh] font-semibold text-tgi-green tabular-nums">
          {t("UI_PRICE", row.price * count)}
        </span>
      </div>
      <div className="flex items-center gap-[0.6vh]">
        <Button
          variant="icon"
          aria-label={t("UI_AMOUNT")}
          disabled={count <= 1}
          onClick={() => setCount(count - 1)}
        >
          <FontAwesomeIcon icon={faMinus} />
        </Button>
        <span className="w-[3vh] text-center text-[1.4vh] tabular-nums">
          {count}
        </span>
        <Button
          variant="icon"
          aria-label={t("UI_AMOUNT")}
          disabled={count >= max}
          onClick={() => setCount(count + 1)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      </div>
      <Button size="sm" onClick={() => buyItem(shop, row.name, count)}>
        {t("UI_BUY")}
      </Button>
    </div>
  );
}

export function ShopPanel({
  shop,
  columns,
}: {
  shop: ShopView;
  columns: number;
}) {
  const t = useLang();
  return (
    <PanelFrame
      title={shop.label}
      kind={t("UI_BUY")}
      width={sideWidth(columns)}
    >
      {shop.items.length === 0 ? (
        <p className="py-[4vh] text-center text-[1.4vh] text-text-3">
          {t("UI_EMPTY")}
        </p>
      ) : (
        <VirtualList
          className="max-h-[64vh] w-full"
          items={shop.items}
          estimateSize={7.2}
          gap={0.8}
          getItemKey={(row) => row.name}
          renderItem={(row) => <ShopRow shop={shop.id} row={row} />}
        />
      )}
    </PanelFrame>
  );
}

function RecipeRow({ bench, index }: { bench: BenchView; index: number }) {
  const t = useLang();
  const recipe = bench.recipes[index];
  const items = useAppSelector((state) => state.inventory.items);
  const stacks = useAppSelector(
    (state) => state.inventory.player?.stacks ?? [],
  );
  const crafting = useAppSelector((state) => state.inventory.crafting);
  if (!recipe) return null;
  const have = (name: string) =>
    stacks.reduce((sum, s) => sum + (s.name === name ? s.count : 0), 0);
  const ready = recipe.ingredients.every(
    (part) => have(part.name) >= part.count,
  );
  const busy = crafting?.index === index;
  return (
    <div className="flex h-[7.2vh] items-center gap-[1.2vh] rounded-[1vh] border border-white/8 bg-white/3 px-[1vh] transition-colors duration-150 hover:bg-white/6">
      <Picture def={items[recipe.result]} className="size-[5.4vh]" />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
        <span className="truncate text-[1.45vh] font-semibold">
          {t(
            "UI_PART",
            recipe.count,
            items[recipe.result]?.label ?? recipe.result,
          )}
        </span>
        <span className="truncate text-[1.2vh] text-text-3">
          {t("UI_REQUIRES")}:{" "}
          {recipe.ingredients.map((part, i) => (
            <span
              key={part.name}
              className={
                have(part.name) >= part.count ? "text-text-2" : "text-danger"
              }
            >
              {i > 0 ? ", " : ""}
              {t("UI_PART", part.count, items[part.name]?.label ?? part.name)}
            </span>
          ))}
        </span>
      </div>
      <span className="text-[1.2vh] text-text-3 tabular-nums">
        {t("UI_SECONDS", recipe.time)}
      </span>
      <Button
        size="sm"
        disabled={!ready || crafting !== null}
        busy={busy}
        onClick={() => void craftRecipe(bench.id, index, recipe.time)}
      >
        {t("UI_CRAFT")}
      </Button>
    </div>
  );
}

export function BenchPanel({
  bench,
  columns,
}: {
  bench: BenchView;
  columns: number;
}) {
  const t = useLang();
  return (
    <PanelFrame
      title={bench.label}
      kind={t("UI_CRAFT")}
      width={sideWidth(columns)}
    >
      {bench.recipes.length === 0 ? (
        <p className="py-[4vh] text-center text-[1.4vh] text-text-3">
          {t("UI_EMPTY")}
        </p>
      ) : (
        <VirtualList
          className="max-h-[64vh] w-full"
          items={bench.recipes}
          estimateSize={7.2}
          gap={0.8}
          getItemKey={(_, i) => i}
          renderItem={(_, i) => <RecipeRow bench={bench} index={i} />}
        />
      )}
    </PanelFrame>
  );
}
