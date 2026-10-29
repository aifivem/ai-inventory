import { useEffect } from "react";
import { useNuiEvent } from "fivem-nui-react";
import type { NuiMessage } from "../../resource/common/nui";
import { TooltipProvider } from "./components/ui/tooltip";
import { MOCK_OPEN, MOCK_PLAYER, MOCK_SETUP } from "./dev/mock";
import { setTexts } from "./lib/lang";
import { store, useAppSelector } from "./store";
import { closed, deltaApplied, itemsSet, opened, otherClosed, playerSet, progressSet, toastAdded } from "./store/inventory";
import { closeScreen } from "./features/actions";
import { Ghost } from "./features/grid/Ghost";
import { AmountDialog, ItemMenu } from "./features/menu/ItemMenu";
import { Overlay } from "./features/overlay/Overlay";
import { InventoryPanel } from "./features/panels/InventoryPanel";
import { BenchPanel, GroundPanel, ShopPanel } from "./features/panels/SidePanels";
import { ui } from "./features/ui";

type Data<A extends NuiMessage["action"]> = Extract<NuiMessage, { action: A }>["data"];

// The client is this resource's own code: its messages are trusted in shape (types from common/nui).
const onSetup = (data: Data<"setup">) => {
  setTexts(data.texts);
  store.dispatch(itemsSet(data.items));
};
const onItems = (data: Data<"items">) => store.dispatch(itemsSet(data));
const onPlayer = (data: Data<"player">) => store.dispatch(playerSet(data));
const onOpen = (data: Data<"open">) => store.dispatch(opened(data));
const onDelta = (data: Data<"delta">) => store.dispatch(deltaApplied(data));
const onClose = () => {
  ui.setMenu(null);
  ui.setAmount(null);
  store.dispatch(closed());
};
const onOtherClosed = () => store.dispatch(otherClosed());
const onToast = (data: Data<"toast">) => store.dispatch(toastAdded(data.error));
const onProgress = (data: Data<"progress">) => store.dispatch(progressSet(data));

const SETUP_MOCK = { mockData: MOCK_SETUP };
const PLAYER_MOCK = { mockData: MOCK_PLAYER, mockDelay: 50 };
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };

/** Root: listens to the client; while open shows the player inventory next to the second inventory, a shop, a bench or the ground. */
export function App() {
  const state = useAppSelector((s) => s.inventory);

  useNuiEvent("setup", onSetup, SETUP_MOCK);
  useNuiEvent("items", onItems);
  useNuiEvent("player", onPlayer, PLAYER_MOCK);
  useNuiEvent("open", onOpen, OPEN_MOCK);
  useNuiEvent("delta", onDelta);
  useNuiEvent("close", onClose);
  useNuiEvent("otherClosed", onOtherClosed);
  useNuiEvent("toast", onToast);
  useNuiEvent("progress", onProgress);

  // Escape or Tab closes the screen (the game's Tab bind does not fire while the NUI has focus); dialogs close first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.code !== "Escape" && event.code !== "Tab") || !store.getState().inventory.open || ui.menu || ui.amount) return;
      event.preventDefault();
      closeScreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider>
      {state.open && state.player && (
        <div className="fixed inset-0 flex animate-fade items-center justify-center bg-[rgba(var(--bg-rgb),0.55)]" onContextMenu={(e) => e.preventDefault()}>
          <div className="flex items-start gap-[2.4vh]">
          <InventoryPanel view={state.player} own />
          {state.other ? (
            <InventoryPanel view={state.other} own={false} />
          ) : state.shop ? (
            <ShopPanel shop={state.shop} />
          ) : state.bench ? (
            <BenchPanel bench={state.bench} />
          ) : (
            <GroundPanel />
          )}
          </div>
          <Ghost />
          <ItemMenu />
          <AmountDialog />
        </div>
      )}
      <Overlay />
    </TooltipProvider>
  );
}
