import type { BenchView } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { VirtualList } from "../../components/VirtualList";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { craftRecipe } from "../actions";
import { Picture } from "./Picture";
import { PanelFrame, sideWidth } from "./PanelFrame";

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
