import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { ShopView } from "../../../../resource/common/nui";
import { Button } from "../../components/ui/button";
import { VirtualList } from "../../components/VirtualList";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { buyItem } from "../actions";
import { Picture } from "./Picture";
import { PanelFrame, sideWidth } from "./PanelFrame";

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
