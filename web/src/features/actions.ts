import { fetchNui } from "fivem-nui-react";
import { Occupancy } from "../../../resource/common/grid";
import { NUI } from "../../../resource/common/nui";
import { store } from "../store";
import { craftingSet } from "../store/inventory";

/** Every NUI call of the screen; components never call fetchNui themselves. Results come back as deltas. */

const OK = { mockData: { ok: true } };
const isOk = (v: unknown): boolean =>
  typeof v === "object" && v !== null && "ok" in v && v.ok === true;

export function closeScreen(): void {
  void fetchNui(NUI.close, undefined, OK);
}

export function itemUse(slot: number): void {
  void fetchNui(NUI.use, { slot }, OK);
}

export function giveItem(slot: number, count: number): void {
  void fetchNui(NUI.give, { slot, count }, OK);
}

export function dropItem(from: string, slot: number, count: number): void {
  void fetchNui(NUI.drop, { from, slot, count }, OK);
}

/** Splits `count` off a stack onto the first free cells of the same inventory. */
export function splitItem(inv: string, slot: number, count: number): void {
  const state = store.getState().inventory;
  const view =
    state.player?.id === inv
      ? state.player
      : state.other?.id === inv
        ? state.other
        : null;
  const stack = view?.stacks.find((s) => s.slot === slot);
  const def = stack ? state.items[stack.name] : undefined;
  if (!view || !stack || !def) return;
  const grid = Occupancy.of(
    view.columns,
    view.rows,
    view.stacks.map((s) => {
      const d = state.items[s.name];
      const w = d ? (s.rotated ? d.h : d.w) : 1;
      const h = d ? (s.rotated ? d.w : d.h) : 1;
      return { slot: s.slot, w, h };
    }),
  );
  const place = grid.findPlace({ w: def.w, h: def.h });
  if (!place) return;
  void fetchNui(
    NUI.move,
    {
      from: inv,
      fromSlot: slot,
      to: inv,
      toSlot: place.slot,
      count,
      rotated: place.rotated,
    },
    OK,
  );
}

export function buyItem(shop: string, name: string, count: number): void {
  void fetchNui(NUI.buy, { shop, name, count }, OK);
}

/** Starts a recipe; the countdown runs on the screen's clock once the server accepts. */
export async function craftRecipe(
  bench: string,
  index: number,
  seconds: number,
): Promise<void> {
  const result: unknown = await fetchNui(NUI.craft, { bench, index }, OK).catch(
    () => null,
  );
  if (!isOk(result)) return;
  store.dispatch(craftingSet({ index, endsAt: Date.now() + seconds * 1000 }));
  setTimeout(() => store.dispatch(craftingSet(null)), seconds * 1000);
}

export function detachComponent(slot: number, hash: string): void {
  void fetchNui(NUI.detach, { slot, hash }, OK);
}
