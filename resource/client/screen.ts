import { wardrobe } from "./clothes";
import {
  cache,
  getPlayerData,
  hud,
  loadLocaleTexts,
  notify,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { EVENTS, type ActionResult } from "common/events";
import {
  toPanel,
  type InventoryView,
  type NuiMessage,
  type OpenTarget,
  type Panel,
} from "common/nui";
import { benchView, content, itemViews, shopView } from "./content";
import { state, toView } from "./state";
import { worldPed } from "./worldPed";

export const send = (message: NuiMessage): void => SendNUIMessage(message);

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

export function toResult(v: unknown): ActionResult {
  if (typeof v === "object" && v !== null && "ok" in v) {
    if (v.ok === true) return { ok: true };
    if ("error" in v && typeof v.error === "string")
      return { ok: false, error: v.error };
  }
  return { ok: false, error: "INV_ERR_GONE" };
}

const texts = loadLocaleTexts();

/** An action failed: ai-core's notification with the server's reason (a lang key of this resource). */
export function toast(error: string): void {
  notify(texts[error] ?? error, "error");
}

/** The inventory screen: opening (asks the server), the NUI focus, and forwarding deltas while it is open. */
class Screen {
  /** The open key's current binding (set by `open.ts`, which owns the keybind). */
  openKey: () => string = () => "";

  isOpen = false;
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
    if (!state.player || IsPauseMenuActive() || IsEntityDead(cache.ped)) return;
    const raw: unknown = await triggerServerCallback(EVENTS.open, [
      target,
    ]).catch(() => null);
    const result = toResult(raw);
    if (!result.ok) return toast(result.error);
    if (typeof raw !== "object" || raw === null) return;
    this.show(
      "other" in raw ? toView(raw.other) : null,
      "panel" in raw ? toPanel(raw.panel) : null,
    );
  }

  /** Shows the screen with what the server already granted (an `open` answer or a script's force open). */
  show(other: InventoryView | null, panel: Panel | null): void {
    if (!state.player) return;
    this.setup();
    state.otherId = other?.id ?? null;
    send({ action: "player", data: state.player });
    send({
      action: "open",
      data: {
        other,
        shop: panel?.kind === "shop" ? shopView(panel.id) : null,
        bench: panel?.kind === "bench" ? benchView(panel.id) : null,
        key: this.openKey(),
      },
    });
    sendProfile();
    if (!this.isOpen) {
      SetNuiFocus(true, true);
      hud.hide("inventory");
    }
    this.isOpen = true;
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    state.otherId = null;
    SetNuiFocus(false, false);
    hud.show("inventory");
    worldPed.hide();
    send({ action: "close", data: null });
    emitNet(EVENTS.close);
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

content.subscribe((file) => {
  if (file === "items" || file === "rarities")
    send({ action: "items", data: itemViews() });
});
