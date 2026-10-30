import { useEffect } from "react"
import { useNuiEvent } from "fivem-nui-react"
import type { NuiMessage } from "../../resource/common/nui"
import { TooltipProvider } from "./components/ui/tooltip"
import { MOCK_OPEN, MOCK_PLAYER, MOCK_SETUP } from "./dev/mock"
import { setTexts } from "./lib/lang"
import { store, useAppSelector } from "./store"
import {
  closed,
  deltaApplied,
  itemsSet,
  opened,
  otherClosed,
  playerSet,
} from "./store/inventory"
import { closeScreen } from "./features/actions"
import { Ghost } from "./features/grid/Ghost"
import { AmountDialog, ItemMenu } from "./features/menu/ItemMenu"
import { Header } from "./features/panels/Header"
import { InventoryPanel } from "./features/panels/InventoryPanel"
import {
  BenchPanel,
  GroundPanel,
  ShopPanel,
} from "./features/panels/SidePanels"
import { ui } from "./features/ui"

type Data<A extends NuiMessage["action"]> = Extract<
  NuiMessage,
  { action: A }
>["data"]

// The client is this resource's own code: its messages are trusted in shape (types from common/nui).
const onSetup = (data: Data<"setup">) => {
  setTexts(data.texts)
  store.dispatch(itemsSet(data.items))
}
const onItems = (data: Data<"items">) => store.dispatch(itemsSet(data))
const onPlayer = (data: Data<"player">) => store.dispatch(playerSet(data))
const onOpen = (data: Data<"open">) => store.dispatch(opened(data))
const onDelta = (data: Data<"delta">) => store.dispatch(deltaApplied(data))
const onClose = () => {
  ui.setMenu(null)
  ui.setAmount(null)
  store.dispatch(closed())
}
const onOtherClosed = () => store.dispatch(otherClosed())

const SETUP_MOCK = { mockData: MOCK_SETUP }
const PLAYER_MOCK = { mockData: MOCK_PLAYER, mockDelay: 50 }
const OPEN_MOCK = { mockData: MOCK_OPEN, mockDelay: 100 }

/** Root: listens to the client; while open shows the player inventory next to the second inventory, a shop, a bench or the ground. */
export function App() {
  const state = useAppSelector((s) => s.inventory)

  useNuiEvent("setup", onSetup, SETUP_MOCK)
  useNuiEvent("items", onItems)
  useNuiEvent("player", onPlayer, PLAYER_MOCK)
  useNuiEvent("open", onOpen, OPEN_MOCK)
  useNuiEvent("delta", onDelta)
  useNuiEvent("close", onClose)
  useNuiEvent("otherClosed", onOtherClosed)

  // Escape or Tab closes the screen (the game's Tab bind does not fire while the NUI has focus); dialogs close first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.code !== "Escape" && event.code !== "Tab") ||
        !store.getState().inventory.open ||
        ui.menu ||
        ui.amount
      )
        return
      event.preventDefault()
      closeScreen()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <TooltipProvider>
      {state.open && state.player && (
        <div
          className="fixed inset-0 flex animate-fade flex-col gap-[3.2vh] bg-[radial-gradient(circle,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.4)_8%,rgba(0,0,0,0.55)_19%,rgba(0,0,0,0.7)_29%,rgba(0,0,0,0.75)_40%,rgba(0,0,0,0.8)_60%)] px-[3.2vh] pt-[3vh] pb-[3vh]"
          onContextMenu={(e) => e.preventDefault()}
        >
          <Header />
          <div className="flex min-h-0 flex-1 items-start justify-between gap-[3.2vh]">
            <InventoryPanel view={state.player} own />
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
  )
}
