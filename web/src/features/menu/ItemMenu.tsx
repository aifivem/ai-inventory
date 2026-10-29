import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faHandHolding, faHandPointer, faScissors, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { detachComponent, dropItem, giveItem, itemUse, splitItem } from "../actions";
import { ui, useUi, type AmountAction } from "../ui";

/** Right-click menu of a stack (right click opens it at the pointer; NUI gets no contextmenu event). */
export function ItemMenu() {
  const t = useLang();
  const { menu } = useUi();
  const state = useAppSelector((s) => s.inventory);
  const view = menu ? (state.player?.id === menu.inv ? state.player : state.other?.id === menu.inv ? state.other : null) : null;
  const stack = view?.stacks.find((s) => s.slot === menu?.slot);
  const def = stack ? state.items[stack.name] : undefined;
  const own = view !== null && view === state.player;
  const components = stack && Array.isArray(stack.metadata.components) ? stack.metadata.components.filter((c): c is string => typeof c === "string") : [];
  const ask = (action: AmountAction) => menu && stack && ui.setAmount({ action, inv: menu.inv, slot: stack.slot, max: stack.count });

  return (
    <DropdownMenu open={Boolean(menu && stack)} onOpenChange={(open) => !open && ui.setMenu(null)}>
      <DropdownMenuTrigger asChild>
        <span className="pointer-events-none fixed size-px" style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {own && def?.usable && (
          <DropdownMenuItem onSelect={() => stack && itemUse(stack.slot)}>
            <FontAwesomeIcon icon={faHandPointer} className="w-[1.4vh] text-text-3" />
            {t("UI_USE")}
          </DropdownMenuItem>
        )}
        {own && (
          <DropdownMenuItem onSelect={() => (stack && stack.count > 1 ? ask("give") : stack && giveItem(stack.slot, 1))}>
            <FontAwesomeIcon icon={faHandHolding} className="w-[1.4vh] text-text-3" />
            {t("UI_GIVE")}
          </DropdownMenuItem>
        )}
        {(stack?.count ?? 0) > 1 && (
          <DropdownMenuItem onSelect={() => ask("split")}>
            <FontAwesomeIcon icon={faScissors} className="w-[1.4vh] text-text-3" />
            {t("UI_SPLIT")}
          </DropdownMenuItem>
        )}
        {view?.kind !== "drop" && (
          <DropdownMenuItem onSelect={() => (stack && stack.count > 1 ? ask("drop") : menu && stack && dropItem(menu.inv, stack.slot, 1))}>
            <FontAwesomeIcon icon={faArrowDown} className="w-[1.4vh] text-text-3" />
            {t("UI_DROP")}
          </DropdownMenuItem>
        )}
        {own && components.length > 0 && <DropdownMenuSeparator />}
        {own &&
          components.map((hash) => (
            <DropdownMenuItem key={hash} onSelect={() => stack && detachComponent(stack.slot, hash)}>
              <FontAwesomeIcon icon={faXmark} className="w-[1.4vh] text-text-3" />
              {t("UI_DETACH", Object.values(state.items).find((item) => item.hashes.includes(hash))?.label ?? hash)}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const TITLE: Record<AmountAction, "UI_GIVE" | "UI_DROP" | "UI_SPLIT"> = { give: "UI_GIVE", drop: "UI_DROP", split: "UI_SPLIT" };

/** Asks how many to give, drop or split off; Enter confirms. */
export function AmountDialog() {
  const t = useLang();
  const { amount } = useUi();
  const [value, setValue] = useState("1");
  useEffect(() => {
    if (amount) setValue(amount.action === "split" ? String(Math.floor(amount.max / 2)) : "1");
  }, [amount]);
  const count = Math.floor(Number(value));
  const valid = amount !== null && Number.isFinite(count) && count >= 1 && count <= (amount.action === "split" ? amount.max - 1 : amount.max);

  const confirm = () => {
    if (!amount || !valid) return;
    if (amount.action === "give") giveItem(amount.slot, count);
    else if (amount.action === "drop") dropItem(amount.inv, amount.slot, count);
    else splitItem(amount.inv, amount.slot, count);
    ui.setAmount(null);
  };

  return (
    <Dialog open={amount !== null} onOpenChange={(open) => !open && ui.setAmount(null)} title={amount ? t(TITLE[amount.action]) : ""}>
      <form
        className="flex flex-col gap-[1.2vh]"
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <div className="flex gap-[0.8vh]">
          <Input autoFocus type="number" min={1} max={amount?.max} value={value} aria-label={t("UI_AMOUNT")} aria-invalid={!valid} onChange={(e) => setValue(e.target.value)} />
          {amount?.action !== "split" && (
            <Button size="sm" className="h-[3.6vh]" onClick={() => setValue(String(amount?.max ?? 1))}>
              {t("UI_ALL")}
            </Button>
          )}
        </div>
        <div className="flex justify-end gap-[0.8vh]">
          <Button onClick={() => ui.setAmount(null)}>{t("UI_CANCEL")}</Button>
          <Button type="submit" variant="filled" disabled={!valid}>
            {t("UI_CONFIRM")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
