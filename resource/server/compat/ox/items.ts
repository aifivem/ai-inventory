import {
  addItem,
  canCarry,
  countItem,
  removeItem,
  setMaxWeight,
  setMetadata,
  stacksOf,
} from "../../api/items";
import { resolve } from "../../api/resolve";
import { definitionView, itemView } from "../../api/views";
import { content } from "../../content";

function inventoryView(inv: unknown) {
  const inventory = resolve(inv);
  if (!inventory) return null;
  const items: Record<number, ReturnType<typeof itemView>> = {};
  for (const stack of inventory.stacks.values())
    items[stack.slot] = itemView(stack);
  return {
    id: inventory.id,
    label: inventory.label,
    type: inventory.kind,
    slots: inventory.slots,
    weight: inventory.weight,
    maxWeight: inventory.maxWeight,
    items,
  };
}

/** ox exports on items, slots and weights. */
export const itemExports: Record<string, (...args: unknown[]) => unknown> = {
  AddItem: (inv, item, count, metadata, slot, cb) => {
    const ok = addItem(inv, item, count, metadata, slot);
    if (typeof cb === "function") cb(ok, ok ? null : "inventory_full");
    return ok ? [true, null] : [false, "inventory_full"];
  },
  RemoveItem: (inv, item, count, metadata, slot) =>
    removeItem(inv, item, count, metadata, slot),
  GetItem: (inv, item, metadata, returnsCount) => {
    const def = definitionView(String(item));
    if (!def) return null;
    const count = countItem(inv, item, metadata);
    return returnsCount ? count : { ...def, count };
  },
  GetItemCount: (inv, item, metadata) => countItem(inv, item, metadata),
  Search: (inv, search, items, metadata) => {
    const inventory = resolve(inv);
    if (!inventory) return false;
    const names = Array.isArray(items) ? items : [items];
    const one = (name: unknown) =>
      search === "count"
        ? countItem(inventory.id, name, metadata)
        : stacksOf(inventory, name, metadata).map(itemView);
    if (names.length === 1) return one(names[0]);
    return Object.fromEntries(names.map((name) => [String(name), one(name)]));
  },
  CanCarryItem: (inv, item, count, metadata) =>
    canCarry(inv, item, count, metadata),
  CanCarryWeight: (inv, weight) => {
    const inventory = resolve(inv);
    return Boolean(
      inventory &&
      typeof weight === "number" &&
      (inventory.maxWeight <= 0 ||
        inventory.weight + weight <= inventory.maxWeight),
    );
  },
  CanCarryAmount: (inv, item) => {
    const inventory = resolve(inv);
    const def = content.items.get(item);
    if (!inventory || !def || def.weight <= 0)
      return inventory && def ? def.stack : 0;
    return Math.max(
      0,
      Math.floor((inventory.maxWeight - inventory.weight) / def.weight),
    );
  },
  GetInventory: (inv) => inventoryView(inv),
  GetInventoryItems: (inv) => inventoryView(inv)?.items ?? null,
  GetSlot: (inv, slot) => {
    const stack =
      typeof slot === "number" ? resolve(inv)?.stacks.get(slot) : undefined;
    return stack ? itemView(stack) : null;
  },
  GetSlotWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    const stack = inventory
      ? stacksOf(inventory, item, metadata)[0]
      : undefined;
    return stack ? itemView(stack) : null;
  },
  GetSlotsWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return inventory ? stacksOf(inventory, item, metadata).map(itemView) : [];
  },
  GetSlotIdWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return (inventory && stacksOf(inventory, item, metadata)[0]?.slot) ?? null;
  },
  GetSlotIdsWithItem: (inv, item, metadata) => {
    const inventory = resolve(inv);
    return inventory
      ? stacksOf(inventory, item, metadata).map((s) => s.slot)
      : [];
  },
  GetEmptySlot: (inv) =>
    resolve(inv)?.grid.findPlace({ w: 1, h: 1 })?.slot ?? null,
  SetMetadata: (inv, slot, metadata) => setMetadata(inv, slot, metadata),
  SetDurability: (inv, slot, durability) => {
    const stack =
      typeof slot === "number" ? resolve(inv)?.stacks.get(slot) : undefined;
    return stack
      ? setMetadata(inv, slot, { ...stack.metadata, durability })
      : false;
  },
  SetMaxWeight: (inv, weight) => void setMaxWeight(inv, weight),
};
