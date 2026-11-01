import { useState, type ReactNode } from "react";
import type { InventoryView } from "../../../../resource/common/nui";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useLang } from "../../lib/lang";
import { Grid, type StackFilter } from "../grid/Grid";
import { PanelFrame, sideWidth, Weight, WeightBar } from "./PanelFrame";
import { Toolbar } from "./Toolbar";

/** Narrower grids than this show the kind filters as icons with a tooltip; wider ones show icon and label. */
const LABELLED_COLUMNS = 99;

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
