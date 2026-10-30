import { useEffect } from "react";
import { useNuiEvent } from "fivem-nui-react";
import type { NuiMessage } from "../../resource/common/nui";
import { TooltipProvider } from "./components/ui/tooltip";
import { MOCK_OPEN, MOCK_PLAYER, MOCK_PROFILE, MOCK_SETUP } from "./dev/mock";
import { setCellFor } from "./lib/cell";
import { setTexts } from "./lib/lang";
import { store, useAppSelector } from "./store";
import {
  closed,
  deltaApplied,
  itemsSet,
  opened,
  otherClosed,
  playerSet,
  profileSet,
} from "./store/inventory";
import { closeScreen } from "./features/actions";
import { Ghost } from "./features/grid/Ghost";
import { AmountDialog, ItemMenu } from "./features/menu/ItemMenu";
import { Equipment } from "./features/panels/Equipment";
import { Hints, TopBar } from "./features/panels/Header";
import { InventoryPanel } from "./features/panels/InventoryPanel";
import {
  BenchPanel,
  GroundPanel,
  ShopPanel,
} from "./features/panels/SidePanels";
import { ui } from "./features/ui";

type Data<A extends NuiMessage["action"]> = Extract<
  NuiMessage,
  { action: A }
>["data"];

// The client is this resource's own code: its messages are trusted in shape (types from common/nui).
const onSetup = (data: Data<"setup">) => {
  setTexts(data.texts);
  store.dispatch(itemsSet(data.items));
};
const onItems = (data: Data<"items">) => store.dispatch(itemsSet(data));
const onPlayer = (data: Data<"player">) => {
  setCellFor(data.columns);
  store.dispatch(playerSet(data));
};
const onOpen = (data: Data<"open">) => store.dispatch(opened(data));
const onDelta = (data: Data<"delta">) => store.dispatch(deltaApplied(data));
const onClose = () => {
  ui.setMenu(null);
  ui.setAmount(null);
  store.dispatch(closed());
};
const onOtherClosed = () => store.dispatch(otherClosed());
const onProfile = (data: Data<"profile">) => store.dispatch(profileSet(data));

const SETUP_MOCK = { mockData: MOCK_SETUP };
const PLAYER_MOCK = { mockData: MOCK_PLAYER, mockDelay: 50 };
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 };
const PROFILE_MOCK = { mockData: MOCK_PROFILE, mockDelay: 120 };

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
  useNuiEvent("profile", onProfile, PROFILE_MOCK);

  // Escape or Tab closes the screen (the game's Tab bind does not fire while the NUI has focus); dialogs close first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.code !== "Escape" && event.code !== "Tab") ||
        !store.getState().inventory.open ||
        ui.menu ||
        ui.amount
      )
        return;
      event.preventDefault();
      closeScreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider>
      {state.open && state.player && (
        <div
          className="fixed inset-0 animate-fade bg-[linear-gradient(90deg,rgba(8,8,8,0.35)_0%,rgba(8,8,8,0.45)_30%,rgba(8,8,8,0.82)_42%,rgba(8,8,8,0.82)_100%)]"
          onContextMenu={(e) => e.preventDefault()}
        >
          <TopBar />
          <div className="absolute inset-0 flex gap-[2vh] px-[3vh] pt-[8vh] pb-[3vh]">
            <Equipment />
            <InventoryPanel view={state.player} own footer={<Hints />} />
            <div className="flex-1" />
            {state.other ? (
              <InventoryPanel view={state.other} own={false} />
            ) : state.shop ? (
              <ShopPanel shop={state.shop} columns={state.player.columns} />
            ) : state.bench ? (
              <BenchPanel bench={state.bench} columns={state.player.columns} />
            ) : (
              <GroundPanel columns={state.player.columns} />
            )}
          </div>
          <Ghost />
          <ItemMenu />
          <AmountDialog />
        </div>
      )}
    </TooltipProvider>
  );
}
