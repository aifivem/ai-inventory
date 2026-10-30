import { cache, triggerServerCallback } from "@aicore-fivem/lib/client";
import { EVENTS, type ActionResult } from "common/events";
import { NUI, toMoveInput, toPedArea } from "common/nui";
import { content } from "./content";
import { isClothesId } from "common/clothes";
import { wardrobe } from "./clothes";
import { screen, sendProfile, toResult, toast } from "./screen";
import { state } from "./state";
import { useItem } from "./use";
import { worldPed } from "./worldPed";

type NuiReply = (result: ActionResult) => void;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;

/** Sends one action to the server and answers the NUI with the result; the new state arrives as a delta. */
async function call(
  name: string,
  args: unknown[],
  cb: NuiReply,
): Promise<void> {
  const result = toResult(
    await triggerServerCallback(name, args).catch(() => null),
  );
  if (!result.ok) toast(result.error);
  cb(result);
}

/** The closest other player within 3 m (server id), or null. */
function closestPlayer(): number | null {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  let best: number | null = null;
  let bestDistance = 3;
  for (const player of GetActivePlayers() as number[]) {
    if (player === cache.playerId) continue;
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(
      GetPlayerPed(player),
      false,
    );
    const distance = Math.hypot(px - x, py - y, pz - z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = GetPlayerServerId(player);
    }
  }
  return best;
}

RegisterNuiCallback(NUI.close, (_data: unknown, cb: (r: unknown) => void) => {
  screen.close();
  cb({ ok: true });
});

// The clothes column: a click takes a piece off or puts it back on (the column greys out while it changes).
RegisterNuiCallback(NUI.clothes, (data: unknown, cb: NuiReply) => {
  const id = isObj(data) ? data.id : null;
  if (!isClothesId(id)) return cb({ ok: false, error: "INV_ERR_GONE" });
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
  if (!move) return cb({ ok: false, error: "INV_ERR_GONE" });
  void call(EVENTS.move, [move], cb);
});

RegisterNuiCallback(NUI.use, (data: unknown, cb: NuiReply) => {
  const slot = isObj(data) ? int(data.slot) : null;
  const stack = slot
    ? state.player?.stacks.find((s) => s.slot === slot)
    : undefined;
  if (!slot || !stack) return cb({ ok: false, error: "INV_ERR_GONE" });
  if (content.items.get(stack.name)?.close) screen.close();
  void useItem(slot);
  cb({ ok: true });
});

RegisterNuiCallback(NUI.give, (data: unknown, cb: NuiReply) => {
  const slot = isObj(data) ? int(data.slot) : null;
  const count = isObj(data) ? int(data.count) : null;
  const target = closestPlayer();
  if (!slot || !count) return cb({ ok: false, error: "INV_ERR_GONE" });
  if (target === null) {
    toast("INV_ERR_NO_TARGET");
    return cb({ ok: false, error: "INV_ERR_NO_TARGET" });
  }
  void call(EVENTS.give, [slot, count, target], cb);
});

RegisterNuiCallback(NUI.drop, (data: unknown, cb: NuiReply) => {
  const from = isObj(data) && typeof data.from === "string" ? data.from : null;
  const slot = isObj(data) ? int(data.slot) : null;
  const count = isObj(data) ? int(data.count) : null;
  if (!from || !slot || !count) return cb({ ok: false, error: "INV_ERR_GONE" });
  void call(EVENTS.drop, [from, slot, count], cb);
});

RegisterNuiCallback(NUI.buy, (data: unknown, cb: NuiReply) => {
  if (
    !isObj(data) ||
    typeof data.shop !== "string" ||
    typeof data.name !== "string" ||
    !int(data.count)
  )
    return cb({ ok: false, error: "INV_ERR_GONE" });
  void call(EVENTS.buy, [data.shop, data.name, data.count], cb);
});

RegisterNuiCallback(NUI.craft, (data: unknown, cb: NuiReply) => {
  if (
    !isObj(data) ||
    typeof data.bench !== "string" ||
    typeof data.index !== "number"
  )
    return cb({ ok: false, error: "INV_ERR_GONE" });
  void call(EVENTS.craft, [data.bench, data.index], cb);
});

RegisterNuiCallback(NUI.detach, (data: unknown, cb: NuiReply) => {
  const slot = isObj(data) ? int(data.slot) : null;
  if (!slot || !isObj(data) || typeof data.hash !== "string")
    return cb({ ok: false, error: "INV_ERR_GONE" });
  void call(EVENTS.detach, [slot, data.hash], cb);
});
