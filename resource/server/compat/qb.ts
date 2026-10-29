import { isRecord } from "@aicore-fivem/lib/shared";
import { provideExport } from "@aicore-fivem/lib/server";
import { addItem, canCarry, countItem, forceOpen, itemView, registerStash, removeItem, resolve, setMetadata, stacksOf } from "../api";
import { content } from "../content";
import { drops } from "../drops";
import { inventories } from "../registry";

/**
 * qb-inventory's server exports (`provide 'qb-inventory'`), tested against qb-inventory 2.0. `info` is the
 * metadata. Not answered: hooks and listeners, shops created by scripts, functions that take a QB items table.
 */

const R = "qb-inventory";

function hasItem(source: unknown, items: unknown, amount: unknown): boolean {
  const need = typeof amount === "number" && amount > 0 ? amount : 1;
  if (typeof items === "string") return countItem(source, items) >= need;
  if (Array.isArray(items)) return items.every((name) => countItem(source, name) >= need);
  if (isRecord(items)) return Object.entries(items).every(([name, n]) => countItem(source, name) >= (typeof n === "number" ? n : 1));
  return false;
}

const exportsMap: Record<string, (...args: unknown[]) => unknown> = {
  AddItem: (identifier, item, amount, slot, info) => addItem(identifier, item, amount, info, slot),
  RemoveItem: (identifier, item, amount, slot) => removeItem(identifier, item, amount, undefined, slot),
  HasItem: (source, items, amount) => hasItem(source, items, amount),
  GetItemCount: (source, items) => (Array.isArray(items) ? items.reduce<number>((sum, name) => sum + countItem(source, name), 0) : countItem(source, items)),
  GetItemByName: (source, item) => {
    const inventory = resolve(source);
    const stack = inventory ? stacksOf(inventory, item)[0] : undefined;
    return stack ? itemView(stack) : null;
  },
  GetItemsByName: (source, item) => {
    const inventory = resolve(source);
    return inventory ? stacksOf(inventory, item).map(itemView) : [];
  },
  GetItemBySlot: (source, slot) => {
    const stack = typeof slot === "number" ? resolve(source)?.stacks.get(slot) : undefined;
    return stack ? itemView(stack) : null;
  },
  CanAddItem: (identifier, item, amount) => (canCarry(identifier, item, amount) ? [true, null] : [false, "weight"]),
  GetFreeWeight: (source) => {
    const inventory = resolve(source);
    return inventory ? Math.max(0, inventory.maxWeight - inventory.weight) : 0;
  },
  GetSlots: (identifier) => {
    const inventory = resolve(identifier);
    if (!inventory) return [0, 0];
    const used = inventory.grid.cells.reduce((n, cell) => n + (cell ? 1 : 0), 0);
    return [used, inventory.slots - used];
  },
  ClearInventory: (source, filter) => {
    const inventory = resolve(source);
    if (!inventory) return;
    const keep = (Array.isArray(filter) ? filter : filter ? [filter] : []).map((k) => content.items.get(k)?.name);
    for (const stack of inventory.stacks.values()) if (!keep.includes(stack.name)) inventory.take(stack.slot);
    drops.check(inventory);
  },
  SetItemData: (source, itemName, key, val, slot) => {
    const inventory = resolve(source);
    const stack = inventory ? (typeof slot === "number" ? inventory.stacks.get(slot) : stacksOf(inventory, itemName)[0]) : undefined;
    if (!stack || typeof key !== "string") return false;
    return setMetadata(source, stack.slot, { ...stack.metadata, [key]: val });
  },
  CreateInventory: (identifier, data) => {
    const d = isRecord(data) ? data : {};
    registerStash(String(identifier), String(d.label ?? identifier), Number(d.slots) || 50, Number(d.maxweight) || 100_000, [], false);
  },
  OpenInventory: (source, identifier, data) => {
    if (typeof source !== "number") return;
    if (identifier == null) return;
    const id = String(identifier);
    if (!resolve(id)) {
      const d = isRecord(data) ? data : {};
      registerStash(id, String(d.label ?? id), Number(d.slots) || 50, Number(d.maxweight) || 100_000, [], false);
      setTimeout(() => forceOpen(source, id), 250);
      return;
    }
    forceOpen(source, id);
  },
  OpenInventoryById: (source, targetId) => (typeof source === "number" && typeof targetId === "number" ? forceOpen(source, targetId) : false),
  RemoveInventory: (identifier) => {
    const inventory = resolve(identifier);
    if (inventory && inventory.kind !== "player") inventories.remove(inventory.id);
  },
  CloseInventory: (source) => {
    if (typeof source === "number") inventories.close(source);
  },
};

for (const [name, fn] of Object.entries(exportsMap)) provideExport(R, name, fn);
