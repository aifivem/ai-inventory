import { callAction, nearestPlayer, notify } from "@aicore-fivem/lib/client";
import { fail, isRecord, readInt } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, type ActionResult } from "common/events";
import { NUI, toMoveInput, toPedArea } from "common/nui";
import { content } from "./content";
import { isClothesId } from "common/clothes";
import { wardrobe } from "./clothes";
import { screen, sendProfile } from "./screen";
import { state } from "./state";
import { useItem } from "./use";
import { worldPed } from "./worldPed";

type NuiReply = (result: ActionResult) => void;
const GONE = fail("INV_ERR_GONE");
const slotOf = (v: unknown): number | null => readInt(v, 1, 10_000);
const countOf = (v: unknown): number | null => readInt(v, 1, 1_000_000);

/** Sends one action to the server (a refusal shows its reason) and answers the NUI; the new state arrives as a delta. */
async function call(
  name: string,
  args: unknown[],
  cb: NuiReply,
): Promise<void> {
  const reply = await callAction(name, args, { fallback: "INV_ERR_GONE" });
  cb(reply ? { ok: true } : GONE);
}

// The clothes column: a click takes a piece off or puts it back on (the column greys out while it changes).
RegisterNuiCallback(NUI.clothes, (data: unknown, cb: NuiReply) => {
  const id = isRecord(data) ? data.id : null;
  if (!isClothesId(id)) return cb(GONE);
  cb({ ok: true });
  const done = wardrobe.toggle(id);
  sendProfile();
  // The piece changes after the animation: only then does the copy change.
  void done.then(() => {
    sendProfile();
    worldPed.refresh();
  });
});

// The equipment column's character: its area on screen, or hidden (the show / hide switch under it).
RegisterNuiCallback(NUI.worldPed, (data: unknown, cb: NuiReply) => {
  cb({ ok: true });
  if (!screen.isOpen) return;
  const area = toPedArea(data);
  if (area) worldPed.show(area);
  else worldPed.hide();
});

RegisterNuiCallback(NUI.move, (data: unknown, cb: NuiReply) => {
  const move = toMoveInput(data);
  if (!move) return cb(GONE);
  void call(EVENTS.move, [move], cb);
});

RegisterNuiCallback(NUI.use, (data: unknown, cb: NuiReply) => {
  const slot = isRecord(data) ? slotOf(data.slot) : null;
  const stack = slot
    ? state.player?.stacks.find((s) => s.slot === slot)
    : undefined;
  if (!slot || !stack) return cb(GONE);
  if (content.items.get(stack.name)?.close) screen.close();
  void useItem(slot);
  cb({ ok: true });
});

RegisterNuiCallback(NUI.give, (data: unknown, cb: NuiReply) => {
  const slot = isRecord(data) ? slotOf(data.slot) : null;
  const count = isRecord(data) ? countOf(data.count) : null;
  const target = nearestPlayer(3);
  if (!slot || !count) return cb(GONE);
  if (target === null) {
    notify(Locale("INV_ERR_NO_TARGET"), "error");
    return cb(fail("INV_ERR_NO_TARGET"));
  }
  void call(EVENTS.give, [slot, count, target], cb);
});

RegisterNuiCallback(NUI.drop, (data: unknown, cb: NuiReply) => {
  const from =
    isRecord(data) && typeof data.from === "string" ? data.from : null;
  const slot = isRecord(data) ? slotOf(data.slot) : null;
  const count = isRecord(data) ? countOf(data.count) : null;
  if (!from || !slot || !count) return cb(GONE);
  void call(EVENTS.drop, [from, slot, count], cb);
});

RegisterNuiCallback(NUI.buy, (data: unknown, cb: NuiReply) => {
  const count = isRecord(data) ? readInt(data.count, 1, 1000) : null;
  if (
    !isRecord(data) ||
    typeof data.shop !== "string" ||
    typeof data.name !== "string" ||
    count === null
  )
    return cb(GONE);
  void call(EVENTS.buy, [data.shop, data.name, count], cb);
});

RegisterNuiCallback(NUI.craft, (data: unknown, cb: NuiReply) => {
  const index = isRecord(data) ? readInt(data.index, 0, 100) : null;
  if (!isRecord(data) || typeof data.bench !== "string" || index === null)
    return cb(GONE);
  void call(EVENTS.craft, [data.bench, index], cb);
});

RegisterNuiCallback(NUI.detach, (data: unknown, cb: NuiReply) => {
  const slot = isRecord(data) ? slotOf(data.slot) : null;
  if (!slot || !isRecord(data) || typeof data.hash !== "string")
    return cb(GONE);
  void call(EVENTS.detach, [slot, data.hash], cb);
});
