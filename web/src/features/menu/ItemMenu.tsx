import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faHandHolding,
  faHandPointer,
  faScissors,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useLang } from "../../lib/lang";
import { useAppSelector } from "../../store";
import { detachComponent, dropItem, giveItem, itemUse } from "../actions";
import { ui, useUi, type AmountAction } from "../ui";

/** Right-click menu of a stack (right click opens it at the pointer; NUI gets no contextmenu event). */
export function ItemMenu() {
  const t = useLang();
  const { menu } = useUi();
  const state = useAppSelector((s) => s.inventory);
  const view = menu
    ? state.player?.id === menu.inv
      ? state.player
      : state.other?.id === menu.inv
        ? state.other
        : null
    : null;
  const stack = view?.stacks.find((s) => s.slot === menu?.slot);
  const def = stack ? state.items[stack.name] : undefined;
  const own = view !== null && view === state.player;
  const components =
    stack && Array.isArray(stack.metadata.components)
      ? stack.metadata.components.filter(
          (c): c is string => typeof c === "string",
        )
      : [];
  const ask = (action: AmountAction) =>
    menu &&
    stack &&
    ui.setAmount({ action, inv: menu.inv, slot: stack.slot, max: stack.count });

  return (
    <DropdownMenu
      open={Boolean(menu && stack)}
      onOpenChange={(open) => !open && ui.setMenu(null)}
    >
      <DropdownMenuTrigger asChild>
        <span
          className="pointer-events-none fixed size-px"
          style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {own && def?.usable && (
          <DropdownMenuItem onSelect={() => stack && itemUse(stack.slot)}>
            <FontAwesomeIcon
              icon={faHandPointer}
              className="w-[1.6vh] text-[1.4vh] text-white/60"
            />
            {t("UI_USE")}
          </DropdownMenuItem>
        )}
        {own && (
          <DropdownMenuItem
            onSelect={() =>
              stack && stack.count > 1
                ? ask("give")
                : stack && giveItem(stack.slot, 1)
            }
          >
            <FontAwesomeIcon
              icon={faHandHolding}
              className="w-[1.6vh] text-[1.4vh] text-white/60"
            />
            {t("UI_GIVE")}
          </DropdownMenuItem>
        )}
        {(stack?.count ?? 0) > 1 && (
          <DropdownMenuItem onSelect={() => ask("split")}>
            <FontAwesomeIcon
              icon={faScissors}
              className="w-[1.6vh] text-[1.4vh] text-white/60"
            />
            {t("UI_SPLIT")}
          </DropdownMenuItem>
        )}
        {view?.kind !== "drop" && (
          <DropdownMenuItem
            onSelect={() =>
              stack && stack.count > 1
                ? ask("drop")
                : menu && stack && dropItem(menu.inv, stack.slot, 1)
            }
          >
            <FontAwesomeIcon
              icon={faArrowDown}
              className="w-[1.6vh] text-[1.4vh] text-white/60"
            />
            {t("UI_DROP")}
          </DropdownMenuItem>
        )}
        {own && components.length > 0 && <DropdownMenuSeparator />}
        {own &&
          components.map((hash) => (
            <DropdownMenuItem
              key={hash}
              onSelect={() => stack && detachComponent(stack.slot, hash)}
            >
              <FontAwesomeIcon
                icon={faXmark}
                className="w-[1.6vh] text-[1.4vh] text-white/60"
              />
              {t(
                "UI_DETACH",
                Object.values(state.items).find((item) =>
                  item.hashes.includes(hash),
                )?.label ?? hash,
              )}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
