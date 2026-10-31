import { wardrobe } from "./clothes";
import {
  cache,
  callAction,
  getPlayerData,
  loadLocaleTexts,
  medical,
  NuiScreen,
} from "@aicore-fivem/lib/client";
import { EVENTS } from "common/events";
import {
  toPanel,
  type InventoryView,
  type NuiMessage,
  type OpenTarget,
  type Panel,
  type ShopView,
} from "common/nui";
import { benchView, content, itemViews, shopView } from "./content";
import { state, toView } from "./state";
import { worldPed } from "./worldPed";

/** The page: focus, HUDs and the close message; closing it (the page's button too) runs `screen.closed`. */
export const page = new NuiScreen<NuiMessage>("inventory", {
  onClose: () => screen.closed(),
});
export const send = (message: NuiMessage): void => page.send(message);

/** The character's name and the clothes column (worn pieces) for the screen. */
export function sendProfile(): void {
  const character = getPlayerData("character");
  send({
    action: "profile",
    data: {
      name: character ? `${character.firstname} ${character.lastname}` : "",
      clothes: wardrobe.state(),
    },
  });
}

/** The inventory screen: opening (asks the server), the NUI focus, and forwarding deltas while it is open. */
class Screen {
  /** The open key's current binding (set by `open.ts`, which owns the keybind). */
  openKey: () => string = () => "";

  get isOpen(): boolean {
    return page.isOpen;
  }

  /** A shop or bench shows next to the player inventory. */
  private panel = false;
  private setupSent = false;

  private setup(): void {
    if (this.setupSent) return;
    this.setupSent = true;
    send({
      action: "setup",
      data: { texts: loadLocaleTexts(), items: itemViews() },
    });
  }

  /** Asks the server for the second inventory (or a shop / bench) and opens the screen with it. */
  async open(target: OpenTarget): Promise<void> {
    if (!state.player || IsPauseMenuActive() || medical.isDead()) return;
    const reply = await callAction(EVENTS.open, [target], {
      fallback: "INV_ERR_GONE",
    });
    if (reply) this.show(toView(reply.other), toPanel(reply.panel));
  }

  /** Shows the screen with what the server already granted (an `open` answer, a script's force open or shop). */
  show(
    other: InventoryView | null,
    panel: Panel | null,
    scriptShop: ShopView | null = null,
  ): void {
    if (!state.player) return;
    this.setup();
    state.otherId = other?.id ?? null;
    this.panel = panel !== null || scriptShop !== null;
    send({ action: "player", data: state.player });
    page.open({
      action: "open",
      data: {
        other,
        shop:
          scriptShop ?? (panel?.kind === "shop" ? shopView(panel.id) : null),
        bench: panel?.kind === "bench" ? benchView(panel.id) : null,
        key: this.openKey(),
      },
    });
    sendProfile();
  }

  close(): void {
    page.close();
  }

  /** The page closed: the second inventory and the character copy go, the server stops sending its deltas. */
  closed(): void {
    state.otherId = null;
    worldPed.hide();
    emitNet(EVENTS.close);
  }

  /** The server shows the player's new drop in place of the ground panel; a shop or bench keeps its place. */
  groundOpened(view: InventoryView): void {
    if (!this.isOpen || state.otherId !== null) return;
    if (this.panel) return emitNet(EVENTS.close);
    state.otherId = view.id;
    send({ action: "ground", data: view });
  }

  /** The server took the second inventory away (drop emptied, out of reach). */
  otherClosed(): void {
    state.otherId = null;
    if (this.isOpen) send({ action: "otherClosed", data: null });
  }
}

export const screen = new Screen();

/** The quick slots bar (Tab): the player's grid stays current on the screen while it shows. */
class Hotbar {
  visible = false;

  toggle(): void {
    this.set(!this.visible);
  }

  set(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    if (visible && state.player) send({ action: "player", data: state.player });
    send({ action: "hotbar", data: visible });
  }
}

export const hotbar = new Hotbar();

state.onDelta((id, put, remove, maxWeight) => {
  const shown =
    (screen.isOpen && id === state.otherId) ||
    ((screen.isOpen || hotbar.visible) && id === state.player?.id);
  if (shown) send({ action: "delta", data: { id, put, remove, maxWeight } });
});

state.onLayout((id, columns, rows, maxWeight) => {
  if (id === state.otherId || id === state.player?.id)
    send({ action: "layout", data: { id, columns, rows, maxWeight } });
});

content.subscribe((file) => {
  if (file === "items" || file === "rarities")
    send({ action: "items", data: itemViews() });
});
