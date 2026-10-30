import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  BenchView,
  InventoryView,
  ItemView,
  ShopView,
  Stack,
} from "../../../resource/common/nui";
import type { ClothesState } from "../../../resource/common/clothes";

interface InventoryState {
  open: boolean;
  items: Record<string, ItemView>;
  player: InventoryView | null;
  other: InventoryView | null;
  shop: ShopView | null;
  bench: BenchView | null;
  /** Recipe being crafted: index and when it ends (screen clock). */
  crafting: { index: number; endsAt: number } | null;
  /** The quick slots bar shows (Tab) while the screen is closed. */
  hotbar: boolean;
  /** The open key as bound now (the screen closes on it). */
  openKey: string;
  /** The character's name and the clothes column. */
  profile: { name: string; clothes: ClothesState } | null;
}

const initialState: InventoryState = {
  open: false,
  items: {},
  player: null,
  other: null,
  shop: null,
  bench: null,
  crafting: null,
  profile: null,
  hotbar: false,
  openKey: "",
};

function applyDelta(
  view: InventoryView | null,
  put: Stack[],
  remove: number[],
  maxWeight: number,
): void {
  if (!view) return;
  const bySlot = new Map(view.stacks.map((s) => [s.slot, s]));
  for (const slot of remove) bySlot.delete(slot);
  for (const stack of put) bySlot.set(stack.slot, stack);
  view.stacks = [...bySlot.values()];
  view.maxWeight = maxWeight;
}

/** The screen's data: the snapshot from the client, then deltas of the player and the second inventory. */
const inventory = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    itemsSet(state, action: PayloadAction<ItemView[]>) {
      state.items = Object.fromEntries(
        action.payload.map((item) => [item.name, item]),
      );
    },
    hotbarSet(state, action: PayloadAction<boolean>) {
      state.hotbar = action.payload;
    },
    profileSet(
      state,
      action: PayloadAction<{ name: string; clothes: ClothesState }>,
    ) {
      state.profile = action.payload;
    },
    playerSet(state, action: PayloadAction<InventoryView>) {
      state.player = action.payload;
    },
    opened(
      state,
      action: PayloadAction<{
        other: InventoryView | null;
        shop: ShopView | null;
        bench: BenchView | null;
        key: string;
      }>,
    ) {
      state.open = true;
      state.openKey = action.payload.key;
      state.other = action.payload.other;
      state.shop = action.payload.shop;
      state.bench = action.payload.bench;
    },
    closed(state) {
      state.open = false;
      state.other = null;
      state.shop = null;
      state.bench = null;
    },
    otherClosed(state) {
      state.other = null;
    },
    groundOpened(state, action: PayloadAction<InventoryView>) {
      if (state.open && !state.shop && !state.bench)
        state.other = action.payload;
    },
    layoutSet(
      state,
      action: PayloadAction<{
        id: string;
        columns: number;
        rows: number;
        maxWeight: number;
      }>,
    ) {
      const { id, ...layout } = action.payload;
      if (state.player?.id === id) Object.assign(state.player, layout);
      if (state.other?.id === id) Object.assign(state.other, layout);
    },
    deltaApplied(
      state,
      action: PayloadAction<{
        id: string;
        put: Stack[];
        remove: number[];
        maxWeight: number;
      }>,
    ) {
      const { id, put, remove, maxWeight } = action.payload;
      if (state.player?.id === id)
        applyDelta(state.player, put, remove, maxWeight);
      if (state.other?.id === id)
        applyDelta(state.other, put, remove, maxWeight);
    },
    craftingSet(
      state,
      action: PayloadAction<{ index: number; endsAt: number } | null>,
    ) {
      state.crafting = action.payload;
    },
  },
});

export const {
  itemsSet,
  playerSet,
  opened,
  closed,
  otherClosed,
  groundOpened,
  deltaApplied,
  layoutSet,
  craftingSet,
  profileSet,
  hotbarSet,
} = inventory.actions;
export default inventory.reducer;
