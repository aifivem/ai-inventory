import { callAction, nearestPlayer, notify } from "@aicore-fivem/lib/client";
import { fail, isRecord, readInt } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, type ActionResult } from "common/events";
import { NUI, toMoveInput, toPedArea } from "common/nui";
import { content } from "./content";
import { isClothesId } from "common/clothes";
import { wardrobe } from "./clothes";
import { page, screen, sendProfile } from "./screen";
import { state } from "./state";
import { useItem } from "./use";
import { worldPed } from "./worldPed";

const GONE = fail("INV_ERR_GONE");
const slotOf = (v: unknown): number | null => readInt(v, 1, 10_000);
const countOf = (v: unknown): number | null => readInt(v, 1, 1_000_000);
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Sends one action to the server (a refusal shows its reason) and answers the NUI; the new state arrives as a delta. */
async function call(name: string, args: unknown[]): Promise<ActionResult> {
  const reply = await callAction(name, args, { fallback: "INV_ERR_GONE" });
  return reply ? { ok: true } : GONE;
}

// The clothes column: a click takes a piece off or puts it back on (the column greys out while it changes).
page.on(
  NUI.clothes,
  (data) => {
    const id = isRecord(data) ? data.id : null;
    return isClothesId(id) ? id : null;
  },
  (id) => {
    const done = wardrobe.toggle(id);
    sendProfile();
    // The piece changes after the animation: only then does the copy change.
    void done.then(() => {
      sendProfile();
      worldPed.refresh();
    });
  },
);

// The equipment column's character: its area on screen, or hidden (the show / hide switch under it).
page.on(
  NUI.worldPed,
  (data) => ({ area: toPedArea(data) }),
  ({ area }) => {
    if (!screen.isOpen) return;
    if (area) worldPed.show(area);
    else worldPed.hide();
  },
);

page.on(NUI.move, toMoveInput, (move) => call(EVENTS.move, [move]));

page.on(
  NUI.use,
  (data) => (isRecord(data) ? slotOf(data.slot) : null),
  (slot) => {
    const stack = state.player?.stacks.find((s) => s.slot === slot);
    if (!stack) return GONE;
    if (content.items.get(stack.name)?.close) screen.close();
    void useItem(slot);
  },
);

page.on(
  NUI.give,
  (data) => {
    const slot = isRecord(data) ? slotOf(data.slot) : null;
    const count = isRecord(data) ? countOf(data.count) : null;
    return slot && count ? { slot, count } : null;
  },
  ({ slot, count }) => {
    const target = nearestPlayer(3);
    if (target === null) {
      notify(Locale("INV_ERR_NO_TARGET"), "error");
      return fail("INV_ERR_NO_TARGET");
    }
    return call(EVENTS.give, [slot, count, target]);
  },
);

page.on(
  NUI.drop,
  (data) => {
    if (!isRecord(data)) return null;
    const from = text(data.from);
    const slot = slotOf(data.slot);
    const count = countOf(data.count);
    return from && slot && count ? { from, slot, count } : null;
  },
  ({ from, slot, count }) => call(EVENTS.drop, [from, slot, count]),
);

page.on(
  NUI.buy,
  (data) => {
    if (!isRecord(data)) return null;
    const shop = text(data.shop);
    const name = text(data.name);
    const count = readInt(data.count, 1, 1000);
    return shop && name && count !== null ? { shop, name, count } : null;
  },
  ({ shop, name, count }) => call(EVENTS.buy, [shop, name, count]),
);

page.on(
  NUI.craft,
  (data) => {
    if (!isRecord(data)) return null;
    const bench = text(data.bench);
    const index = readInt(data.index, 0, 100);
    return bench && index !== null ? { bench, index } : null;
  },
  ({ bench, index }) => call(EVENTS.craft, [bench, index]),
);

page.on(
  NUI.detach,
  (data) => {
    if (!isRecord(data)) return null;
    const slot = slotOf(data.slot);
    const hash = text(data.hash);
    return slot && hash ? { slot, hash } : null;
  },
  ({ slot, hash }) => call(EVENTS.detach, [slot, hash]),
);
