import { loadLocaleTexts, notify, triggerServerCallback } from "@aicore-fivem/lib/client";
import { EVENTS, type ActionResult } from "common/events";
import { toPanel, type InventoryView, type NuiMessage, type OpenTarget, type Panel } from "common/nui";
import { benchView, content, itemViews, shopView } from "./content";
import { state, toView } from "./state";

export const send = (message: NuiMessage): void => SendNUIMessage(message);

export function toResult(v: unknown): ActionResult {
  if (typeof v === "object" && v !== null && "ok" in v) {
    if (v.ok === true) return { ok: true };
    if ("error" in v && typeof v.error === "string") return { ok: false, error: v.error };
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
  isOpen = false;
  private setupSent = false;

  private setup(): void {
    if (this.setupSent) return;
    this.setupSent = true;
    send({ action: "setup", data: { texts: loadLocaleTexts(), items: itemViews() } });
  }

  /** Asks the server for the second inventory (or a shop / bench) and opens the screen with it. */
  async open(target: OpenTarget): Promise<void> {
    if (!state.player || IsPauseMenuActive() || IsEntityDead(PlayerPedId())) return;
    const raw: unknown = await triggerServerCallback(EVENTS.open, [target]).catch(() => null);
    const result = toResult(raw);
    if (!result.ok) return toast(result.error);
    if (typeof raw !== "object" || raw === null) return;
    this.show("other" in raw ? toView(raw.other) : null, "panel" in raw ? toPanel(raw.panel) : null);
  }

  /** Shows the screen with what the server already granted (an `open` answer or a script's force open). */
  show(other: InventoryView | null, panel: Panel | null): void {
    if (!state.player) return;
    this.setup();
    state.otherId = other?.id ?? null;
    send({ action: "player", data: state.player });
    send({
      action: "open",
      data: { other, shop: panel?.kind === "shop" ? shopView(panel.id) : null, bench: panel?.kind === "bench" ? benchView(panel.id) : null },
    });
    if (!this.isOpen) {
      SetNuiFocus(true, true);
      // The NUI floats over the game (TGIANN full-screen look): the game behind it is blurred.
      TriggerScreenblurFadeIn(250);
    }
    this.isOpen = true;
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    state.otherId = null;
    SetNuiFocus(false, false);
    TriggerScreenblurFadeOut(250);
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

on("onResourceStop", (resource: string) => {
  if (resource === GetCurrentResourceName() && screen.isOpen) TriggerScreenblurFadeOut(0);
});

state.onDelta((id, put, remove, maxWeight) => {
  if (screen.isOpen && (id === state.player?.id || id === state.otherId)) send({ action: "delta", data: { id, put, remove, maxWeight } });
});

content.subscribe((file) => {
  if (file === "items") send({ action: "items", data: itemViews() });
});
