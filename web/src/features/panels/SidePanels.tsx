import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faBox, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { BenchView, ItemView, ShopView } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { VirtualList } from "../../components/VirtualList";
import { imageUrl } from "../../lib/cell";
import { useLang } from "../../lib/lang";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { buyItem, craftRecipe } from "../actions";
import { useDrag } from "../grid/drag";
import { PanelFrame } from "./InventoryPanel";

function Picture({ def, className }: { def: ItemView | undefined; className?: string }) {
  const src = def ? imageUrl(def.image) : null;
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-[0.6vh] border border-line bg-raised p-[0.5vh]", className)}>
      {src ? <img src={src} alt="" className="max-h-full max-w-full object-contain" /> : <FontAwesomeIcon icon={faBox} className="text-[1.8vh] text-text-3" />}
    </div>
  );
}

/** Next to the player inventory when nothing else is open: drop target for putting items on the ground. */
export function GroundPanel() {
  const t = useLang();
  const drag = useDrag();
  return (
    <PanelFrame caption={t("UI_KIND_DROP")} title={t("UI_GROUND")}>
      <div
        data-ground
        className={cn(
          "flex h-[38.4vh] w-[44vh] flex-col items-center justify-center gap-[1.2vh] rounded-[0.8vh] border border-dashed text-center transition-colors duration-150",
          drag?.ground ? "border-accent bg-[rgba(var(--accent-rgb),0.08)] text-accent" : "border-line text-text-3",
        )}
      >
        <FontAwesomeIcon icon={faArrowDown} className="text-[3vh]" />
        <p className="max-w-[30vh] text-[1.35vh]">{t("UI_GROUND_HINT")}</p>
      </div>
    </PanelFrame>
  );
}

function ShopRow({ shop, row }: { shop: string; row: { name: string; price: number } }) {
  const t = useLang();
  const def = useAppSelector((state) => state.inventory.items[row.name]);
  const [count, setCount] = useState(1);
  const max = Math.max(1, Math.min(100, def?.stack ?? 1));
  return (
    <div className="flex h-[7.2vh] items-center gap-[1.2vh] rounded-[0.8vh] border border-line bg-bg px-[1.2vh]">
      <Picture def={def} className="size-[5.4vh]" />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
        <span className="truncate text-[1.45vh] font-semibold">{def?.label ?? row.name}</span>
        <span className="text-[1.3vh] tabular-nums text-text-2">{t("UI_PRICE", row.price * count)}</span>
      </div>
      <div className="flex items-center gap-[0.6vh]">
        <Button variant="icon" aria-label={t("UI_AMOUNT")} disabled={count <= 1} onClick={() => setCount(count - 1)}>
          <FontAwesomeIcon icon={faMinus} />
        </Button>
        <span className="w-[3vh] text-center text-[1.35vh] tabular-nums">{count}</span>
        <Button variant="icon" aria-label={t("UI_AMOUNT")} disabled={count >= max} onClick={() => setCount(count + 1)}>
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      </div>
      <Button variant="primary" size="sm" onClick={() => buyItem(shop, row.name, count)}>
        {t("UI_BUY")}
      </Button>
    </div>
  );
}

export function ShopPanel({ shop }: { shop: ShopView }) {
  const t = useLang();
  return (
    <PanelFrame caption={t("UI_BUY")} title={shop.label}>
      {shop.items.length === 0 ? (
        <p className="w-[52vh] py-[4vh] text-center text-[1.35vh] text-text-3">{t("UI_EMPTY")}</p>
      ) : (
        <VirtualList className="max-h-[60vh] w-[52vh]" items={shop.items} estimateSize={7.2} gap={0.8} getItemKey={(row) => row.name} renderItem={(row) => <ShopRow shop={shop.id} row={row} />} />
      )}
    </PanelFrame>
  );
}

function RecipeRow({ bench, index }: { bench: BenchView; index: number }) {
  const t = useLang();
  const recipe = bench.recipes[index];
  const items = useAppSelector((state) => state.inventory.items);
  const stacks = useAppSelector((state) => state.inventory.player?.stacks ?? []);
  const crafting = useAppSelector((state) => state.inventory.crafting);
  if (!recipe) return null;
  const have = (name: string) => stacks.reduce((sum, s) => sum + (s.name === name ? s.count : 0), 0);
  const ready = recipe.ingredients.every((part) => have(part.name) >= part.count);
  const busy = crafting?.index === index;
  return (
    <div className="flex h-[7.2vh] items-center gap-[1.2vh] rounded-[0.8vh] border border-line bg-bg px-[1.2vh]">
      <Picture def={items[recipe.result]} className="size-[5.4vh]" />
      <div className="flex min-w-0 flex-1 flex-col gap-[0.4vh]">
        <span className="truncate text-[1.45vh] font-semibold">
          {t("UI_PART", recipe.count, items[recipe.result]?.label ?? recipe.result)}
        </span>
        <span className="truncate text-[1.2vh] text-text-3">
          {t("UI_REQUIRES")}:{" "}
          {recipe.ingredients.map((part, i) => (
            <span key={part.name} className={have(part.name) >= part.count ? "text-text-2" : "text-danger"}>
              {i > 0 ? ", " : ""}
              {t("UI_PART", part.count, items[part.name]?.label ?? part.name)}
            </span>
          ))}
        </span>
      </div>
      <span className="text-[1.2vh] tabular-nums text-text-3">{t("UI_SECONDS", recipe.time)}</span>
      <Button variant="primary" size="sm" disabled={!ready || crafting !== null} busy={busy} onClick={() => void craftRecipe(bench.id, index, recipe.time)}>
        {t("UI_CRAFT")}
      </Button>
    </div>
  );
}

export function BenchPanel({ bench }: { bench: BenchView }) {
  const t = useLang();
  return (
    <PanelFrame caption={t("UI_CRAFT")} title={bench.label}>
      {bench.recipes.length === 0 ? (
        <p className="w-[56vh] py-[4vh] text-center text-[1.35vh] text-text-3">{t("UI_EMPTY")}</p>
      ) : (
        <VirtualList className="max-h-[60vh] w-[56vh]" items={bench.recipes} estimateSize={7.2} gap={0.8} getItemKey={(_, i) => i} renderItem={(_, i) => <RecipeRow bench={bench} index={i} />} />
      )}
    </PanelFrame>
  );
}
