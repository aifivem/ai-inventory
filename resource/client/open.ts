import {
  cache,
  Keybind,
  nearestVehicle,
  onServerEvent,
} from "@aicore-fivem/lib/client";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/events";
import { hotbarSlot } from "common/grid";
import { toPanel, toShopView, type OpenTarget } from "common/nui";
import { drops } from "./drops";
import { hotbar, screen } from "./screen";
import { state, toView } from "./state";
import { useItem } from "./use";

/** How close to a vehicle's back the trunk opens. */
const TRUNK_REACH = 1.6;

/** Whether the player stands at the vehicle's back (its trunk). */
function atBack(vehicle: number): boolean {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
  const [min] = GetModelDimensions(GetEntityModel(vehicle));
  const [bx = 0, by = 0, bz = 0] = GetOffsetFromEntityInWorldCoords(
    vehicle,
    0,
    (min?.[1] ?? -2) - 0.4,
    0,
  );
  return Math.hypot(bx - x, by - y, bz - z) <= TRUNK_REACH;
}

/** The nearest networked vehicle (8 m) whose back the player stands at (nose to tail, the one behind wins), or null. */
function trunkInReach(): number | null {
  return nearestVehicle(8, { networked: true, filter: atBack }) || null;
}

/** What the inventory key opens next to the player's own: glovebox, a drop, a trunk, or nothing. */
function contextTarget(): OpenTarget {
  if (cache.vehicle !== false) return { kind: "glovebox" };
  const drop = drops.nearest(2);
  if (drop) return { kind: "drop", id: drop };
  const vehicle = trunkInReach();
  if (vehicle && GetVehicleDoorLockStatus(vehicle) < 2)
    return { kind: "trunk", netId: NetworkGetNetworkIdFromEntity(vehicle) };
  return { kind: "self" };
}

const openBind = new Keybind({
  name: "inventory_open",
  description: Locale("KEYBIND_OPEN"),
  defaultKey: "F2",
  hint: "always",
  icon: "box-open",
  hintLabel: Locale("HINT_INVENTORY"),
  onPressed: () => {
    if (screen.isOpen) return screen.close();
    void screen.open(contextTarget());
  },
});

screen.openKey = () => openBind.currentKey.toUpperCase();

new Keybind({
  name: "inventory_hotbar",
  description: Locale("KEYBIND_HOTBAR_BAR"),
  defaultKey: "TAB",
  hint: "always",
  icon: "table-cells",
  hintLabel: Locale("HINT_HOTBAR"),
  onPressed: () => hotbar.toggle(),
});

/** Keys 1-5 use the stacks in the quick slots (their own five slots, not grid cells). */
for (let i = 1; i <= 5; i++) {
  new Keybind({
    name: `inventory_hotbar_${i}`,
    description: Locale("KEYBIND_HOTBAR", i),
    defaultKey: String(i),
    onPressed: () => {
      if (screen.isOpen || IsPauseMenuActive()) return;
      const slot = hotbarSlot(i - 1);
      if (state.player?.stacks.some((s) => s.slot === slot)) void useItem(slot);
    },
  });
}

onServerEvent(
  EVENTS.forceOpen,
  {
    args: ([view, panel]) =>
      [
        view == null ? null : toView(view),
        panel == null ? null : toPanel(panel),
      ] as const,
  },
  (view, panel) => screen.show(view, panel),
);
onServerEvent(
  EVENTS.scriptShop,
  { args: ([shop]) => asArgs(toShopView(shop)) },
  (shop) => screen.show(null, null, shop),
);
onServerEvent(EVENTS.forceClose, () => screen.otherClosed());
onServerEvent(
  EVENTS.ground,
  {
    args: ([raw]) => {
      const view = toView(raw);
      return view ? [view] : null;
    },
  },
  (view) => screen.groundOpened(view),
);
